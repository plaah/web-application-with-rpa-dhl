from passlib.context import CryptContext
import json

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

users = [
    {
        "id": "usr-001",
        "username": "admin",
        "email": "admin@dhl.com",
        "password_hash": pwd.hash("admin123"),
        "role": "admin",
        "created_at": "2026-05-04T00:00:00",
        "is_active": True
    },
    {
        "id": "usr-002",
        "username": "editor",
        "email": "editor@dhl.com",
        "password_hash": pwd.hash("editor123"),
        "role": "editor",
        "created_at": "2026-05-04T00:00:00",
        "is_active": True
    },
    {
        "id": "usr-rpa",
        "username": "rpa_bot",
        "email": "rpa@dhl.com",
        "password_hash": pwd.hash("rpa_secret_2026"),
        "role": "editor",
        "created_at": "2026-05-04T00:00:00",
        "is_active": True
    }
]

with open("data/users.json", "w") as f:
    json.dump(users, f, indent=2)

for filename in ["incidents.json", "hashes.json", "logs.json"]:
    with open(f"data/{filename}", "w") as f:
        json.dump([], f)

print("Seeded successfully")
