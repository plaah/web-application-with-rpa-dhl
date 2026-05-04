import type { IncidentStatus } from "@/lib/types";

const COLORS: Record<IncidentStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  reviewed: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

export default function StatusBadge({ status }: { status: IncidentStatus }) {
  const cls = COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
