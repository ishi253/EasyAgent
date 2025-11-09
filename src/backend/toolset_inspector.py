#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import importlib.util
import inspect
import json
from pathlib import Path
from typing import Any, Callable


def _load_module(server_path: Path):
    spec = importlib.util.spec_from_file_location("generated_server", server_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {server_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


async def _invoke(tool: Callable[..., Any], args: dict[str, Any]):
    if inspect.iscoroutinefunction(tool):
        return await tool(**args)
    result = tool(**args)
    if inspect.isawaitable(result):
        return await result
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect and optionally invoke tools emitted by mcpgen."
    )
    parser.add_argument(
        "--server",
        type=Path,
        default=Path("build/server.py"),
        help="Path to generated server.py file",
    )
    parser.add_argument(
        "--tool",
        help="Name of the tool method to invoke (defaults to listing tools only)",
    )
    parser.add_argument(
        "--args",
        default="{}",
        help="JSON dict of arguments for the selected tool",
    )

    args = parser.parse_args()
    module = _load_module(args.server)

    toolset_cls = getattr(module, "GeneratedToolset", None)
    if toolset_cls is None:
        raise SystemExit("Generated server does not expose GeneratedToolset")

    toolset = toolset_cls()
    print("Discovered tools:")
    for tool in toolset:
        doc = inspect.getdoc(tool) or ""
        print(f" - {tool.__name__}: {doc.splitlines()[0] if doc else 'No docstring'}")

    if not args.tool:
        return

    payload = json.loads(args.args)
    if not isinstance(payload, dict):
        raise SystemExit("--args must decode to a JSON object")

    tool = getattr(toolset, args.tool, None)
    if tool is None:
        raise SystemExit(f"Tool '{args.tool}' not found on GeneratedToolset")

    result = asyncio.run(_invoke(tool, payload))
    print(f"\nResult from {args.tool}: {result!r}")


if __name__ == "__main__":
    main()
