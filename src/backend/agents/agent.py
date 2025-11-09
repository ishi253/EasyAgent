from __future__ import annotations

import asyncio
import hashlib
import shutil
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, List, TypeVar

from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

from src.backend.FAST.db import get_agent as get_agent_record, save_agent as save_agent_record
from src.backend.mcpgen.codegen import generate
from src.backend.mcpgen.planner import plan as _plan

T = TypeVar("T")

DEFAULT_BUILD_ROOT = Path(__file__).resolve().parent.parent / "build"

# expose planner for monkeypatching in tests
plan_async = _plan


async def run_agent(agentId: str, input: str):
    load_dotenv()

    client = AsyncDedalus()
    runner = DedalusRunner(client)

    agent = loadAgent(agentId)
    if input:
        agent.prompt += f"add this additional context to your execution: {input}"

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


def createMCP(
    spec: str,
    *,
    output_root: Path | str | None = None,
    target_dir: Path | str | None = None,
) -> str:
    """Generate an MCP server from a natural-language spec and return server.py path."""
    spec_clean = spec.strip()
    if not spec_clean:
        raise ValueError("MCP spec must be non-empty.")

    ir = _run_coroutine_sync(lambda: plan_async(spec_clean))

    if target_dir:
        server_dir = Path(target_dir)
        if server_dir.exists():
            shutil.rmtree(server_dir)
        server_dir.mkdir(parents=True, exist_ok=True)
    else:
        build_root = Path(output_root) if output_root else DEFAULT_BUILD_ROOT
        build_root.mkdir(parents=True, exist_ok=True)
        server_dir = build_root / f"{ir.server_name}-{uuid.uuid4().hex[:6]}"
    generate(ir, server_dir)
    return str(server_dir / "server.py")


def _stable_tool_dir(agent_root: Path, spec: str, index: int) -> Path:
    digest = hashlib.sha256(spec.encode("utf-8")).hexdigest()[:8]
    return agent_root / f"tool_{index + 1}_{digest}"


def createAgent(prompt: str, tools: List[str], name: str, needMCP: bool, tool_req: List[str]):
    agent_id = uuid.uuid4().hex[:6]
    agent_root = DEFAULT_BUILD_ROOT / agent_id
    agent_root.mkdir(parents=True, exist_ok=True)

    tool_list = list(tools)
    generated_paths: List[str] = []

    if needMCP:
        gen_index = 0
        for req in tool_req:
            spec = req.strip()
            if not spec:
                continue
            target_dir = _stable_tool_dir(agent_root, spec, gen_index)
            generated_path = createMCP(spec, target_dir=target_dir)
            tool_list.append(generated_path)
            generated_paths.append(generated_path)
            gen_index += 1

    primary_file_path = generated_paths[-1] if generated_paths else ""

    save_agent_record(
        agent_id,
        name=name,
        prompt=prompt,
        tools=tool_list,
        need_mcp=bool(generated_paths or needMCP),
        file_path=primary_file_path,
    )

    return Agent(prompt, tool_list, name, agent_id, file_path=primary_file_path)


def loadAgent(agent_id: str, *, regenerate_missing_tools: bool = True) -> Agent:
    """
    Load an agent configuration from the SQLite store.

    If the stored record flagged `need_mcp` but the generated server path is missing,
    optionally regenerate it by calling createMCP with the stored prompt.
    """
    record = get_agent_record(agent_id)
    if not record:
        raise ValueError(f"Agent '{agent_id}' not found.")

    tools = list(record.get("tools", []))
    file_path = record.get("file_path") or ""

    if regenerate_missing_tools and record.get("need_mcp"):
        path_obj = Path(file_path) if file_path else None
        if path_obj and path_obj.exists():
            if file_path not in tools:
                tools.append(file_path)
        else:
            regenerated_path = createMCP(record["prompt"])
            tools.append(regenerated_path)
            save_agent_record(
                agent_id,
                name=record["name"],
                prompt=record["prompt"],
                tools=tools,
                need_mcp=True,
                file_path=regenerated_path,
            )
            file_path = regenerated_path

    return Agent(
        prompt=record["prompt"],
        tools=tools,
        name=record["name"],
        id=record["agent_id"],
        file_path=file_path,
    )


@dataclass
class Agent:
    prompt: str
    tools: List[str]
    name: str
    id: str
    file_path: str = ""
