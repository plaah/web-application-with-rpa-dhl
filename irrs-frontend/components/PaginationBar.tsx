"use client";

export default function PaginationBar({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-end gap-3 mt-4 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 border border-gray-200 rounded disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-gray-500">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1 border border-gray-200 rounded disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
