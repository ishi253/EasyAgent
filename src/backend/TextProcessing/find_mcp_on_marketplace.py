#!/usr/bin/env python3
"""Find reusable MCPs from the Dedalus marketplace for existing prompts.

The script walks MCP blueprint files, summarises their requirements, and
looks for already-built MCPs on the Dedalus Labs marketplace. Matching
results are cached in a local SQLite database so repeated runs will only
hit the network when the blueprint changes. When a compatible MCP is
identified, the script can optionally invoke it through a configurable
execution endpoint.
"""

from __future__ import annotations

import argparse
import dataclasses
import datetime as dt
import hashlib
import json
import logging
import os
import pathlib
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import List, Optional, Sequence


###############################################################################
# Blueprint parsing
###############################################################################


@dataclasses.dataclass
class BlueprintFunctionality:
    responsibility: str
    inputs: str = ""
    operations: str = ""
    outputs: str = ""

    def as_text(self) -> str:
        parts = [
            self.responsibility.strip(),
            f"Inputs: {self.inputs.strip()}" if self.inputs else "",
            f"Operations: {self.operations.strip()}" if self.operations else "",
            f"Outputs: {self.outputs.strip()}" if self.outputs else "",
        ]
        return " | ".join([p for p in parts if p])


@dataclasses.dataclass
class MCPBlueprint:
    name: str
    business_goal: str
    authority: str
    non_goals: str
    functionalities: List[BlueprintFunctionality]
    source_path: pathlib.Path

    def summary(self) -> str:
        pieces = [
            self.name,
            self.business_goal,
            self.authority,
            self.non_goals,
            *[fn.as_text() for fn in self.functionalities],
        ]
        return "\n".join([p.strip() for p in pieces if p]).strip()

    def query_text(self) -> str:
        functional_bits = " ".join(fn.as_text() for fn in self.functionalities)
        return f"{self.business_goal}. {functional_bits}".strip()


class BlueprintParser:
    """Parse Claude generated blueprint markdown files."""

    META_PATTERN = re.compile(r"\*\*(?P<label>[^*]+)\*\*:\s*(?P<value>.+)")
    FUNC_PATTERN = re.compile(
        r"(?P<idx>\d+)\.\s+\*\*Core Responsibility:\*\*\s*(?P<body>.+?)"
        r"(?=(?:\n\d+\.\s+\*\*Core Responsibility)|\Z)",
        re.DOTALL,
    )

    @staticmethod
    def _clean(value: Optional[str]) -> str:
        return value.strip().strip("`") if value else ""

    def parse(self, path: pathlib.Path) -> MCPBlueprint:
        text = path.read_text(encoding="utf-8")
        metadata = {}
        for match in self.META_PATTERN.finditer(text):
            metadata[match.group("label").strip()] = match.group("value").strip()

        functionalities: List[BlueprintFunctionality] = []
        for match in self.FUNC_PATTERN.finditer(text):
            block = match.group("body").strip()
            lines = [line.rstrip() for line in block.splitlines() if line.strip()]
            responsibility = lines[0]
            bullets = {"Inputs": "", "Operations": "", "Outputs": ""}
            bullet_pattern = re.compile(r"-\s*(Inputs|Operations|Outputs):\s*(.+)")
            last_label = None
            for line in lines[1:]:
                sub = bullet_pattern.match(line)
                if sub:
                    label = sub.group(1)
                    bullets[label] = sub.group(2).strip()
                    last_label = label
                elif last_label:
                    bullets[last_label] += f" {line.strip()}"
            functionalities.append(
                BlueprintFunctionality(
                    responsibility=self._clean(responsibility.replace("**Core Responsibility:**", "")),
                    inputs=self._clean(bullets["Inputs"]),
                    operations=self._clean(bullets["Operations"]),
                    outputs=self._clean(bullets["Outputs"]),
                )
            )

        return MCPBlueprint(
            name=self._clean(metadata.get("MCP Name")),
            business_goal=self._clean(metadata.get("Business Goal")),
            authority=self._clean(metadata.get("Authority / Access Level")),
            non_goals=self._clean(metadata.get("Non-Goals", metadata.get("Non Goals"))),
            functionalities=functionalities,
            source_path=path,
        )


