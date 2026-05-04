"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import type { Incident } from "@/lib/types";

interface SummaryResponse {
  success: boolean;
  data: {
    total_incidents: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_category: Record<string, number>;
    rpa_runs: number;
    last_rpa_run: string | null;
  };
}

interface IncidentsResponse {
  success: boolean;
  data: {
    incidents: Incident[];
    total: number;
    page: number;
    limit: number;
  };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse["data"] | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, incidentsRes] = await Promise.all([
          apiFetch<SummaryResponse>("/reports/summary"),
          apiFetch<IncidentsResponse>("/incidents?limit=10&page=1"),
        ]);
        setSummary(summaryRes.data);
        setIncidents(incidentsRes.data.incidents);
      } catch {
        // handled by apiFetch (redirects to /login on 401)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold mb-4">Dashboard</h1>

        {loading ? (
          <p className="text-sm text-gray-500">Loading incidents…</p>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Draft"
                value={summary?.by_status?.draft ?? 0}
              />
              <StatCard
                label="Reviewed"
                value={summary?.by_status?.reviewed ?? 0}
              />
              <StatCard
                label="Published"
                value={summary?.by_status?.published ?? 0}
              />
            </div>

            {/* Recent Incidents */}
            <h2 className="text-xl font-semibold mb-3">Recent Incidents</h2>
            {incidents.length === 0 ? (
              <p className="text-sm text-gray-500">
                No incidents have been created yet.
              </p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 text-left">
                        Title
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 text-left">
                        Status
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 text-left">
                        Priority
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 text-left">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr
                        key={incident.id}
                        className="border-b border-gray-50 hover:bg-gray-50 min-h-[48px]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="text-gray-900 hover:text-red-600 font-medium"
                          >
                            {incident.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">
                          {incident.priority}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
