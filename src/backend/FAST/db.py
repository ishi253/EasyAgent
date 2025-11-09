"""
SQLite persistence helpers for the FAST service.

The backend uses two dataset files under ``src/backend/db``:

1. Agent Dataset (agents.db)
   Table schema: agents(agent_id TEXT PK, name TEXT, prompt TEXT, tools JSON,
   need_mcp INTEGER, file_path TEXT, created_at TEXT, updated_at TEXT)

2. Workflow Dataset (workflows.db)
   Table schema: workflows(workflow_id TEXT PK, display_name TEXT, nodes JSON,
   edges JSON, max_parallelism INTEGER, file_path TEXT, created_at TEXT, updated_at TEXT)

Key entry points:
    init_db()
        Ensures both datasets/tables exist. Called automatically at module load.
    get_agent_connection() / get_workflow_connection()
        Return sqlite connections scoped to the respective dataset file.
    save_agent(), get_agent(), list_agents(), delete_agent()
        CRUD helpers for agent configurations. Tool lists are stored as JSON.
    save_workflow(), get_workflow(), list_workflows(), delete_workflow()
        CRUD helpers for workflow definitions where nodes/edges are JSON blobs
        and max_parallelism is clamped to a minimum of 1.

There is also an optional __main__ smoke test that exercises the helpers.
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

repo_root = Path(__file__).resolve().parent.parent  # src/backend
GLOBAL_BASE_PATH = repo_root / "db"
AGENT_DB_PATH = GLOBAL_BASE_PATH / "agents.db"
WORKFLOW_DB_PATH = GLOBAL_BASE_PATH / "workflows.db"


def _ensure_db_directory() -> None:
    GLOBAL_BASE_PATH.mkdir(parents=True, exist_ok=True)


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    """Add a column to `table` if it does not already exist."""
    existing = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table})").fetchall()
    }
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition};")


def _now_timestamp() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _get_connection(db_path: Path) -> sqlite3.Connection:
    """Return a sqlite connection with row factory configured."""
    _ensure_db_directory()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_agent_connection() -> sqlite3.Connection:
    return _get_connection(AGENT_DB_PATH)


def get_workflow_connection() -> sqlite3.Connection:
    return _get_connection(WORKFLOW_DB_PATH)


def init_db() -> None:
    """Create the agents and workflows tables if they do not already exist."""
    with get_agent_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agents (
                agent_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL,
                tools TEXT NOT NULL,
                need_mcp INTEGER NOT NULL DEFAULT 0,
                file_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        _ensure_column(conn, "agents", "file_path", "TEXT")
    with get_workflow_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workflows (
                workflow_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                nodes TEXT NOT NULL,
                edges TEXT NOT NULL,
                max_parallelism INTEGER NOT NULL DEFAULT 1,
                file_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        _ensure_column(conn, "workflows", "file_path", "TEXT")


def _row_to_agent(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "agent_id": row["agent_id"],
        "name": row["name"],
        "prompt": row["prompt"],
        "tools": json.loads(row["tools"]),
        "need_mcp": bool(row["need_mcp"]),
        "file_path": row["file_path"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _row_to_workflow(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "workflow_id": row["workflow_id"],
        "display_name": row["display_name"],
        "nodes": json.loads(row["nodes"]),
        "edges": json.loads(row["edges"]),
        "max_parallelism": row["max_parallelism"],
        "file_path": row["file_path"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def save_agent(
    agent_id: str,
    *,
    name: str,
    prompt: str,
    tools: List[str],
    file_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert or update an agent configuration."""
    if not agent_id:
        raise ValueError("agent_id must be provided")
    timestamp = _now_timestamp()
    payload = {
        "agent_id": agent_id,
        "name": name,
        "prompt": prompt,
        "tools": tools,
        "need_mcp": need_mcp,
        "file_path": file_path or "",
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    with get_agent_connection() as conn:
        conn.execute(
            """
            INSERT INTO agents (agent_id, name, prompt, tools, need_mcp, file_path, created_at, updated_at)
            VALUES (:agent_id, :name, :prompt, :tools, :need_mcp, :file_path, :created_at, :updated_at)
            ON CONFLICT(agent_id) DO UPDATE SET
                name=excluded.name,
                prompt=excluded.prompt,
                tools=excluded.tools,
                need_mcp=excluded.need_mcp,
                file_path=excluded.file_path,
                updated_at=excluded.updated_at;
            """,
            {
                **payload,
                "tools": json.dumps(tools),
                "need_mcp": int(need_mcp),
            },
        )
        conn.commit()
    return get_agent(agent_id)  # refresh timestamps if existing row was updated


def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single agent by its identifier."""
    with get_agent_connection() as conn:
        row = conn.execute("SELECT * FROM agents WHERE agent_id = ?", (agent_id,)).fetchone()
    return _row_to_agent(row) if row else None


def list_agents() -> List[Dict[str, Any]]:
    """Return all agents ordered by creation time."""
    with get_agent_connection() as conn:
        rows = conn.execute("SELECT * FROM agents ORDER BY created_at ASC").fetchall()
    return [_row_to_agent(row) for row in rows]

def delete_agent(agent_id: str) -> bool:
    """Remove an agent. Returns True if a row was deleted."""
    with get_agent_connection() as conn:
        cursor = conn.execute("DELETE FROM agents WHERE agent_id = ?", (agent_id,))
        conn.commit()
    return cursor.rowcount > 0


def save_workflow(
    workflow_id: str,
    *,
    display_name: Optional[str] = None,
    nodes: Optional[List[str]] = None,
    edges: Optional[List[Tuple[str, str]]] = None,
    max_parallelism: int = 1,
    file_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert or update a workflow definition."""
    if not workflow_id:
        raise ValueError("workflow_id must be provided")
    nodes = nodes or []
    edges = edges or []
    timestamp = _now_timestamp()
    payload = {
        "workflow_id": workflow_id,
        "display_name": display_name or workflow_id,
        "nodes": json.dumps(nodes),
        "edges": json.dumps(edges),
        "max_parallelism": max(1, max_parallelism),
        "file_path": file_path or "",
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    with get_workflow_connection() as conn:
        conn.execute(
            """
            INSERT INTO workflows (workflow_id, display_name, nodes, edges, max_parallelism, file_path, created_at, updated_at)
            VALUES (:workflow_id, :display_name, :nodes, :edges, :max_parallelism, :file_path, :created_at, :updated_at)
            ON CONFLICT(workflow_id) DO UPDATE SET
                display_name=excluded.display_name,
                nodes=excluded.nodes,
                edges=excluded.edges,
                max_parallelism=excluded.max_parallelism,
                file_path=excluded.file_path,
                updated_at=excluded.updated_at;
            """,
            payload,
        )
        conn.commit()
    return get_workflow(workflow_id)


def get_workflow(workflow_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a workflow by id."""
    with get_workflow_connection() as conn:
        row = conn.execute("SELECT * FROM workflows WHERE workflow_id = ?", (workflow_id,)).fetchone()
    return _row_to_workflow(row) if row else None


def list_workflows() -> List[Dict[str, Any]]:
    """Return all workflows ordered by creation time."""
    with get_workflow_connection() as conn:
        rows = conn.execute("SELECT * FROM workflows ORDER BY created_at ASC").fetchall()
    return [_row_to_workflow(row) for row in rows]

def delete_workflow(workflow_id: str) -> bool:
    """Delete a workflow definition. Returns True on success."""
    with get_workflow_connection() as conn:
        cursor = conn.execute("DELETE FROM workflows WHERE workflow_id = ?", (workflow_id,))
        conn.commit()
    return cursor.rowcount > 0


# Initialize schema on import so other modules can call helpers immediately.
init_db()


if __name__ == "__main__":
    # init_db()
    # Basic harness that exercises CRUD for both datasets.
    # save_agent("harness-agent", name="Test Agent", prompt="Prompt", tools=["a"], need_mcp=True)
    # save_agent("harness-agent1", name="Updated", prompt="Prompt2", tools=["b"], need_mcp=False)
    print(list_agents())
