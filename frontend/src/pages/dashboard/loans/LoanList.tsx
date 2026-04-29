// frontend\src\pages\dashboard\loans\LoanList.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, ChevronRight, AlertCircle, Clock, CheckCircle2, XCircle, Loader2, HandCoins,
} from "lucide-react";
// FIX: Use shared lib function instead of calling apiClient directly
import { getLoans } from "@/libs/core";
import type { Loan } from "@/types";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "Pending Review",
    color: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  APPROVED: {
    label: "Approved",
    color: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  ACTIVE: {
    label: "Active",
    color: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  CLOSED: {
    label: "Closed",
    color: "border-gray-300 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  REJECTED: {
    label: "Rejected",
    color: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const LoanList: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // FIX: Use shared lib function
        const { data } = await getLoans();
        setLoans(data);
      } catch (err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr?.response?.data?.detail || "Failed to load loans.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Loans</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
            Manage your loan applications and EMI payments.
          </p>
        </div>
        <Link
          to="/dashboard/loans/apply"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 dark:bg-white dark:text-black"
        >
          <Plus className="h-4 w-4" /> Apply for Loan
        </Link>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      {!loading && error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {!loading && !error && loans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
          <HandCoins className="mb-4 h-10 w-10 text-gray-300 dark:text-white/20" />
          <p className="text-sm font-medium text-gray-500 dark:text-white/50">No loans yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-white/30">
            Apply for a personal, home, auto, or education loan.
          </p>
          <Link
            to="/dashboard/loans/apply"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black"
          >
            <Plus className="h-4 w-4" /> Apply Now
          </Link>
        </div>
      )}

      {!loading && loans.length > 0 && (
        <div className="space-y-4">
          {loans.map((loan) => {
            // FIX: Provide generic fallback instead of silently showing "Pending Review"
            const st = statusConfig[loan.status] ?? {
              label: loan.status,
              color: "border-gray-300 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60",
              icon: null,
            };

            // FIX: Clamp progress to 0–100 to prevent negative width on bar
            const rawProgress =
              loan.status === "ACTIVE" || loan.status === "CLOSED"
                ? Math.round(
                    (1 -
                      parseFloat(loan.outstanding_balance) /
                        parseFloat(loan.principal_amount)) *
                      100,
                  )
                : 0;
            const progress = Math.max(0, Math.min(100, rawProgress));

            return (
              <Link
                key={loan.uuid}
                to={`/dashboard/loans/${loan.uuid}`}
                className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">
                        {/* FIX: Ensure correct capitalisation regardless of API casing */}
                        {loan.loan_type.charAt(0).toUpperCase() +
                          loan.loan_type.slice(1).toLowerCase()}{" "}
                        Loan
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    {/* FIX: Guard against null/invalid applied_at date */}
                    <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                      Applied{" "}
                      {loan.applied_at
                        ? new Date(loan.applied_at).toLocaleDateString("en-IN")
                        : "—"}{" "}
                      &nbsp;·&nbsp; {loan.tenure_months} months &nbsp;·&nbsp;{" "}
                      {loan.interest_rate}% p.a.
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 text-gray-400 dark:text-white/30" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white/50">Principal</p>
                    <p className="mt-0.5 font-semibold">
                      ₹{parseFloat(loan.principal_amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white/50">Monthly EMI</p>
                    <p className="mt-0.5 font-semibold">
                      ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white/50">Outstanding</p>
                    <p className="mt-0.5 font-semibold">
                      ₹{parseFloat(loan.outstanding_balance).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {(loan.status === "ACTIVE" || loan.status === "CLOSED") && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-white/50">
                      <span>Repayment Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${loan.status === "CLOSED" ? "bg-emerald-500" : "bg-blue-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {loan.next_emi_date && loan.status === "ACTIVE" && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    Next EMI due:{" "}
                    {new Date(loan.next_emi_date).toLocaleDateString("en-IN")}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoanList;