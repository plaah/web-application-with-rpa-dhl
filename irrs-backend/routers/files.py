from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from utils.file_parser import extract_text
from utils.auth_utils import get_current_user

router = APIRouter()

ALLOWED_TYPES = {".txt", ".pdf", ".docx", ".png", ".jpg", ".jpeg"}


@router.post("/files/extract")
async def extract_file_text(
    file: UploadFile = File(...),
    _user=Depends(get_current_user),
):
    ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    content = await file.read()
    if ext in {".png", ".jpg", ".jpeg"}:
        return {"success": True, "data": {"extracted_text": "", "file_type": ext.lstrip(".")}}
    text = extract_text(content, file.filename)
    return {"success": True, "data": {"extracted_text": text, "file_type": ext.lstrip(".")}}
