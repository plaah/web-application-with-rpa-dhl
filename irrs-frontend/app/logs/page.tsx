"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/lib/api";
import type { LogEntry, LogsResponse } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  skipped: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-blue-100 text-blue-700",
  skip_duplicate: "bg-yellow-100 text-yellow-700",
  status_update: "bg-purple-100 text-purple-700",
  error: "bg-red-100 text-red-700",
};

interface RunGroup {
  run_id: string;
  latest: string; // ISO timestamp of newest log in this run
  created: number;
  skipped: number;
  failed: number;
  logs: LogEntry[]; // ordered oldest-first within the group
}

function formatGroupTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRowTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<LogsResponse>("/logs?limit=200");
        if (!cancelled) setLogs(res.data.logs);
      } catch {
        if (!cancelled) {
          setError(
            "Failed to load logs. Check that the backend is running on port 8000 and try refreshing."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups: RunGroup[] = useMemo(() => {
    const map = new Map<string, RunGroup>();
    for (const l of logs) {
      const existing = map.get(l.run_id);
      if (existing) {
        existing.logs.push(l);
        if (l.timestamp > existing.latest) existing.latest = l.timestamp;
      } else {
        map.set(l.run_id, {
          run_id: l.run_id,
          latest: l.timestamp,
          created: 0,
          skipped: 0,
          failed: 0,
          logs: [l],
        });
      }
    }
    // Sort logs oldest-first within each group, count statuses, then build array
    const arr: RunGroup[] = [];
    for (const g of map.values()) {
      g.logs.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
      for (const l of g.logs) {
        if (l.action === "create" && l.status === "success") g.created += 1;
        else if (l.status === "skipped") g.skipped += 1;
        else if (l.status === "failed") g.failed += 1;
      }
      arr.push(g);
    }
    arr.sort((a, b) => (a.latest < b.latest ? 1 : -1));
    return arr;
  }, [logs]);

  function toggle(run_id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(run_id)) next.delete(run_id);
      else next.add(run_id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold mb-6">RPA Run Logs</h1>

        {loading && (
          <div className="text-sm text-gray-500">Loading logs...</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              No bot runs recorded yet
            </div>
            <div className="text-sm text-gray-500">
              Run the UiPath bot to see logs here. Each bot run will appear as a
              collapsible group.
            </div>
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div>
            {groups.map((g) => {
              const isOpen = expanded.has(g.run_id);
              return (
                <div
                  key={g.run_id}
                  className="bg-white border border-gray-200 rounded-lg mb-4"
                >
                  <button
                    type="button"
                    onClick={() => toggle(g.run_id)}
                    className="w-full flex items-center px-4 py-3 text-sm font-semibold text-left hover:bg-gray-50 transition"
                  >
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 mr-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-2 text-gray-400" />
                    )}
                    <span className="font-mono text-xs text-gray-500 mr-4">
                      {g.run_id.slice(0, 8)}...
                    </span>
                    <span className="mr-4">{formatGroupTimestamp(g.latest)}</span>
                    <span className="ml-auto flex gap-2">
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {g.created} created
                      </span>
                      <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {g.skipped} skipped
                      </span>
                      <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {g.failed} failed
                      </span>
                    </span>
                  </button>

                  {isOpen && (
                    <table className="w-full text-sm border-t border-gray-100">
                      <thead>
                        <tr className="text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-2 text-left">Action</th>
                          <th className="px-4 py-2 text-left">File</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Message</th>
                          <th className="px-4 py-2 text-left">Screenshot</th>
                          <th className="px-4 py-2 text-left">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.logs.map((l) => (
                          <tr
                            key={l.log_id}
                            className="border-b border-gray-100 last:border-b-0"
                          >
                            <td className="px-4 py-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  ACTION_COLORS[l.action] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {l.action}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono text-xs">
                              {l.file_name || "—"}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  STATUS_COLORS[l.status] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td
                              className="px-4 py-2 text-gray-700"
                              title={l.message}
                            >
                              {truncate(l.message, 60)}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs text-gray-500">
                              {l.screenshot_path || "—"}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs text-gray-500">
                              {formatRowTimestamp(l.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
