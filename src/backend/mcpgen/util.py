from __future__ import annotations
from pathlib import Path

def write_text(path: Path, content: str) -> None:
    """Write text content to a file using UTF-8."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
