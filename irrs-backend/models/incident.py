from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime, timezone


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class IncidentStatus(str, Enum):
    draft = "draft"
    reviewed = "reviewed"
    published = "published"


class IncidentPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IncidentCategory(str, Enum):
    late_delivery = "late_delivery"
    address_issue = "address_issue"
    damaged_parcel = "damaged_parcel"
    system_error = "system_error"
    complaint = "complaint"
    other = "other"


class FileAttachment(BaseModel):
    file_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_type: str
    path: str
    uploaded_at: str = Field(default_factory=utcnow)


class VersionEntry(BaseModel):
    version: int
    description: str
    status: str
    changed_by: str
    changed_at: str = Field(default_factory=utcnow)


class AISuggestions(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    tags: List[str] = []
    priority_suggestion: Optional[str] = None
    category_suggestion: Optional[str] = None
    used: bool = False


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    raw_content: str = ""
    status: IncidentStatus = IncidentStatus.draft
    priority: IncidentPriority = IncidentPriority.medium
    category: IncidentCategory = IncidentCategory.other
    tags: List[str] = []
    creator_id: str
    creator_name: str
    created_at: str = Field(default_factory=utcnow)
    updated_at: str = Field(default_factory=utcnow)
    source: str = "manual"
    files: List[FileAttachment] = []
    content_hash: Optional[str] = None
    version: int = 1
    version_history: List[VersionEntry] = []
    ai_suggestions: Optional[AISuggestions] = None
