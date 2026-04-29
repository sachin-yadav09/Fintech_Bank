// src\pages\dashboard\transfer\Transfers.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Send, Search, Calendar, CheckCircle2,
  XCircle, Clock, ExternalLink, Loader2,
} from "lucide-react";
import { getTransactions } from "@/libs/core";
import { useAuth } from "@/hooks/useAuth";

type Tx = {
  id: string | number;
  transaction_type: string;
  amount: string | number;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | string;
  reference: string;
  external_reference?: string | null;
  sender?: any;
  receiver?: any;
  timestamp: string;
};

// FIX: Real StatusBadge with correct styling per status
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === "SUCCESSFUL")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> SUCCESSFUL
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <Clock className="h-3 w-3" /> PENDING
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <XCircle className="h-3 w-3" /> FAILED
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      {status}
    </span>
  );
};

const PAGE_SIZE = 10;

const Transfers: React.FC = () => {
  const { user } = useAuth();
  // FIX: Real API data instead of hardcoded mock rows
  const [allRows, setAllRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // FIX: Functional search and date filter state
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // FIX: Real pagination state
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getTransactions();
        const raw = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setAllRows(raw);
      } catch {
        setError("Failed to load transfers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helper to determine if transaction is a credit
  const isCredit = (t: Tx) => {
    const type = t.transaction_type.toUpperCase();
    if (type === "DEPOSIT" || (type === "SAVINGS" && !type.includes("WITHDRAWAL"))) return true;
    if (type === "TRANSFER") {
      if (typeof t.receiver === "string") return t.receiver === user?.username;
      if (t.receiver && typeof t.receiver === "object") {
         return t.receiver.username === user?.username || t.receiver.email === user?.email;
      }
    }
    return false;
  };

  // Helper to extract a display name from nested user objects or strings
  const getDisplayName = (u: any) => {
    if (!u) return "";
    if (typeof u === "string") return u;
    return u.username || u.email || "";
  };

  // FIX: Apply search filter safely checking nested sender/receiver objects
  const filtered = allRows.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.reference?.toLowerCase().includes(q) ||
      String(t.amount).includes(q) ||
      getDisplayName(t.sender).toLowerCase().includes(q) ||
      getDisplayName(t.receiver).toLowerCase().includes(q);

    const matchesDate =
      !dateFilter ||
      new Date(t.timestamp).toISOString().startsWith(dateFilter);

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, dateFilter]);

  return (
    <div className="page-container">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">
            / Transfers / All
          </div>
        </div>
        <Link
          to="/dashboard/transfers/new"
          className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 dark:bg-white dark:text-black"
        >
          <Send className="mr-2 h-4 w-4" />
          New Transfer
        </Link>
      </div>

      {/* FIX: Functional filter inputs */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, receiver, amount…"
            className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
          />
        </div>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-400 dark:text-white/30">
            {search || dateFilter ? "No transfers match your filters." : "No transfers yet."}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && paginated.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-white/10 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Ext. Ref</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <tr key={t.reference} className="border-t border-gray-100 dark:border-white/10">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/90" />
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getDisplayName(t.sender) || "—"}</td>
                    <td className="px-4 py-3">{getDisplayName(t.receiver) || "—"}</td>
                    {/* FIX: Properly display debit/credit sign and color */}
                    <td className={`px-4 py-3 font-medium ${isCredit(t) ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                      {isCredit(t) ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    {/* FIX: Use StatusBadge component instead of raw text */}
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono">{t.reference.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3">{t.external_reference ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-white/60">
                      {new Date(t.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* FIX: Use t.reference instead of t.id for correct route */}
                      <Link
                        to={`/dashboard/transactions/${t.reference}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                      >
                        View <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FIX: Real pagination with actual count and prev/next handlers */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm dark:border-white/10">
            <div className="text-gray-600 dark:text-white/60">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary CTA */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-white/60">
          Filter by date or search reference to find a specific transfer.
        </p>
      </div>
    </div>
  );
};

export default Transfers;