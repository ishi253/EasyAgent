from __future__ import annotations
import os
from pathlib import Path
import re
from typing import Any
import logging
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from .ir import IR, Tool, Parameter, Dependency, RuntimeEnv, Test


SYSTEM_PROMPT = """You design MCP FastMCP servers. Return ONLY valid JSON matching this schema:
{
  "server_name": "kebab-case",
  "description": "...",
  "tools": [
    {
      "name": "snake_case",
      "description": "...",
      "parameters": [
        {"name":"...","type":"typing hint","description":"...","default": null|value}
      ],
      "return_type": "typing hint",
      "implementation": "    # 4-space-indented Python code using only allowed libs\n    return ...",
      "is_async": false
    }
  ],
  "dependencies": [{"name":"pkg","version":">=1,<2"}],
  "environment": {"workdir_required": false, "network_access": false},
  "tests": [{"tool":"name","args":{},"expected_result":...,"assertion":"equals"}]
}
Rules: no eval/exec/__import__/compile/globals/locals; file I/O only via WORKDIR; Excel uses openpyxl; HTTP uses httpx; keep code simple; include at least one test per tool.
"""

logger = logging.getLogger(__name__)

def offline_plan(task: str) -> IR:
    t = task.lower()
    if any(k in t for k in ["excel","xlsx","openpyxl","write to excel","write excel"]):
        logger.info("Offline planner: matched Excel keywords, selecting template 'excel'.")
        return IR(
            server_name="excel",
            description="Write rows to .xlsx under WORKDIR",
            tools=[
                Tool(
                    name="write_excel",
                    description="Write a 2D array into an .xlsx sheet",
                    parameters=[
                        Parameter(name="file", type="str", description="Path relative to WORKDIR, .xlsx optional"),
                        Parameter(name="sheet", type="str", description="Sheet name", default="Sheet1"),
                        Parameter(name="data", type="List[List[str|int|float|bool]]", description="Rows"),
                    ],
                    return_type="dict",
                    implementation=(
                        "    from pathlib import Path\n"
                        "    import os\n"
                        "    import openpyxl\n"
                        "    WORKDIR = Path(os.environ.get(\"WORKDIR\", \"/tmp\")).resolve()\n"
                        "    p = Path(file)\n"
                        "    if not p.suffix: p = p.with_suffix(\".xlsx\")\n"
                        "    p = (WORKDIR / p).resolve()\n"
                        "    if not str(p).startswith(str(WORKDIR)):\n"
                        "        raise ValueError(\"path escapes WORKDIR\")\n"
                        "    wb = openpyxl.Workbook()\n"
                        "    ws = wb.active; ws.title = sheet\n"
                        "    for r in data: ws.append(list(r))\n"
                        "    wb.save(p)\n"
                        "    return {\"ok\": True, \"rows_written\": len(data), \"path\": str(p)}\n"
                    ),
                )
            ],
            dependencies=[Dependency(name="openpyxl", version=">=3.1,<4.0")],
            environment=RuntimeEnv(workdir_required=True, network_access=False),
            tests=[
                Test(tool="write_excel", args={"file":"demo","sheet":"S1","data":[[1,2],[3,4]]}, expected_result={"ok": True, "rows_written": 2}, assertion="contains"),
            ],
        )

    # default add numbers
    logger.info("Offline planner: no keyword match, selecting default 'calculator' template.")
    return IR(
        server_name="calculator",
        description="Basic arithmetic",
        tools=[
            Tool(
                name="add_numbers",
                description="Sum two numbers or a list",
                parameters=[
                    Parameter(name="a", type="float|None", description="First number", default=None),
                    Parameter(name="b", type="float|None", description="Second number", default=None),
                    Parameter(name="values", type="List[float]|None", description="List of numbers", default=None),
                ],
                return_type="float",
                implementation=(
                    "    if values is not None: return float(sum(values))\n"
                    "    if a is None or b is None: raise ValueError(\"provide values[] or a and b\")\n"
                    "    return float(a + b)\n"
                ),
            )
        ],
        tests=[
            Test(tool="add_numbers", args={"a":2,"b":3}, expected_result=5.0),
            Test(tool="add_numbers", args={"values":[1,2,3]}, expected_result=6.0),
        ],
    )


async def anthropic_plan(task: str, api_key: str, model: str = "claude-3-5-sonnet-20241022") -> IR:
    llm = ChatAnthropic(model=model, anthropic_api_key=api_key)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Generate IR for this task:\n\n{task}"),
    ]
    logger.info("Requesting plan from Anthropic model '%s'.", model)
    resp = await llm.ainvoke(messages)
    content = resp.content
    if isinstance(content, list):
        text_parts: list[str] = []
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text":
                    text_parts.append(part.get("text", ""))
            else:
                text_parts.append(str(part))
        text = "\n".join(text_parts).strip()
    else:
        text = str(content).strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return IR.model_validate_json(text)


async def plan(task: str) -> IR:
    load_dotenv()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    model = "claude-opus-4-1-20250805"
    logger.info(f"api key status: {api_key}")
    if api_key:
        try:
            ir = await anthropic_plan(task, api_key, model=model)
            logger.info("Anthropic planner succeeded with server '%s'.", ir.server_name)
            return ir
        except Exception as exc:
            logger.warning("Anthropic planner failed (%s); falling back to offline templates.", exc)
    else:
        logger.info("ANTHROPIC_API_KEY not set; using offline templates.")
    return offline_plan(task)
