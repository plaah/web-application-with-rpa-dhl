from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.storage import read_json
from utils.auth_utils import verify_password, create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
async def login(req: LoginRequest):
    users = read_json("users.json")
    user = next((u for u in users if u["username"] == req.username and u.get("is_active", True)), None)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({
        "sub": user["id"],
        "role": user["role"],
        "username": user["username"],
    })
    return {
        "success": True,
        "data": {
            "token": token,
            "user": {"id": user["id"], "username": user["username"], "role": user["role"]},
        },
        "message": "Login successful",
    }
