#!/usr/bin/env python3
"""Generate MCP prompts by calling Claude with existing templates."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-3-opus-20240229"
ANTHROPIC_VERSION = "2023-06-01"


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


def build_payload(user_prompt: str, blueprint: str, agent_template: str) -> str:
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

    body = {
        "model": MODEL,
        "max_tokens": 1500,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": user_message}],
            }
        ],
    }
    return json.dumps(body)


def call_claude(payload: str, api_key: str) -> str:
    req = urllib.request.Request(
        API_URL,
        data=payload.encode("utf-8"),
        headers={
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
            "x-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Claude API error ({exc.code}): {detail}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Call Claude with MCP templates and a user prompt.",
    )
    parser.add_argument(
        "user_prompt",
        help="Description of the desired MCP/task to tailor the prompts.",
    )
    parser.add_argument(
        "--model",
        default=MODEL,
        help=f"Claude model id (default: {MODEL})",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=1500,
        help="Maximum tokens for Claude response (default: 1500).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit("ANTHROPIC_API_KEY is not set in the environment.")

    script_dir = pathlib.Path(__file__).resolve().parent
    blueprint_template = read_template(script_dir / "PromptFormat_MCPBlueprint.md")
    agent_template = read_template(script_dir / "PromptFormat_AgentRun.md")

    payload = build_payload(args.user_prompt, blueprint_template, agent_template)

    # Allow overrides via CLI arguments without reconstructing payload manually.
    payload_dict = json.loads(payload)
    payload_dict["model"] = args.model
    payload_dict["max_tokens"] = args.max_tokens

    response = call_claude(json.dumps(payload_dict), api_key)
    print(response)


if __name__ == "__main__":
    main()
