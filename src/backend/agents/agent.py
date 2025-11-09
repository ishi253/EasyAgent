from __future__ import annotations

import asyncio
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, List, TypeVar

from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

from backend.mcpgen.codegen import generate
from backend.mcpgen.planner import plan as _plan

T = TypeVar("T")

DEFAULT_BUILD_ROOT = Path(__file__).resolve().parent.parent / "build"

# expose planner for monkeypatching in tests
plan_async = _plan


async def run_agent(agent: Agent):
    load_dotenv()

    client = AsyncDedalus()
    runner = DedalusRunner(client)

    result = await runner.run(  # type: ignore[arg-type]
        input=agent.prompt,
        model=["claude-sonnet-4"],
        mcp_servers=agent.tools,
        stream=False,
    )

    return result.final_output


def _run_coroutine_sync(factory: Callable[[], Awaitable[T]]) -> T:
    """Run an async factory whether or not an event loop is already running."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(factory())

    result_holder: dict[str, T] = {}
    error_holder: list[BaseException] = []

    def _runner() -> None:
        try:
            result_holder["value"] = asyncio.run(factory())
        except BaseException as exc:  # pragma: no cover - diagnostic path
            error_holder.append(exc)

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()
    thread.join()

    if error_holder:
        raise error_holder[0]
    return result_holder["value"]


def createMCP(spec: str, *, output_root: Path | str | None = None) -> str:
    """Generate an MCP server from a natural-language spec and return server.py path."""
    spec_clean = spec.strip()
    if not spec_clean:
        raise ValueError("MCP spec must be non-empty.")

    ir = _run_coroutine_sync(lambda: plan_async(spec_clean))

    build_root = Path(output_root) if output_root else DEFAULT_BUILD_ROOT
    build_root.mkdir(parents=True, exist_ok=True)
    server_dir = build_root / f"{ir.server_name}-{uuid.uuid4().hex[:6]}"
    generate(ir, server_dir)
    return str(server_dir / "server.py")


def createAgent(prompt: str, tools: List[str], name: str, needMCP: bool, tool_req: List[str]):
    tool_list = list(tools)
    if needMCP:
        for req in tool_req:
            spec = req.strip()
            if not spec:
                continue
            tool_list.append(createMCP(spec))

    agent_id = uuid.uuid4().hex[:6]
    return Agent(prompt, tool_list, name, agent_id)


@dataclass
class Agent:
    prompt: str
    tools: List[str]
    name: str
    id: str
