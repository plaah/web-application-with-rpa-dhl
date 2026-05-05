"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FilterBar, { Filters } from "@/components/FilterBar";
import IncidentTable from "@/components/IncidentTable";
import PaginationBar from "@/components/PaginationBar";
import { apiFetch } from "@/lib/api";
import type { Incident } from "@/lib/types";

interface IncidentsResponse {
  success: boolean;
  data: {
    incidents: Incident[];
    total: number;
    page: number;
    limit: number;
  };
}

export default function IncidentsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.creator) params.set("creator", filters.creator);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(page));
    params.set("limit", "20"); // limit=20 per page

    try {
      const res = await apiFetch<IncidentsResponse>(`/incidents?${params}`);
      setIncidents(res.data.incidents);
      setTotal(res.data.total);
    } catch {
      // handled by apiFetch
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Incidents</h1>
          <Link
            href="/upload"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            New Incident
          </Link>
        </div>

        <FilterBar
          value={filters}
          onChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
        />

        <IncidentTable
          incidents={incidents}
          loading={loading}
          hasFilters={hasFilters}
        />

        <PaginationBar
          page={page}
          total={total}
          limit={20}
          onPage={setPage}
        />
      </main>
    </div>
  );
}
