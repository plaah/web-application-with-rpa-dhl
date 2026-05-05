"use client";

import Link from "next/link";
import type { Incident } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-yellow-600",
  low: "text-gray-500",
};

interface Props {
  incidents: Incident[];
  loading: boolean;
  hasFilters: boolean;
}

export default function IncidentTable({
  incidents,
  loading,
  hasFilters,
}: Props) {
  const COLS = ["#", "Title", "Status", "Priority", "Category", "Tags", "Creator", "Created"];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {COLS.map((col) => (
              <th
                key={col}
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 text-left"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={COLS.length}
                className="px-4 py-6 text-center text-sm text-gray-500"
              >
                Loading incidents…
              </td>
            </tr>
          ) : incidents.length === 0 ? (
            <tr>
              <td
                colSpan={COLS.length}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                {hasFilters
                  ? "No incidents match your filters. Try adjusting your search or clearing filters."
                  : "No incidents have been created yet. Upload a file or create one manually."}
              </td>
            </tr>
          ) : (
            incidents.map((incident) => (
              <tr
                key={incident.id}
                className="border-b border-gray-50 hover:bg-gray-50 min-h-[48px]"
              >
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {incident.id.slice(0, 8)}
                </td>
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
                <td
                  className={`px-4 py-3 capitalize font-medium ${
                    PRIORITY_COLORS[incident.priority] ?? "text-gray-600"
                  }`}
                >
                  {incident.priority}
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">
                  {incident.category.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {incident.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {incident.creator_name}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(incident.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
