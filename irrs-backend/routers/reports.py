from fastapi import APIRouter, Depends
from utils.storage import read_json
from utils.auth_utils import get_current_user
from collections import Counter

router = APIRouter()


@router.get("/reports/summary")
async def summary(_user=Depends(get_current_user)):
    incidents = read_json("incidents.json")
    logs = read_json("logs.json")

    by_status = Counter(i["status"] for i in incidents)
    by_priority = Counter(i["priority"] for i in incidents)
    by_category = Counter(i["category"] for i in incidents)

    run_ids = {l["run_id"] for l in logs if "run_id" in l}
    last_run = max((l["timestamp"] for l in logs), default=None)

    return {
        "success": True,
        "data": {
            "total_incidents": len(incidents),
            "by_status": dict(by_status),
            "by_priority": dict(by_priority),
            "by_category": dict(by_category),
            "rpa_runs": len(run_ids),
            "last_rpa_run": last_run,
        },
    }
