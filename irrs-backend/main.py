from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import auth, incidents, files, reports, logs, ai as ai_router

app = FastAPI(title="DHL IRRS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("rpa_screenshots", exist_ok=True)

app.include_router(auth.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(ai_router.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
