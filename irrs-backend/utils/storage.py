import json
from pathlib import Path
from filelock import FileLock
from typing import Any

DATA_DIR = Path("data")


def read_json(filename: str) -> Any:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    lock = FileLock(str(filepath) + ".lock")
    with lock:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)


def write_json(filename: str, data: Any) -> None:
    filepath = DATA_DIR / filename
    lock = FileLock(str(filepath) + ".lock")
    with lock:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
