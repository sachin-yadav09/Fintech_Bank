// src/pages/dashboard/bank/BankAccounts.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BankAccount } from "@/libs/user";
import { getBankAccounts, deleteBankAccount, setPrimaryAccount } from "@/libs/user";

const BANK_COLORS: Record<string, string> = {
  SBI: "from-blue-600 to-blue-700",
  HDFC: "from-red-600 to-red-700",
  ICICI: "from-orange-600 to-orange-700",
  AXIS: "from-purple-600 to-purple-700",
  KOTAK: "from-red-500 to-pink-600",
  YES: "from-green-600 to-green-700",
  PNB: "from-indigo-600 to-indigo-700",
  BOB: "from-orange-500 to-yellow-600",
  CANARA: "from-teal-600 to-teal-700",
  OTHER: "from-gray-600 to-gray-700",
};

const BANK_NAMES: Record<string, string> = {
  SBI: "State Bank of India",
  HDFC: "HDFC Bank",
  ICICI: "ICICI Bank",
  AXIS: "Axis Bank",
  KOTAK: "Kotak Mahindra",
  YES: "Yes Bank",
  PNB: "Punjab National Bank",
  BOB: "Bank of Baroda",
  CANARA: "Canara Bank",
  OTHER: "Other",
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    VERIFIED: "bg-green-500/20 text-green-400 border-green-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
};

const BankAccounts: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchAccounts = async () => {
    try {
      // FIX: Use shared lib function instead of calling apiClient directly
      const data = await getBankAccounts();
      setAccounts(data);
    } catch {
      setError("Failed to load bank accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this bank account?")) return;
    // FIX: Clear previous error before each operation
    setError("");
    setDeleting(id);
    try {
      // FIX: Use shared lib function
      await deleteBankAccount(id);
      setAccounts((a) => a.filter((acc) => acc.id !== id));
    } catch {
      setError("Failed to remove account.");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetPrimary = async (id: string) => {
    // FIX: Clear previous error before each operation
    setError("");
    setSettingPrimary(id);
    try {
      // FIX: Use shared lib function
      await setPrimaryAccount(id);
      await fetchAccounts();
    } catch (err) {
      // FIX: Proper typing instead of err:any
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || "Failed to set primary account.");
    } finally {
      setSettingPrimary(null);
    }
  };

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bank Accounts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""} linked
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard/bank/link")}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Link Account
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800/60 rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-gray-400 font-medium mb-1">No bank accounts linked</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-5">Link a bank account to enable withdrawals</p>
            <button
              onClick={() => navigate("/dashboard/bank/link")}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Link Bank Account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                <div className={`bg-gradient-to-r ${BANK_COLORS[account.bank_name] || BANK_COLORS.OTHER} p-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {BANK_NAMES[account.bank_name] || account.bank_name}
                      </p>
                      <p className="text-white/70 text-xs font-mono">{account.account_number_masked}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={account.verification_status} />
                    {account.is_primary && (
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-lg">Primary</span>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Account Holder</p>
                      <p className="text-gray-900 dark:text-gray-200 font-medium truncate">{account.account_holder_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">IFSC Code</p>
                      <p className="text-gray-900 dark:text-gray-200 font-medium font-mono">{account.ifsc_code}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Registered Mobile</p>
                      <p className="text-gray-900 dark:text-gray-200 font-medium">{account.registered_mobile}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Added On</p>
                      <p className="text-gray-900 dark:text-gray-200 font-medium">
                        {new Date(account.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    {!account.is_primary && account.verification_status === "VERIFIED" && (
                      <button
                        onClick={() => handleSetPrimary(account.id)}
                        disabled={!!settingPrimary}
                        className="flex-1 text-indigo-400 hover:text-indigo-300 text-xs font-medium py-1.5 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10 transition-all disabled:opacity-50"
                      >
                        {settingPrimary === account.id ? "Setting…" : "Set Primary"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(account.id)}
                      disabled={!!deleting}
                      className="flex-1 text-red-400 hover:text-red-300 text-xs font-medium py-1.5 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      {deleting === account.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BankAccounts;