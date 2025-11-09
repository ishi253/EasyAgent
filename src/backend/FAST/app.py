from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    nodes: List[str]
    edges: List[Tuple[str, str]]


@app.post("/")
async def root(workflow: WorkflowStruct):
    if not workflow.nodes:
        raise HTTPException(status_code=400, detail="Workflow must include at least one node.")

    processed_nodes = [{"id": node_id, "status": "received"} for node_id in workflow.nodes]

    return {
        "message": "Workflow received!!!",
        "workflowId": workflow.workflow,
        "nodeCount": len(workflow.nodes),
        "edgeCount": len(workflow.edges),
        "nodes": processed_nodes,
    }