###############################################################################
# Marketplace access + caching
###############################################################################


@dataclasses.dataclass
class MarketplaceMCP:
    mcp_id: str
    name: str
    description: str
    functionality: str
    raw: dict

    def searchable_text(self) -> str:
        return " ".join(
            [
                self.name or "",
                self.description or "",
                self.functionality or "",
                json.dumps(self.raw, ensure_ascii=False),
            ]
        )


class DedalusMarketplaceClient:
    """Lightweight HTTP client for the Dedalus marketplace."""

    def __init__(
        self,
        search_url: str,
        *,
        method: str = "GET",
        api_key: Optional[str] = None,
        timeout: int = 20,
        execute_url_template: Optional[str] = None,
    ) -> None:
        self.search_url = search_url
        self.method = method.upper()
        self.api_key = api_key
        self.timeout = timeout
        self.execute_url_template = execute_url_template

    def search_mcps(self, query: str, *, limit: int = 10) -> List[MarketplaceMCP]:
        if not query:
            return []

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        request_url = self.search_url
        data: Optional[bytes] = None
        if self.method == "GET":
            parsed = urllib.parse.urlparse(self.search_url)
            params = {"q": query, "limit": str(limit)}
            existing = dict(urllib.parse.parse_qsl(parsed.query))
            existing.update(params)
            new_query = urllib.parse.urlencode(existing)
            parsed = parsed._replace(query=new_query)
            request_url = urllib.parse.urlunparse(parsed)
        else:
            payload = json.dumps({"query": query, "limit": limit})
            data = payload.encode("utf-8")
            headers["content-type"] = "application/json"

        req = urllib.request.Request(
            request_url,
            data=data,
            headers=headers,
            method="POST" if self.method != "GET" else "GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = resp.read().decode("utf-8")
        except urllib.error.URLError as exc:
            logging.error("Marketplace request failed: %s", exc)
            return []

        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            logging.error("Marketplace response was not JSON: %s", body[:200])
            return []

        return self._convert_results(parsed)

    def _convert_results(self, payload: object) -> List[MarketplaceMCP]:
        rows: Sequence[dict]
        if isinstance(payload, dict):
            if "results" in payload and isinstance(payload["results"], list):
                rows = payload["results"]
            elif "items" in payload and isinstance(payload["items"], list):
                rows = payload["items"]
            else:
                rows = [payload]
        elif isinstance(payload, list):
            rows = payload
        else:
            return []

        normalized: List[MarketplaceMCP] = []
        for item in rows:
            if not isinstance(item, dict):
                continue
            normalized.append(self._to_marketplace_mcp(item))
        return normalized

    @staticmethod
    def _to_marketplace_mcp(item: dict) -> MarketplaceMCP:
        mcp_id = str(
            item.get("id")
            or item.get("uuid")
            or item.get("slug")
            or item.get("name")
            or item.get("title")
            or hashlib.sha1(json.dumps(item, sort_keys=True).encode("utf-8")).hexdigest()
        )
        name = str(item.get("name") or item.get("title") or mcp_id)
        description = str(item.get("description") or item.get("summary") or "")
        functionality_field = (
            item.get("functionality")
            or item.get("functionalities")
            or item.get("capabilities")
            or item.get("operations")
            or ""
        )
        if isinstance(functionality_field, (list, tuple)):
            functionality = "; ".join(str(part) for part in functionality_field)
        elif isinstance(functionality_field, dict):
            functionality = "; ".join(
                f"{key}: {value}" for key, value in functionality_field.items()
            )
        else:
            functionality = str(functionality_field)

        return MarketplaceMCP(
            mcp_id=mcp_id,
            name=name,
            description=description,
            functionality=functionality,
            raw=item,
        )

    def invoke_mcp(self, mcp: MarketplaceMCP, payload: Optional[dict] = None) -> Optional[dict]:
        if not self.execute_url_template:
            logging.info("No execute_url_template provided; skipping invocation.")
            return None

        url = self.execute_url_template.format(mcp_id=mcp.mcp_id)
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        data = json.dumps(payload or {}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            body = resp.read().decode("utf-8")
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            logging.warning("Invocation response was not JSON: %s", body[:200])
            return {"raw": body}


class MCPDatabase:
    """SQLite-backed cache of marketplace searches."""

    def __init__(self, path: pathlib.Path) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS search_cache (
                requirement_hash TEXT PRIMARY KEY,
                prompt_path TEXT NOT NULL,
                query TEXT NOT NULL,
                mcp_ids TEXT NOT NULL,
                cached_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS mcps (
                mcp_id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                functionality TEXT,
                raw_json TEXT
            )
            """
        )
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    def lookup_by_requirement(self, requirement_hash: str) -> List[MarketplaceMCP]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT mcp_ids FROM search_cache WHERE requirement_hash = ?",
            (requirement_hash,),
        )
        row = cur.fetchone()
        if not row:
            return []
        mcp_ids = row["mcp_ids"].split(",")
        return self.lookup_mcps(mcp_ids)

    def lookup_mcps(self, mcp_ids: Sequence[str]) -> List[MarketplaceMCP]:
        if not mcp_ids:
            return []
        placeholders = ",".join("?" for _ in mcp_ids)
        cur = self.conn.cursor()
        cur.execute(
            f"SELECT * FROM mcps WHERE mcp_id IN ({placeholders})",
            tuple(mcp_ids),
        )
        rows = cur.fetchall()
        results = []
        for row in rows:
            raw = json.loads(row["raw_json"]) if row["raw_json"] else {}
            results.append(
                MarketplaceMCP(
                    mcp_id=row["mcp_id"],
                    name=row["name"],
                    description=row["description"],
                    functionality=row["functionality"],
                    raw=raw,
                )
            )
        return results

    def store_results(
        self,
        requirement_hash: str,
        prompt_path: pathlib.Path,
        query: str,
        mcps: Sequence[MarketplaceMCP],
    ) -> None:
        mcp_ids = ",".join(m.mcp_id for m in mcps)
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO search_cache
            (requirement_hash, prompt_path, query, mcp_ids, cached_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                requirement_hash,
                str(prompt_path),
                query,
                mcp_ids,
                dt.datetime.utcnow().isoformat(),
            ),
        )
        self.conn.commit()
        self.upsert_mcps(mcps)

    def upsert_mcps(self, mcps: Sequence[MarketplaceMCP]) -> None:
        if not mcps:
            return
        cur = self.conn.cursor()
        cur.executemany(
            """
            INSERT INTO mcps (mcp_id, name, description, functionality, raw_json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(mcp_id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                functionality = excluded.functionality,
                raw_json = excluded.raw_json
            """,
            [
                (
                    m.mcp_id,
                    m.name,
                    m.description,
                    m.functionality,
                    json.dumps(m.raw, ensure_ascii=False),
                )
                for m in mcps
            ],
        )
        self.conn.commit()


###############################################################################
# Matching logic
###############################################################################


def requirement_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def discover_blueprints(root: pathlib.Path) -> List[pathlib.Path]:
    patterns = ("*.md", "*.txt")
    files: List[pathlib.Path] = []
    for pattern in patterns:
        files.extend(root.rglob(pattern))
    return sorted(files)


def score_match(blueprint: MCPBlueprint, candidate: MarketplaceMCP) -> float:
    bp_text = blueprint.summary().lower()
    candidate_text = candidate.searchable_text().lower()
    if not bp_text or not candidate_text:
        return 0.0

    tokens = [tok for tok in bp_text.split() if len(tok) > 3]
    if not tokens:
        return 0.0
    hits = sum(1 for token in tokens if token in candidate_text)
    return hits / max(len(bp_text.split()), 1)


def select_best_match(
    blueprint: MCPBlueprint,
    mcps: Sequence[MarketplaceMCP],
    *,
    threshold: float = 0.08,
) -> Optional[MarketplaceMCP]:
    best_score = 0.0
    best_match: Optional[MarketplaceMCP] = None
    for candidate in mcps:
        score = score_match(blueprint, candidate)
        if score > best_score:
            best_score = score
            best_match = candidate
    if best_score >= threshold:
        return best_match
    return None


###############################################################################
# CLI
###############################################################################


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reuse Dedalus marketplace MCPs for generated blueprints.",
    )
    parser.add_argument(
        "prompts_dir",
        type=pathlib.Path,
        help="Directory that contains generated MCP blueprint markdown files.",
    )
    parser.add_argument(
        "--search-url",
        default="https://www.dedaluslabs.ai/marketplace",
        help="Marketplace search endpoint.",
    )
    parser.add_argument(
        "--http-method",
        choices=("GET", "POST"),
        default="GET",
        help="HTTP method for the search endpoint (default: GET).",
    )
    parser.add_argument(
        "--db-path",
        type=pathlib.Path,
        default=pathlib.Path(".cache/mcp_marketplace.sqlite"),
        help="Path to the SQLite cache (default: .cache/mcp_marketplace.sqlite).",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=5,
        help="Maximum number of marketplace results to keep per query.",
    )
    parser.add_argument(
        "--execute-url-template",
        help="Optional template for invoking a marketplace MCP (use {mcp_id}).",
    )
    parser.add_argument(
        "--invoke",
        action="store_true",
        help="Call the execute endpoint when a compatible MCP is found.",
    )
    parser.add_argument(
        "--invoke-payload",
        help="JSON object to send when invoking the MCP (default: empty {}).",
    )
    parser.add_argument(
        "--dedalus-api-key",
        default=None,
        help="API key for marketplace requests (falls back to DEDALUS_API_KEY env).",
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Ignore cached results and always hit the marketplace.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        help="Logging level (default: INFO).",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(levelname)s %(message)s",
    )

    api_key = args.dedalus_api_key or os.environ.get("DEDALUS_API_KEY")

    parser = BlueprintParser()
    client = DedalusMarketplaceClient(
        args.search_url,
        method=args.http_method,
        api_key=api_key,
        execute_url_template=args.execute_url_template,
    )
    database = MCPDatabase(args.db_path)

    try:
        blueprint_paths = discover_blueprints(args.prompts_dir)
        if not blueprint_paths:
            logging.warning("No blueprint files found in %s", args.prompts_dir)
            return 1

        payload = {}
        if args.invoke_payload:
            try:
                payload = json.loads(args.invoke_payload)
            except json.JSONDecodeError as exc:
                logging.error("Invalid JSON for --invoke-payload: %s", exc)
                return 1

        for blueprint_path in blueprint_paths:
            blueprint = parser.parse(blueprint_path)
            summary = blueprint.summary()
            if not summary:
                logging.info("Skipping empty blueprint: %s", blueprint_path)
                continue

            req_hash = requirement_hash(summary)
            results: List[MarketplaceMCP]

            if not args.force_refresh:
                results = database.lookup_by_requirement(req_hash)
            else:
                results = []

            if not results:
                query = blueprint.query_text()
                results = client.search_mcps(query, limit=args.max_results)
                if not results:
                    logging.info("No marketplace MCPs matched %s", blueprint_path)
                    continue
                database.store_results(req_hash, blueprint_path, query, results)

            match = select_best_match(blueprint, results)
            if not match:
                logging.info("No high confidence match for %s", blueprint.name or blueprint_path)
                continue

            logging.info(
                "Matched blueprint '%s' to marketplace MCP '%s' (%s)",
                blueprint.name or blueprint_path.name,
                match.name,
                match.mcp_id,
            )
            logging.info("Functionalities: %s", match.functionality or "n/a")

            if args.invoke:
                try:
                    invoke_result = client.invoke_mcp(match, payload)
                    logging.info("Invocation result: %s", invoke_result)
                except Exception as exc:
                    logging.error("Failed to invoke MCP %s: %s", match.mcp_id, exc)
                    continue
    finally:
        database.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
