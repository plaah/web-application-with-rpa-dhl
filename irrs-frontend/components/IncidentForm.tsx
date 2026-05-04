"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { IncidentPriority } from "@/lib/types";

interface CreateIncidentResponse {
  success: boolean;
  data: {
    incident: {
      id: string;
    };
  };
}

interface Props {
  initialDescription?: string;
  attachedFile?: File | null;
  onSaved: (incidentId: string) => void;
}

const PRIORITIES: { value: IncidentPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CATEGORIES = [
  { value: "late_delivery", label: "Late Delivery" },
  { value: "address_issue", label: "Address Issue" },
  { value: "damaged_parcel", label: "Damaged Parcel" },
  { value: "system_error", label: "System Error" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
];

export default function IncidentForm({
  initialDescription = "",
  attachedFile,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState<IncidentPriority>("medium");
  const [category, setCategory] = useState("other");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync description when initialDescription changes (from extract)
  useEffect(() => {
    if (initialDescription) {
      setDescription(initialDescription);
    }
  }, [initialDescription]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("priority", priority);
    formData.append("category", category);
    formData.append("source", "manual");
    if (tags.trim()) {
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => formData.append("tags", t));
    }
    if (attachedFile) {
      formData.append("files[]", attachedFile);
    }

    try {
      const res = await apiFetch<CreateIncidentResponse>("/incidents", {
        method: "POST",
        body: formData,
      });
      onSaved(res.data.incident.id);
    } catch {
      setError("Failed to save incident. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Incident title"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          placeholder="Describe the incident"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Priority
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as IncidentPriority)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Tags{" "}
          <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="e.g. kl, jb, urgent"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 min-h-[44px]"
      >
        {submitting ? "Saving…" : "Save Incident"}
      </button>
    </form>
  );
}
