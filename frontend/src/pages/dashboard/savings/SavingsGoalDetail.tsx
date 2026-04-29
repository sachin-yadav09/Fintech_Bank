// frontend\src\pages\dashboard\savings\SavingsGoalDetail.tsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, PiggyBank, PlusCircle, X, Wallet, IndianRupee } from "lucide-react";
import { getSavingsGoal, depositToSavingsGoal, withdrawFromSavingsGoal } from "@/libs/core";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { SavingsGoalDetailData } from "@/types";

const SavingsGoalDetail = () => {
  const { uuid } = useParams<{ uuid: string }>();

  const [loading, setLoading] = useState(true);
  // FIX: err state is now actually rendered in JSX
  const [err, setErr] = useState("");
  const [goal, setGoal] = useState<SavingsGoalDetailData | null>(null);
  const [wallet, setWallet] = useState<{ wallet_id: string; balance: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function fetchGoal() {
    if (!uuid) return;
    try {
      setLoading(true);
      setErr("");
      const { data } = await getSavingsGoal(uuid);
      setGoal(data);
      setWallet(data?.wallet ?? null);
    } catch {
      // FIX: Set error state so user sees feedback
      setErr("Failed to load savings goal. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGoal();
  }, [uuid]);

  async function handleDeposit() {
    if (!uuid || !amount) {
      toast.warning("Enter an amount");
      return;
    }
    try {
      setBusy(true);
      await depositToSavingsGoal({ uuid, amount });
      setAmount("");
      setModalOpen(false);
      await fetchGoal();
      toast.success("Deposit successful");
    } catch (error) {
      // FIX: Show error to user instead of swallowing silently
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast.error(axiosErr?.response?.data?.error || "Deposit failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!uuid) return;
    // FIX: Confirm before destructive full-balance withdrawal
    if (!window.confirm("Withdraw full balance from this goal? This action cannot be undone.")) {
      return;
    }
    try {
      setBusy(true);
      await withdrawFromSavingsGoal({ uuid });
      await fetchGoal();
      toast.success("Withdrawal successful");
    } catch {
      toast.error("Withdrawal failed. You may not be able to withdraw yet.");
    } finally {
      setBusy(false);
    }
  }

  // FIX: Show error state
  if (!loading && err) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="font-semibold">{err}</p>
          <Link to="/dashboard/savings" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black">
            Back to Savings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/savings"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setModalOpen(true)}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            <PlusCircle className="h-4 w-4" /> Deposit
          </button>

          {/* FIX: Disable withdraw button while any operation is in progress */}
          <button
            onClick={handleWithdraw}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
          >
            {busy ? "Processing..." : "Withdraw"}
          </button>
        </div>

        {/* Deposit Modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#101113]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deposit-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="deposit-title" className="text-base font-semibold">
                    Deposit into "{goal?.goal?.name}"
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-white/60">
                    Move money from your wallet to this goal.
                  </p>
                </div>
              </div>

              {/* FIX: Format wallet balance with toLocaleString */}
              <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-white/10 dark:bg-black/40">
                <div className="flex items-center gap-2 text-gray-700 dark:text-white/80">
                  <Wallet className="h-4 w-4" />
                  <span>Wallet balance:</span>
                  <span className="font-semibold">
                    ₹{wallet?.balance != null
                      ? Number(wallet.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Amount</label>
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      min="1"
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {busy ? "Processing…" : "Deposit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Goal summary card */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 dark:border-white/10 dark:border-t-white" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold">{goal?.goal?.name}</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
                  Target: ₹{Number(goal?.goal?.target_amount).toLocaleString("en-IN")} • Saved: ₹
                  {Number(goal?.goal?.current_amount).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-600 dark:bg-white"
                style={{
                  width: `${Math.min(100, Math.max(0, goal?.goal?.progress_percentage ?? 0))}%`,
                }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-white/60">
              {Math.round(goal?.goal?.progress_percentage ?? 0)}% completed • Target date:{" "}
              {goal?.goal?.target_date
                ? new Date(goal.goal.target_date).toLocaleDateString("en-IN")
                : "No target date"}
            </div>
          </div>

          {/* Transactions table */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Goal Transactions</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              {(!goal?.transactions || goal.transactions.length === 0) ? (
                <div className="py-10 text-center text-sm text-gray-400 dark:text-white/30">
                  No transactions yet.
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-white/10 dark:text-white/60">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goal.transactions.map((tx) => (
                      <tr key={tx.reference} className="border-t border-gray-100 dark:border-white/10">
                        <td className="px-4 py-3">{new Date(tx.timestamp).toLocaleString()}</td>
                        {/* FIX: Format kind for display instead of raw uppercase */}
                        <td className="px-4 py-3">
                          {tx?.kind
                            ? tx.kind.charAt(0).toUpperCase() + tx.kind.slice(1).toLowerCase()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                          + ₹{Number(tx?.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-black text-white px-2 py-0.5 text-xs font-medium">
                            {tx?.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SavingsGoalDetail;