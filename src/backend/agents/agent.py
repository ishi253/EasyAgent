from __future__ import annotations

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

from backend.mcpgen.codegen import generate
from backend.mcpgen.planner import plan as plan_async

# from dedalus_labs.utils.stream import stream_async

##get agent from database using the agent ID
async def run_agent(agent: Agent):
    load_dotenv()

    client = AsyncDedalus()
    runner = DedalusRunner(client)

    

    result = await runner.run(  # type: ignore
        input=agent.prompt,
        model=["claude-sonnet-4"],
        mcp_servers=agent.tools,
        stream=False,
    )

    return result.final_output


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
            tools.append(createMCP(req))
    
    id = str(uuid.uuid1()[:6])
    return Agent(prompt, tools, name, id)

@dataclass
class Agent:
    prompt: str
    tools: List[str]
    name: str
    id: str
