import type { VersionEntry } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

interface Props {
  entries: VersionEntry[];
}

export default function VersionHistoryList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No status changes recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((e, idx) => (
        <li
          key={idx}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
        >
          <StatusBadge status={e.status} />
          <span className="text-sm text-gray-600">
            version v{e.version}
          </span>
          <span className="text-sm text-gray-600">
            by <span className="font-medium">{e.changed_by}</span>
          </span>
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(e.changed_at).toLocaleString()}
          </span>
          {e.note && (
            <span className="text-xs text-gray-500 italic ml-2">{e.note}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
