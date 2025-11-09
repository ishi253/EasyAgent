import asyncio
import json
from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.backend.agents.agent import createAgent
from src.backend.TextProcessing.call_llm import execute as generate_agent_prompt
from src.backend.FAST.db import list_agents as getAllAgents, save_agent as persist_agent
from collections import defaultdict, deque
from src.backend.FAST.demo_stream_dag import run_stream_demo
app = FastAPI()

def dag_width_from_sets(vertices, edges):
    """
    Peak parallelism (width) of a DAG given vertices and edges.

    Args:
      vertices: iterable of node ids (hashable).
      edges: iterable of (u, v) pairs for directed edges u -> v.

    Returns:
      int: size of a maximum antichain = max number of ops runnable at once.

    Notes:
      - Assumes the input graph is a DAG.
      - Time: O(nm + n^2 * sqrt(n)) worst case. Space: O(n^2).
    """
    V = list(dict.fromkeys(vertices))
    idx = {u: i for i, u in enumerate(V)}
    n = len(V)

    # adjacency
    adj = [[] for _ in range(n)]
    for u, v in edges:
        iu = idx[u]; iv = idx[v]
        adj[iu].append(iv)

    # transitive closure: reach[u] = set of v reachable from u
    reach = [set() for _ in range(n)]
    for s in range(n):
        stack = list(adj[s])
        seen = set(stack)
        while stack:
            x = stack.pop()
            reach[s].add(x)
            for y in adj[x]:
                if y not in seen:
                    seen.add(y)
                    stack.append(y)

    # bipartite graph: U=0..n-1, V=0..n-1, edge u->v iff v in reach[u]
    bp_adj = [sorted(reach[u]) for u in range(n)]

    # Hopcroft–Karp
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
        found_augmenting = False
        while q:
            u = q.popleft()
            for v in bp_adj[u]:
                pu = pairV[v]
                if pu == -1:
                    found_augmenting = True
                elif dist[pu] == INF:
                    dist[pu] = dist[u] + 1
                    q.append(pu)
        return found_augmenting

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
    return n - matching

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
    nodes = workflow.nodes
    edges = workflow.edges
    edgeList = [(edge[0], edge[1]) for edge in edges]
    maxWidth = dag_width_from_sets(nodes, edgeList)
    retrVal = run_stream_demo(nodes, edgeList, num_workers=maxWidth)
    # TODO call function
    # Edge set looks like : [(agentID, agentID),...]
    # Need: List of nodes, list of edges, max parallelism (iterate through source verticies and count)
    return retrVal


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
    persist_agent(created_agent.id, created_agent, created_agent.prompt, created_agent.tools, created_agent.file_path)
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
        },
    }

@app.get("/database")
async def getDatabases():
    return getAllAgents()
