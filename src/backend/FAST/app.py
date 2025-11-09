import asyncio
import json
from pathlib import Path
from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.backend.agents.agent import createAgent
from src.backend.TextProcessing.call_llm import execute as generate_agent_prompt
from src.backend.FAST.db import list_agents as getAllAgents, save_agent as persist_agent
app = FastAPI()

# Allow the frontend dev server to call this API from a different origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WorkflowStruct(BaseModel):
    workflow: str
    nodes: List[str] # AgentID-count
    edges: List[Tuple[str, str]]

class AgentCreateRequest(BaseModel):
    name: str
    description: str
    prompt: str
    category: str


@app.post("/workflow")
async def root(workflow: WorkflowStruct):
    if not workflow.nodes:
        raise HTTPException(status_code=400, detail="Workflow must include at least one node.")

    processed_nodes = [{"id": node_id, "status": "received"} for node_id in workflow.nodes]

    # TODO call function
    # Edge set looks like : [(agentID, agentID),...]
    # Need: List of nodes, list of edges, max parallelism (iterate through source verticies and count)
    return {
        "message": "Workflow received!!!",
        "workflowId": workflow.workflow,
        "nodeCount": len(workflow.nodes),
        "edgeCount": len(workflow.edges),
        "nodes": processed_nodes,
    }


# Create Agent
# Prompt, list of avaiable tools, name of agent, bool do we need more MCP, tool requirements, SOP

def _detect_generated_class_path(tools: List[str]) -> str:
    """
    Return the first filesystem path pointing to a generated class.
    We assume generated FastMCP servers end with 'server.py'.
    """
    for tool in reversed(tools):
        candidate = Path(tool)
        if candidate.suffix == ".py" and candidate.name == "server.py":
            return str(candidate)
    return ""


@app.post("/agents")
async def create_agent(agent: AgentCreateRequest):
    cleaned_name = agent.name.strip()
    cleaned_prompt = agent.prompt.strip()
    cleaned_description = agent.description.strip()
    cleaned_category = agent.category.strip()
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Agent name cannot be empty.")
    if not cleaned_prompt:
        raise HTTPException(status_code=400, detail="Agent prompt cannot be empty.")

    try:
        llm_output = await asyncio.to_thread(generate_agent_prompt, cleaned_prompt)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate prompt: {exc}") from exc
    # @TODO check the cached stuff
    try:
        prompt_payload = json.loads(llm_output)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {exc}") from exc

    try:
        created_agent = createAgent(
            prompt=prompt_payload['responsibilities'],
            tools=[],
            name=cleaned_name,
            needMCP=False,
            tool_req=[],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to instantiate agent: {exc}") from exc

    generated_class_path = _detect_generated_class_path(created_agent.tools)

    try:
        persist_agent(
            created_agent.id,
            name=created_agent.name,
            prompt=created_agent.prompt,
            tools=created_agent.tools,
            need_mcp=bool(generated_class_path),
            file_path=generated_class_path,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to persist agent: {exc}") from exc
    
    return {
        "message": "Agent registered successfully.",
        "agent": {
            "id": created_agent.id,
            "name": created_agent.name,
            "prompt": created_agent.prompt,
            "tools": created_agent.tools,
            "description": cleaned_description,
            "category": cleaned_category,
            "file_path": generated_class_path,
        },
    }

@app.get("/database")
async def getDatabases():
    return getAllAgents()
