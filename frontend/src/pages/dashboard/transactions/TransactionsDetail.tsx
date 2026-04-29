// frontend\src\pages\dashboard\transactions\TransactionsDetail.tsx
import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, Wallet as WalletIcon,
  User2, Hash, Link as LinkIcon, CalendarClock, Shield, Copy,
} from "lucide-react";
import { getTransaction } from "@/libs/core";

// FIX: Proper interface instead of `any`
interface Transaction {
  reference: string;
  external_reference?: string | null;
  transaction_type: string;
  amount: string;
  status: "SUCCESSFUL" | "PENDING" | "FAILED" | string;
  timestamp: string;
  wallet_id?: string;
  sender?: { username?: string; email?: string };
  receiver?: { username?: string; email?: string };
}

const TransactionDetail: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  // FIX: Typed state instead of any
  const [tx, setTx] = React.useState<Transaction | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  useEffect(() => {
    (async () => {
      // FIX: Guard undefined reference before making API call
      if (!reference) {
        setError("Invalid transaction reference.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const { data } = await getTransaction(reference);
        setTx(data);
      } catch (err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const msg = axiosErr?.response?.data?.detail || "Could not load transaction.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [reference]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 dark:border-white/10 dark:border-t-white" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <XCircle className="mx-auto mb-3 h-8 w-8" />
            <p className="font-semibold">{error || "Transaction not found."}</p>
            <Link
              to="/dashboard/transactions"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Transactions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // FIX: Guard null/undefined before writing to clipboard
  const copyToClipboard = (text: string | null | undefined) =>
    navigator.clipboard.writeText(text ?? "").catch(() => {});

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/transactions"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">
            / Transactions / Detail
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Summary card */}
          <section className="lg:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                    <WalletIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">{tx.transaction_type}</h1>
                    <div className="mt-0.5 text-sm text-gray-600 dark:text-white/60">
                      Reference: <span className="font-mono">{tx.reference}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200/80">
                    <Shield className="h-3.5 w-3.5" />
                    {tx.transaction_type}
                  </span>

                  {tx.status === "SUCCESSFUL" && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> SUCCESSFUL
                    </span>
                  )}
                  {tx.status === "PENDING" && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      <Clock className="h-3.5 w-3.5" /> PENDING
                    </span>
                  )}
                  {tx.status === "FAILED" && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                      <XCircle className="h-3.5 w-3.5" /> FAILED
                    </span>
                  )}
                  {/* FIX: Fallback badge for unknown statuses */}
                  {!["SUCCESSFUL", "PENDING", "FAILED"].includes(tx.status) && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                      {tx.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount row */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-black/40">
                <div className="text-xs text-gray-600 dark:text-white/60">Amount</div>
                {/* FIX: Format amount with toLocaleString */}
                <div className="text-2xl font-semibold tracking-tight">
                  ₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                    <Hash className="h-4 w-4" /> Reference
                  </span>
                  <span className="font-mono text-sm">{tx.reference ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                    <LinkIcon className="h-4 w-4" /> External Reference
                  </span>
                  <span className="font-mono text-sm">{tx.external_reference || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                    <WalletIcon className="h-4 w-4" /> Wallet ID
                  </span>
                  <span className="font-mono text-sm">{tx.wallet_id ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                    <User2 className="h-4 w-4" /> Sender
                  </span>
                  <span className="text-sm">{tx.sender?.username || tx.sender?.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                    <User2 className="h-4 w-4" /> Receiver
                  </span>
                  <span className="text-sm">{tx.receiver?.username || tx.receiver?.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                    <CalendarClock className="h-4 w-4" /> Timestamp
                  </span>
                  <span className="text-sm">
                    {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-white/10 dark:bg-black/40 dark:text-white/60">
              Keep your reference IDs safe. If you contact support, share the{" "}
              <span className="font-mono">reference</span> and{" "}
              <span className="font-mono">external_reference</span>.
            </div>
          </section>

          {/* Right: Quick actions */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Payment Integrity</div>
                  <div className="text-xs text-gray-600 dark:text-white/60">
                    Status and references verified from the ledger.
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(tx.reference)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Reference
                </button>
                {/* FIX: Only show copy button if external_reference exists */}
                {tx.external_reference && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tx.external_reference)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy External Ref
                  </button>
                )}
                <Link
                  to="/dashboard/transactions"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 dark:bg-white dark:text-black"
                >
                  Back to Transactions
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail;