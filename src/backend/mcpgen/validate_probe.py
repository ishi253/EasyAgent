from __future__ import annotations
import json
import os
import sys
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

import anyio
from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.types import CallToolResult

from .ir import IR, Test


@dataclass
class ValidationResult:
    success: bool
    tests_passed: int
    tests_failed: int
    errors: list[str]

    def __str__(self) -> str:
        total = self.tests_passed + self.tests_failed
        return ("✓ All tests passed" if self.success else f"✗ {self.tests_failed} failed") + f" ({self.tests_passed}/{total})"


def _assert_result(payload: Any, test: Test) -> bool:
    if test.assertion == "equals":
        return payload == test.expected_result
    if test.assertion == "contains":
        if isinstance(payload, dict) and isinstance(test.expected_result, dict):
            return all(payload.get(k) == v for k, v in test.expected_result.items())
        payload_str = json.dumps(payload, default=str)
        needle = json.dumps(test.expected_result, separators=(",", ":"), default=str)[1:-1]
        return needle in payload_str
    if test.assertion == "type_check":
        type_map = {"int": int, "float": float, "str": str, "bool": bool, "dict": dict, "list": list}
        tname = str(test.expected_result)
        py_t = type_map.get(tname, object)
        return isinstance(payload, py_t)
    return False


def _extract_payload(result: CallToolResult) -> Any:
    if result.structuredContent is not None:
        if isinstance(result.structuredContent, dict) and "result" in result.structuredContent and len(result.structuredContent) == 1:
            return result.structuredContent["result"]
        return result.structuredContent
    for block in result.content:
        data = block.model_dump()
        if data.get("type") == "json" and "data" in data:
            return data["data"]
        if data.get("type") == "text":
            text = data.get("text")
            if isinstance(text, str):
                text = text.strip()
                try:
                    return json.loads(text)
                except Exception:
                    return text
            return text
    return None


async def _with_session(
    server_py: Path,
    workdir: Optional[Path],
    fn: Callable[[ClientSession], Awaitable[Any]],
) -> Any:
    env = os.environ.copy()
    if workdir:
        env["WORKDIR"] = str(workdir.resolve())
    params = StdioServerParameters(command=sys.executable, args=[str(server_py)], env=env)
    async with stdio_client(params) as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()
            return await fn(session)


def validate(server_py: Path, ir: IR, workdir: Optional[Path] = None, timeout: float = 10.0) -> ValidationResult:
    async def _run() -> ValidationResult:
        async def _execute(session: ClientSession) -> ValidationResult:
            failures = 0
            errors: list[str] = []
            for test in ir.tests:
                try:
                    result = await session.call_tool(test.tool, test.args, read_timeout_seconds=timedelta(seconds=timeout))
                    payload = _extract_payload(result)
                    if not _assert_result(payload, test):
                        failures += 1
                        errors.append(f"{test.tool}: expected {test.expected_result!r}, got {payload!r}")
                except Exception as exc:  # pragma: no cover - diagnostic path
                    failures += 1
                    errors.append(f"{test.tool}: error {exc}")
            return ValidationResult(failures == 0, len(ir.tests) - failures, failures, errors)

        return await _with_session(server_py, workdir, _execute)

    return anyio.run(_run, backend="asyncio")


def probe(server_py: Path, tool: str, args: dict, workdir: Optional[Path] = None, timeout: float = 10.0) -> dict:
    async def _run() -> dict:
        async def _execute(session: ClientSession) -> dict:
            result = await session.call_tool(tool, args, read_timeout_seconds=timedelta(seconds=timeout))
            return result.model_dump()

        return await _with_session(server_py, workdir, _execute)

    return anyio.run(_run, backend="asyncio")
