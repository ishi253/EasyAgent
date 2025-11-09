import asyncio
import json
from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.backend.agents.agent import createAgent, run_agent as execute_agent
from src.backend.TextProcessing.call_llm import execute as generate_agent_prompt
from src.backend.FAST.db import list_agents as getAllAgents, update_agent_io
from collections import defaultdict, deque
app = FastAPI()

def dag_width(graph):
    """
    Compute peak parallelism = width = size of a maximum antichain.
    Input: graph as {u: [v1, v2, ...]} for a DAG. Nodes can be any hashables.
    Output: integer width.

    Complexity:
      - Transitive closure via n DFS/BFS: O(n*(n+m)) time, O(n^2) space.
      - Hopcroft–Karp on closure graph: O(n^2 * sqrt(n)) time.
    """
    # --- relabel to 0..n-1 ---
    nodes = list(graph.keys() | {v for vs in graph.values() for v in vs})
    idx = {u: i for i, u in enumerate(nodes)}
    n = len(nodes)
    adj = [[] for _ in range(n)]
    for u, vs in graph.items():
        iu = idx[u]
        for v in vs:
            adj[iu].append(idx[v])

    # --- transitive closure: reach[u] = set of v reachable from u (excluding u) ---
    reach = [set() for _ in range(n)]
    for s in range(n):
        # iterative DFS (stack) is fine; BFS also fine
        stack = list(adj[s])
        seen = set(stack)
        while stack:
            x = stack.pop()
            reach[s].add(x)
            for y in adj[x]:
                if y not in seen:
                    seen.add(y)
                    stack.append(y)

    # --- build bipartite graph on closure edges: left U = 0..n-1, right V = 0..n-1 ---
    # edges: (u in U) -> (v in V) iff v in reach[u]
    bp_adj = [list(sorted(reach[u])) for u in range(n)]

    # --- Hopcroft–Karp maximum matching U->V ---
    INF = 10**18
    pairU = [-1] * n
    pairV = [-1] * n
    dist = [0] * n

    def bfs():
        q = deque()
        for u in range(n):
            if pairU[u] == -1:
                dist[u] = 0
                q.append(u)
            else:
                dist[u] = INF
        found_free = False
        while q:
            u = q.popleft()
            for v in bp_adj[u]:
                pu = pairV[v]
                if pu == -1:
                    found_free = True
                elif dist[pu] == INF:
                    dist[pu] = dist[u] + 1
                    q.append(pu)
        return found_free

    def dfs(u):
        for v in bp_adj[u]:
            pu = pairV[v]
            if pu == -1 or (dist[pu] == dist[u] + 1 and dfs(pu)):
                pairU[u] = v
                pairV[v] = u
                return True
        dist[u] = INF
        return False

    matching = 0
    while bfs():
        for u in range(n):
            if pairU[u] == -1 and dfs(u):
                matching += 1

    width = n - matching
    return width
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


class AgentRunRequest(BaseModel):
    input_text: str


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

    responsibilities = prompt_payload.get("responsibilities")
    if not responsibilities or not isinstance(responsibilities, list):
        raise HTTPException(status_code=500, detail="LLM blueprint missing responsibilities list.")

    primary = responsibilities[0]
    agent_name = primary.get("name", cleaned_name).strip() or cleaned_name
    operations = primary.get("operations", "")
    tool_req = [line.strip() for line in operations.splitlines() if line.strip()]
    need_mcp = bool(tool_req)

    try:
        created_agent = createAgent(
            prompt=cleaned_prompt,
            tools=[],
            name=agent_name,
            needMCP=need_mcp,
            tool_req=tool_req,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to instantiate agent: {exc}") from exc
    return {    
        "message": "Agent registered successfully.",
        "agent": {
            "id": created_agent.id,
            "name": created_agent.name,
            "prompt": created_agent.prompt,
            "tools": created_agent.tools,
            "description": cleaned_description,
            "category": cleaned_category,
            "file_path": created_agent.file_path,
            "input": created_agent.input_text,
            "output": created_agent.output_text,
        },
    }


@app.post("/agents/{agent_id}/run")
async def run_agent(agent_id: str, payload: AgentRunRequest):
    user_input = payload.input_text
    try:
        output = await execute_agent(agent_id, user_input)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run agent '{agent_id}': {exc}") from exc

    try:
        updated = update_agent_io(agent_id, input_text=user_input, output_text=output or "")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to persist run result for '{agent_id}': {exc}") from exc

    return {
        "agentId": agent_id,
        "input": updated.get("input_text", user_input),
        "output": updated.get("output_text", output),
        "updatedAt": updated.get("updated_at"),
    }

@app.get("/database")
async def getDatabases():
    return getAllAgents()
