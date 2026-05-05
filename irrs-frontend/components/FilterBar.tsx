"use client";

export type Filters = {
  status?: string;
  tag?: string;
  date_from?: string;
  date_to?: string;
  creator?: string;
  search?: string;
};

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export default function FilterBar({ value, onChange }: Props) {
  function update(key: keyof Filters, val: string) {
    onChange({ ...value, [key]: val || undefined });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Status</label>
          <select
            value={value.status ?? ""}
            onChange={(e) => update("status", e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Tag */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Tag</label>
          <input
            type="text"
            value={value.tag ?? ""}
            onChange={(e) => update("tag", e.target.value)}
            placeholder="Tag"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Date From */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">
            From
          </label>
          <input
            type="date"
            value={value.date_from ?? ""}
            onChange={(e) => update("date_from", e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">To</label>
          <input
            type="date"
            value={value.date_to ?? ""}
            onChange={(e) => update("date_to", e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Creator */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">
            Creator
          </label>
          <input
            type="text"
            value={value.creator ?? ""}
            onChange={(e) => update("creator", e.target.value)}
            placeholder="Creator"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500">Search</label>
          <input
            type="text"
            value={value.search ?? ""}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search title or description"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Clear */}
        <button
          onClick={() => onChange({})}
          className="text-xs font-semibold text-red-600 hover:text-red-700 py-1.5 px-2"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
