"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import TabStrip from "@/components/TabStrip";
import VersionHistoryList from "@/components/VersionHistoryList";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiFetch, getUserFromCookie } from "@/lib/api";
import type { Incident } from "@/lib/types";

const TABS = [
  { key: "details", label: "Details" },
  { key: "files", label: "Files" },
  { key: "history", label: "History" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-yellow-600",
  low: "text-gray-500",
};

interface IncidentResponse {
  success: boolean;
  data: { incident: Incident };
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "files" | "history">("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const user = getUserFromCookie();

  const fetchIncident = useCallback(async () => {
    try {
      const res = await apiFetch<IncidentResponse>(`/incidents/${id}`);
      setIncident(res.data.incident);
      setNotFound(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        setNotFound(true);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  async function handleStatusChange(newStatus: "reviewed" | "published") {
    setActionLoading(true);
    setStatusError(null);
    try {
      await apiFetch(`/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchIncident();
    } catch {
      setStatusError("Status update failed. Refresh the page and try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    try {
      await apiFetch(`/incidents/${id}`, { method: "DELETE" });
      router.push("/incidents");
    } catch {
      setStatusError("Delete failed. Refresh the page and try again.");
      setConfirmDelete(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center mt-32 gap-4">
          <p className="text-gray-600 text-lg">Incident not found.</p>
          <Link href="/incidents" className="text-red-600 hover:underline text-sm">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center mt-32">
          <p className="text-gray-500 text-sm">Loading incident…</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4 flex gap-2">
          <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span>&gt;</span>
          <Link href="/incidents" className="hover:text-gray-700">Incidents</Link>
          <span>&gt;</span>
          <span className="text-gray-900 truncate max-w-[240px]">{incident.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">{incident.title}</h1>
            <StatusBadge status={incident.status} />
            <span
              className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                PRIORITY_COLORS[incident.priority] ?? "text-gray-600"
              }`}
            >
              {incident.priority}
            </span>
          </div>
        </div>

        {/* Status error */}
        {statusError && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {statusError}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {incident.status === "draft" && (
            <button
              onClick={() => handleStatusChange("reviewed")}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg min-h-[44px] transition disabled:opacity-50"
            >
              Mark as Reviewed
            </button>
          )}

          {incident.status === "reviewed" && (
            <button
              onClick={() => handleStatusChange("published")}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg min-h-[44px] transition disabled:opacity-50"
            >
              Publish Incident
            </button>
          )}

          {incident.status === "published" && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              This incident is published and cannot be edited.
            </div>
          )}

          {isAdmin && incident.status === "draft" && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition min-h-[44px]"
            >
              Delete Incident
            </button>
          )}
        </div>

        {/* Tabs */}
        <TabStrip
          tabs={TABS}
          active={activeTab}
          onChange={(key) => setActiveTab(key as "details" | "files" | "history")}
        />

        {/* Tab: Details */}
        {activeTab === "details" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <div className="md:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Description
                </dt>
                <dd className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {incident.description}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Priority</dt>
                <dd className={`text-sm font-medium capitalize ${PRIORITY_COLORS[incident.priority] ?? "text-gray-700"}`}>
                  {incident.priority}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Category</dt>
                <dd className="text-sm text-gray-700 capitalize">
                  {incident.category.replace(/_/g, " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {incident.tags.length > 0 ? incident.tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  )) : <span className="text-sm text-gray-400">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Source</dt>
                <dd className="text-sm text-gray-700">{incident.source || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Creator</dt>
                <dd className="text-sm text-gray-700">{incident.creator_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Version</dt>
                <dd className="text-sm text-gray-700">v{incident.version}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Created</dt>
                <dd className="text-sm text-gray-700">
                  {new Date(incident.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Updated</dt>
                <dd className="text-sm text-gray-700">
                  {new Date(incident.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Tab: Files */}
        {activeTab === "files" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {incident.files.length === 0 ? (
              <p className="text-sm text-gray-500">No files attached to this incident.</p>
            ) : (
              <ul className="space-y-3">
                {incident.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0">
                    <span className="text-sm font-medium text-gray-800">{f.filename}</span>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                      {f.file_type}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(f.uploaded_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tab: History */}
        {activeTab === "history" && (
          <VersionHistoryList entries={incident.version_history.slice().reverse()} />
        )}
      </main>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Incident"
        body="Delete this incident? This action cannot be undone."
        confirmLabel="Delete Incident"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
