from __future__ import annotations

# import asyncio
import asyncio
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, List, TypeVar
import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

from src.backend.mcpgen.codegen import generate
from src.backend.mcpgen.planner import plan as _plan
from src.backend.mcpgen.planner import plan as plan_async

# from dedalus_labs.utils.stream import stream_async

T = TypeVar("T")

DEFAULT_BUILD_ROOT = Path(__file__).resolve().parent.parent / "build"

# expose planner for test monkeypatching
plan_async = _plan

##get agent from database using the agent ID
async def run_agent(agent: Agent):
    load_dotenv()

    client = AsyncDedalus()
    runner = DedalusRunner(client)

    result = await runner.run(  # type:ignore[arg-type]
        input=agent.prompt,
        model=["claude-sonnet-4"],
        mcp_servers=agent.tools,
        stream=False,
    )

    return result.final_output


def _run_coroutine_sync(factory: Callable[[], Awaitable[T]]) -> T:
    """Run an async factory whether or not an event loop is already running."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(factory())

    result_holder: dict[str, T] = {}
    error_holder: list[BaseException] = []

    def _runner() -> None:
        try:
            result_holder["value"] = asyncio.run(factory())
        except BaseException as exc:  # pragma: no cover - catastrophic path
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
MCPGEN_DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "build" / "generated"


async def _plan_and_generate(spec: str, output_dir: Path) -> Path:
    ir = await plan_async(spec)
    target_dir = _allocate_target_dir(output_dir, ir.server_name)
    generate(ir, target_dir)
    return target_dir / "server.py"


def _allocate_target_dir(root: Path, base_name: str) -> Path:
    """
    Ensure each generated server gets a dedicated folder.
    If a folder already exists, append a numeric suffix.
    """
    candidate = root / base_name
    suffix = 1
    while candidate.exists():
        candidate = root / f"{base_name}-{suffix}"
        suffix += 1
    return candidate


def _run_generation(spec: str, output_dir: Path) -> Path:
    return asyncio.run(_plan_and_generate(spec, output_dir))


def createMCP(spec: str, *, output_root: Optional[Path] = None) -> str:
    """
    Generate an MCP server from a natural-language spec using mcpgen.
    Returns the path to the generated server.py file so callers can import it.
    """
    cleaned_spec = spec.strip()
    if not cleaned_spec:
        raise ValueError("spec must be a non-empty string")

    out_root = Path(output_root) if output_root else MCPGEN_DEFAULT_OUTPUT
    out_root.mkdir(parents=True, exist_ok=True)

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        server_path = _run_generation(cleaned_spec, out_root)
    else:
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_run_generation, cleaned_spec, out_root)
            server_path = future.result()

    return str(server_path)

def createAgent(prompt:str, tools: List[str], name:str, needMCP: bool, tool_req: List[str]):
    
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
