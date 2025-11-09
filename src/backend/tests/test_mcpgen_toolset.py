from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
from pathlib import Path

import pytest

from mcpgen.codegen import generate
from mcpgen.ir import IR, Tool, Parameter


@pytest.fixture(autouse=True)
def stub_fastmcp():
    """Provide a lightweight FastMCP stand-in for importing generated servers."""
    original_modules = {
        name: sys.modules.get(name)
        for name in ("mcp", "mcp.server", "mcp.server.fastmcp")
    }

    fastmcp_module = types.ModuleType("mcp.server.fastmcp")

    class DummyFastMCP:
        def __init__(self, *_args, **_kwargs):
            pass

        def tool(self):
            def decorator(func):
                return func
            return decorator

        def run(self):
            raise RuntimeError("run() should not be called during tests")

    fastmcp_module.FastMCP = DummyFastMCP

    mcp_pkg = types.ModuleType("mcp")
    mcp_pkg.__path__ = []  # mark as package
    server_pkg = types.ModuleType("mcp.server")
    server_pkg.__path__ = []
    server_pkg.fastmcp = fastmcp_module
    mcp_pkg.server = server_pkg

    sys.modules["mcp"] = mcp_pkg
    sys.modules["mcp.server"] = server_pkg
    sys.modules["mcp.server.fastmcp"] = fastmcp_module

    try:
        yield
    finally:
        for name, module in original_modules.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module


def _load_generated_module(path: Path):
    spec = importlib.util.spec_from_file_location("generated_server", path)
    module = importlib.util.module_from_spec(spec)
    if not spec or not spec.loader:
        raise RuntimeError("Unable to load generated server module")
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def test_generated_toolset_is_iterable(tmp_path: Path):
    ir = IR(
        server_name="demo-server",
        description="Demo server for testing toolset exports",
        tools=[
            Tool(
                name="add",
                description="Add numbers",
                parameters=[
                    Parameter(name="a", type="int", description="first"),
                    Parameter(name="b", type="int", description="second"),
                ],
                return_type="int",
                implementation="return a + b",
            ),
            Tool(
                name="double_async",
                description="Async double",
                parameters=[
                    Parameter(name="value", type="int", description="value"),
                ],
                return_type="int",
                implementation="return value * 2",
                is_async=True,
            ),
        ],
    )

    generate(ir, tmp_path)
    module = _load_generated_module(tmp_path / "server.py")

    toolset_cls = getattr(module, "GeneratedToolset")
    toolset = toolset_cls()

    iterated = list(toolset)
    assert len(iterated) == 2
    assert all(callable(tool) for tool in iterated)
    assert iterated[0].__self__ is toolset  # bound method

    assert toolset.add(2, 3) == 5
    assert asyncio.run(toolset.double_async(4)) == 8

    assert toolset._tool_names == ("add", "double_async")
