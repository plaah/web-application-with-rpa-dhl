from pydantic import BaseModel


class User(BaseModel):
    id: str
    username: str
    email: str
    password_hash: str
    role: str
    created_at: str
    is_active: bool = True
