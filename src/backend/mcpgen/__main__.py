from __future__ import annotations
import argparse
import asyncio
import json
import logging
import os
from pathlib import Path
from .planner import plan as plan_async
from .codegen import generate
from .ir import IR
from .validate_probe import validate, probe


# ---------------------- Command handlers ----------------------

async def cmd_generate(args) -> None:
    logging.info("Starting plan for task: %s", args.task)
    ir = await plan_async(args.task)
    if args.workdir_required:
        ir.environment.workdir_required = True
    out = Path(args.output)
    generate(ir, out)
    logging.info("Generated server '%s' with %d tool(s) at %s", ir.server_name, len(ir.tools), out)
    print(f"Generated: {out}/server.py")
    print(f"IR: {out}/ir.json")
    if not args.no_validate:
        vr = await asyncio.to_thread(
            validate,
            out / "server.py",
            ir,
            Path(args.workdir) if args.workdir else None,
        )
        print(vr)


def cmd_validate(args) -> None:
    out = Path(args.output)
    ir_path = out / "ir.json"
    if not ir_path.exists():
        raise SystemExit("ir.json not found; regenerate first")
    ir = IR.model_validate_json(ir_path.read_text())
    vr = validate(out / "server.py", ir, workdir=Path(args.workdir) if args.workdir else None)
    print(vr)


def cmd_probe(args) -> None:
    res = probe(Path(args.server), args.tool, json.loads(args.args), Path(args.workdir) if args.workdir else None)
    print(json.dumps(res, indent=2))


# ---------------------- CLI entrypoint ----------------------

def main() -> None:
    log_level = os.environ.get("MCPGEN_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="[%(levelname)s] %(message)s",
    )
    p = argparse.ArgumentParser(prog="mcpgen", description="Generate FastMCP servers from natural-language tasks")
    sub = p.add_subparsers(dest="cmd", required=True)

    default_output = Path(__file__).resolve().parent.parent / "build"

    # generate
    g = sub.add_parser("generate", help="Plan and generate a server")
    g.add_argument("task", help="Task description")
    g.add_argument("-o", "--output", default=str(default_output), help="Output directory (defaults to backend/build)")
    g.add_argument("--workdir-required", action="store_true", help="Force FS sandbox")
    g.add_argument("--no-validate", action="store_true", help="Skip validation")
    g.add_argument("--workdir", help="WORKDIR used during validation")
    g.set_defaults(func=lambda a: asyncio.run(cmd_generate(a)))

    # validate
    v = sub.add_parser("validate", help="Validate a generated server using ir.json")
    v.add_argument("-o", "--output", required=True, help="Directory containing server.py and ir.json")
    v.add_argument("--workdir", help="WORKDIR for file ops during validation")
    v.set_defaults(func=cmd_validate)

    # probe
    pr = sub.add_parser("probe", help="Call a tool on a server over MCP stdio")
    pr.add_argument("server", help="Path to server.py")
    pr.add_argument("tool", help="Tool name")
    pr.add_argument("--args", required=True, help="JSON args")
    pr.add_argument("--workdir", help="WORKDIR for file ops")
    pr.set_defaults(func=cmd_probe)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
