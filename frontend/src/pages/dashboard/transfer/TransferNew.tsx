// frontend\src\pages\dashboard\transfer\TransferNew.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, User, Wallet, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { transferFunds, getBeneficiaries } from "@/libs/core";

// FIX: Interface now matches actual API response shape from getBeneficiaries
// Previously had wallet_id and nickname at top level — they don't exist there.
interface RawBeneficiary {
  id: number;
  beneficiary_user?: {
    username?: string;
    email?: string;
    wallet?: { wallet_id?: string };
  };
  created_at?: string;
}

interface Beneficiary {
  id: number;
  wallet_id: string;
  nickname: string;
}

// FIX: Normalize raw API response — same logic as Beneficiaries.tsx
function normalizeBeneficiary(raw: RawBeneficiary): Beneficiary {
  const user = raw?.beneficiary_user || {};
  return {
    id: raw.id,
    nickname: user?.username || user?.email?.split("@")[0] || "Unknown",
    wallet_id: user?.wallet?.wallet_id || "",
  };
}

const TransferNew: React.FC = () => {
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getBeneficiaries()
      // FIX: Normalize raw beneficiary data before storing
      .then(({ data }) => setBeneficiaries((data || []).map(normalizeBeneficiary)))
      .catch(() => setBeneficiaries([]));
  }, []);

  // FIX: Clean up auto-navigate timeout on unmount to prevent memory leak
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate("/dashboard/transactions"), 2000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!walletId.trim() || !amount || !transactionPin) {
      setError("All fields are required.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (transactionPin.length !== 4) {
      setError("Transaction PIN must be 4 digits.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await transferFunds({
        wallet_id: walletId.trim(),
        amount: amountNum,
        transaction_pin: transactionPin,
        save_beneficiary: saveBeneficiary,
      });
      setSuccess(`Transfer successful! Reference: ${data.transaction_reference}`);
      setWalletId("");
      setAmount("");
      setTransactionPin("");
      setSaveBeneficiary(false);
      // FIX: Navigation handled by useEffect above — no inline setTimeout
    } catch (err) {
      // FIX: Proper typing instead of err:any
      const axiosErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const data = axiosErr?.response?.data;
      setError(data?.error || data?.detail || "Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm text-gray-500 dark:text-white/60">
            / Transfers / New Transfer
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Transfer</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Send money to another FinanceOS wallet instantly
          </p>
        </div>

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Quick Send — only shown if beneficiaries loaded with valid wallet_ids */}
          {beneficiaries.filter((b) => b.wallet_id).length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-white/80">
                Quick Send
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {beneficiaries
                  .filter((ben) => ben.wallet_id)
                  .slice(0, 6)
                  .map((ben) => (
                    <button
                      key={ben.id}
                      onClick={() => setWalletId(ben.wallet_id)}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        walletId === ben.wallet_id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:border-indigo-400/50 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20">
                          <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{ben.nickname}</p>
                          <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                            {ben.wallet_id}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Transfer Form */}
          <form
            onSubmit={handleTransfer}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
          >
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recipient Wallet ID
                </label>
                <div className="relative">
                  <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    placeholder="Enter wallet ID"
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm font-mono text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-8 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Transaction PIN
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="password"
                    value={transactionPin}
                    onChange={(e) =>
                      setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="4-digit PIN"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveBeneficiary"
                  checked={saveBeneficiary}
                  onChange={(e) => setSaveBeneficiary(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                />
                <label htmlFor="saveBeneficiary" className="text-sm text-gray-700 dark:text-gray-300">
                  Save as beneficiary
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Processing..." : "Send Money"}
            </button>
          </form>

          {/* Info box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            <p className="mb-2 font-semibold">Transfer Information</p>
            <ul className="space-y-1">
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Transfers are instant and free within FinanceOS</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Double-check the wallet ID before sending</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Your transaction PIN is required for security</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TransferNew;