export type Role = "admin" | "editor" | "reviewer";

export type IncidentStatus = "draft" | "reviewed" | "published";

export type IncidentPriority = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface FileAttachment {
  id: string;
  filename: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
}

export interface VersionEntry {
  version: number;
  status: IncidentStatus;
  changed_by: string;
  changed_at: string;
  note?: string;
}

export interface AISuggestions {
  summary?: string;
  tags?: string[];
  priority?: IncidentPriority;
  category?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  raw_content: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  category: string;
  tags: string[];
  creator_id: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  source: string;
  files: FileAttachment[];
  version: number;
  version_history: VersionEntry[];
  ai_suggestions?: AISuggestions;
}

export interface LogEntry {
  log_id: string;
  timestamp: string;
  run_id: string;
  action: string;
  file_name: string | null;
  incident_id: string | null;
  status: string;
  message: string;
  screenshot_path: string | null;
}

export interface LogsResponse {
  success: boolean;
  data: {
    logs: LogEntry[];
    total: number;
  };
}
