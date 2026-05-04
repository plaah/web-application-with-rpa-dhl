import hashlib
from datetime import datetime, timedelta, timezone
from utils.storage import read_json, write_json


def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def is_duplicate(content_hash: str, days: int = 14) -> bool:
    records = read_json("hashes.json")
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    for r in records:
        if r["hash"] == content_hash:
            created = datetime.fromisoformat(r["created_at"])
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created >= cutoff:
                return True
    return False


def get_duplicate_incident_id(content_hash: str) -> str | None:
    records = read_json("hashes.json")
    for r in records:
        if r["hash"] == content_hash:
            return r.get("incident_id")
    return None


def register_hash(content_hash: str, incident_id: str) -> None:
    records = read_json("hashes.json")
    records.append({
        "hash": content_hash,
        "incident_id": incident_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    write_json("hashes.json", records)
