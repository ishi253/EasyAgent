from __future__ import annotations

from pathlib import Path

import pytest

from backend.agents import agent as agent_module
from backend.mcpgen.ir import IR, Tool, Parameter


@pytest.fixture(autouse=True)
def stub_plan(monkeypatch):
    """Stub out planner.plan to avoid real LLM calls during tests."""

    async def fake_plan(task: str) -> IR:
        return IR(
            server_name="auto-sum",
            description=f"Generated for: {task}",
            tools=[
                Tool(
                    name="add",
                    description="Add two ints",
                    parameters=[
                        Parameter(name="a", type="int", description="first"),
                        Parameter(name="b", type="int", description="second"),
                    ],
                    return_type="int",
                    implementation="return a + b",
                )
            ],
        )

    monkeypatch.setattr(agent_module, "plan_async", fake_plan)


def test_create_mcp_generates_server(tmp_path: Path):
    output = agent_module.createMCP("build an adder", output_root=tmp_path)
    server_path = Path(output)
    assert server_path.exists(), "server.py should be generated"
    assert server_path.parent.name.startswith("auto-sum")
    assert (server_path.parent / "ir.json").exists()
    assert "def add" in server_path.read_text()


def test_create_mcp_requires_non_empty_spec(tmp_path: Path):
    with pytest.raises(ValueError):
        agent_module.createMCP("   ", output_root=tmp_path)
