#!/usr/bin/env python3
"""Generate MCP prompts by calling Claude with existing templates."""

from __future__ import annotations

import argparse
import os
import pathlib
import sys

try:
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError as exc:  # pragma: no cover - import guard
    raise SystemExit(
        "LangChain packages missing. Install with "
        "`pip install langchain-anthropic langchain-core`."
    ) from exc

MODEL = "claude-opus-4-1-20250805"
ENV_FILE_NAME = ".env"
ENV_KEY = "ANTHROPIC_API_KEY"
DEFAULT_TEST_OUTPUT = pathlib.Path("tests/claude_response.txt")


def read_template(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise SystemExit(f"Template not found: {path}")


def build_blueprint_prompt(user_prompt: str, blueprint_template: str) -> str:
    """Return the text Claude should follow to create the MCP blueprint."""
    return (
        "Fill out the MCP blueprint template using the user's requirements.\n"
        "Respond with a complete blueprint, preserving the template headings.\n\n"
        "Template:\n"
        f"{blueprint_template}\n\n"
        "User Requirements:\n"
        f"{user_prompt}\n"
    )


def build_agent_instruction_prompt(user_prompt: str, agent_template: str) -> str:
    """Return the text Claude should follow to create agent run instructions."""
    return (
        "Using the MCP agent run template, produce concrete execution steps that "
        "align with the user's needs. Be explicit about MCP calls, branching, and "
        "outputs.\n\n"
        "Template:\n"
        f"{agent_template}\n\n"
        "User Requirements:\n"
        f"{user_prompt}\n"
    )


def build_messages(user_prompt: str, blueprint: str, agent_template: str) -> tuple[str, str]:
    system_prompt = (
        "You are an MCP prompt engineer. Given template blueprints for defining "
        "a new MCP and for guiding its connected agent, produce two filled-out "
        "prompts (Blueprint + Agent Run) tailored to the user request."
    )

    blueprint_prompt = build_blueprint_prompt(user_prompt, blueprint)
    agent_prompt = build_agent_instruction_prompt(user_prompt, agent_template)

    user_message = (
        "== Task 1: MCP Blueprint ==\n"
        f"{blueprint_prompt}\n"
        "== Task 2: MCP Agent Instructions ==\n"
        f"{agent_prompt}"
    )
    return system_prompt, user_message


def call_claude_with_langchain(
    system_prompt: str,
    user_message: str,
    *,
    api_key: str,
    model: str,
    max_tokens: int,
) -> str:
    try:
        llm = ChatAnthropic(
            model=model,
            anthropic_api_key=api_key,
            max_tokens=max_tokens,
        )
    except Exception as exc:
        raise SystemExit(f"Failed to initialize ChatAnthropic: {exc}") from exc

    response = llm.invoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_message)]
    )

    content = response.content
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        chunks = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                chunks.append(part.get("text", ""))
            elif isinstance(part, str):
                chunks.append(part)
        return "\n".join(filter(None, chunks)).strip()

    return str(content)


def find_env_file(start_dir: pathlib.Path) -> pathlib.Path | None:
    """Search upwards from start_dir for a .env file."""
    for path in [start_dir, *start_dir.parents]:
        candidate = path / ENV_FILE_NAME
        if candidate.is_file():
            return candidate
    return None


def load_env_value_from_file(key: str, start_dir: pathlib.Path) -> str | None:
    """Return the value for `key` from the nearest .env file."""
    env_path = find_env_file(start_dir)
    if not env_path:
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key_part, sep, value_part = line.partition("=")
        if sep and key_part.strip() == key:
            value = value_part.strip().strip("\"'")
            if value:
                os.environ.setdefault(key, value)
                return value
    return None

def execute(user_prompt:str, model=MODEL, max_tokens=1500) -> str:
    import logging

    logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )

    logger = logging.getLogger(__name__)


    script_dir = pathlib.Path(__file__).resolve().parent

    api_key = os.environ.get(ENV_KEY)
    if not api_key:
        api_key = load_env_value_from_file(ENV_KEY, script_dir)

    if not api_key:
        raise SystemExit(
            "ANTHROPIC_API_KEY is not set. Export it or add it to a nearby .env file."
        )

    blueprint_template = read_template(script_dir / "PromptFormat_MCPBlueprint.md")
    agent_template = read_template(script_dir / "PromptFormat_AgentRun.md")

    system_prompt, user_message = build_messages(
        user_prompt,
        blueprint_template,
        agent_template,
    )
    response = call_claude_with_langchain(
        system_prompt,
        user_message,
        api_key=api_key,
        model=model,
        max_tokens=max_tokens

    )
        
    logger.info(f"response: {response}")
    return response
