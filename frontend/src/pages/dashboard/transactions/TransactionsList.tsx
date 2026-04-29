// frontend\src\pages\dashboard\transactions\TransactionsList.tsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, Wallet as WalletIcon,
  Hash, CalendarClock, ChevronRight, Loader2,
} from "lucide-react";
import { getTransactions } from "@/libs/core";

interface Transaction {
  id: number;
  reference: string;
  transaction_type: string;
  amount: string;
  // FIX: Allow string fallback for unknown statuses
  status: "SUCCESSFUL" | "PENDING" | "FAILED" | string;
  timestamp: string;
}

// FIX: StatusBadge now has a proper fallback for unknown statuses
// — previously any unknown status silently showed as FAILED (misleading)
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === "SUCCESSFUL")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> SUCCESSFUL
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <Clock className="h-3.5 w-3.5" /> PENDING
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <XCircle className="h-3.5 w-3.5" /> FAILED
      </span>
    );
  // FIX: Generic fallback for unexpected statuses
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      {status}
    </span>
  );
};

const TransactionList: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await getTransactions();
        if (Array.isArray(data)) {
          setTransactions(data);
        } else if (Array.isArray(data?.results)) {
          setTransactions(data.results);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        setError("Failed to load transactions");
        console.error(err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-rose-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {/* FIX: Use navigate(-1) so Back goes to actual previous page */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">
            / Transactions
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Transactions</h1>
            <p className="text-sm text-gray-600 dark:text-white/60">
              Your recent deposits, transfers, withdrawals, and bills.
            </p>
          </div>
        </div>

        {transactions.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-400 dark:text-white/30">No transactions yet.</p>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Mobile card view */}
            <ul className="divide-y divide-gray-200 p-2 sm:hidden dark:divide-white/10">
              {transactions.map((tx) => (
                <li key={tx.reference}>
                  <Link to={`/dashboard/transactions/${tx.reference}`} className="block">
                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5">
                      <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                        <WalletIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{tx.transaction_type}</div>
                          <StatusBadge status={tx.status} />
                        </div>
                        {/* FIX: Format amount */}
                        <div className="mt-1 text-sm">
                          ₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-white/60">
                          <span className="inline-flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5" />
                            {tx.reference}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 text-gray-400 dark:text-white/50" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop table view */}
            <div className="hidden sm:block">
              <table className="min-w-full table-fixed border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600 dark:bg-black/40 dark:text-white/60">
                    <th className="sticky top-0 z-[1] border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10">Type</th>
                    <th className="sticky top-0 z-[1] border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10">Amount</th>
                    <th className="sticky top-0 z-[1] border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10">Status</th>
                    <th className="sticky top-0 z-[1] border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10">Reference</th>
                    <th className="sticky top-0 z-[1] border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10">Timestamp</th>
                    <th className="sticky top-0 z-[1] border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {transactions.map((tx) => (
                    <tr key={tx.reference} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                            <WalletIcon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{tx.transaction_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {/* FIX: Format amount with toLocaleString */}
                        <span className="text-sm font-semibold">
                          ₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{tx.reference}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{new Date(tx.timestamp).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/dashboard/transactions/${tx.reference}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white"
                        >
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-white/10 dark:bg-black/40 dark:text-white/60">
          Click a transaction to view full details, copy references, and see ledger status.
        </div>
      </div>
    </div>
  );
};

export default TransactionList;