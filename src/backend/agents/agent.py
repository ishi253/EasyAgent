from __future__ import annotations

# import asyncio
from dataclasses import dataclass
from typing import List
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv
# from dedalus_labs.utils.stream import stream_async

async def run_agent(agent: Agent):
    load_dotenv()

    if agent.needMCP:
        agent.tools.extend(createMCP(agent))

    client = AsyncDedalus()
    runner = DedalusRunner(client)

    result = await runner.run(  # type: ignore
        input=agent.prompt,
        model=["claude-sonnet-4"],
        mcp_servers=agent.tools,
        stream=False,
    )

    return result.final_output


def createMCP(agent: "Agent"):
    # TODO: implement MCP creation logic
    return []

@dataclass
class Agent:
    prompt: str
    tools: List[str]
    name: str
    needMCP: bool
