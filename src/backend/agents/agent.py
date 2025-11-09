from __future__ import annotations

# import asyncio
from dataclasses import dataclass
from typing import List
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv
import uuid
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


def createMCP(spec: str):
    return [str]

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

