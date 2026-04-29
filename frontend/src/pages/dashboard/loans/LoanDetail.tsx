// src/pages/dashboard/loans/LoanDetail.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Loader2, CreditCard, IndianRupee } from "lucide-react";
import { getLoan, payEMI } from "@/libs/core";

interface EMI {
  emi_number: number;
  amount_due: string;
  principal_component: string;
  interest_component: string;
  due_date: string;
  paid_date: string | null;
  status: "DUE" | "PAID" | "OVERDUE";
}

interface Loan {
  uuid: string;
  loan_type: string;
  principal_amount: string;
  interest_rate: string;
  tenure_months: number;
  emi_amount: string;
  outstanding_balance: string;
  status: "PENDING" | "APPROVED" | "ACTIVE" | "CLOSED" | "REJECTED";
  applied_at: string;
  approved_at: string | null;
  next_emi_date: string | null;
  emi_schedule: EMI[];
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  PENDING: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  CLOSED: "border-gray-300 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60",
  APPROVED: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  REJECTED: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
};

const fmt = (val: string) =>
  parseFloat(val).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const LoanDetail: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loadingLoan, setLoadingLoan] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [pin, setPin] = useState("");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState("");
  const [payError, setPayError] = useState("");

  // FIX: Wrap in useCallback so useEffect dependency array is stable
  const fetchLoan = useCallback(async () => {
    if (!uuid) return;
    setLoadingLoan(true);
    try {
      const { data } = await getLoan(uuid);
      setLoan(data);
      setFetchError("");
    } catch (err) {
      // FIX: Proper typing instead of err:any
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setFetchError(axiosErr?.response?.data?.detail || "Could not load loan.");
    } finally {
      setLoadingLoan(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  const handlePayEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError("");
    setPaySuccess("");
    if (!pin || pin.length !== 4) {
      setPayError("Enter your 4-digit transaction PIN.");
      return;
    }
    if (!uuid) return;
    setPaying(true);
    try {
      const { data } = await payEMI({ loan_id: uuid, transaction_pin: pin });
      setPaySuccess(data.message);
      setPin("");
      // FIX: Auto-clear success message after 4s
      setTimeout(() => setPaySuccess(""), 4000);
      await fetchLoan();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setPayError(axiosErr?.response?.data?.detail || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loadingLoan) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (fetchError || !loan) {
    return (
      <div className="page-container flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-sm">{fetchError || "Loan not found."}</p>
        <Link to="/dashboard/loans"
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black">
          Back to Loans
        </Link>
      </div>
    );
  }

  // FIX: Renamed from `e` to `emi` to avoid shadowing event parameter convention
  const nextDue = loan.emi_schedule?.find((emi) => emi.status === "DUE");
  const paidCount = loan.emi_schedule?.filter((emi) => emi.status === "PAID").length ?? 0;
  const progress = loan.tenure_months > 0
    ? Math.round((paidCount / loan.tenure_months) * 100)
    : 0;

  return (
    <div className="page-container">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pt-6 sm:px-6 lg:px-8">
        <Link to="/dashboard/loans"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <span className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">/ Loans / Detail</span>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {/* Summary card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-semibold">
                    {loan.loan_type.charAt(0) + loan.loan_type.slice(1).toLowerCase()} Loan
                  </h1>
                  <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-white/50">ID: {loan.uuid}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[loan.status] ?? ""}`}>
                  {loan.status}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {([
                  ["Principal", `₹${fmt(loan.principal_amount)}`],
                  ["Monthly EMI", `₹${fmt(loan.emi_amount)}`],
                  ["Outstanding", `₹${fmt(loan.outstanding_balance)}`],
                  ["Rate", `${loan.interest_rate}% p.a.`],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-white/10 dark:bg-black/40">
                    <p className="text-xs text-gray-500 dark:text-white/50">{label}</p>
                    <p className="mt-1 font-semibold">{val}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-gray-500 dark:text-white/50">
                  <span>{paidCount} of {loan.tenure_months} EMIs paid</span>
                  <span>{progress}% complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${loan.status === "CLOSED" ? "bg-emerald-500" : "bg-blue-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* EMI Schedule */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-white/10">
                <h2 className="font-semibold">EMI Schedule</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {loan.emi_schedule?.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-white/30">
                    EMI schedule will appear once the loan is approved.
                  </p>
                )}
                {loan.emi_schedule?.map((emi) => (
                  <div key={emi.emi_number} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      {emi.status === "PAID" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : emi.status === "OVERDUE" ? (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-300 dark:text-white/20" />
                      )}
                      <div>
                        <p className="text-sm font-medium">EMI #{emi.emi_number}</p>
                        <p className="text-xs text-gray-500 dark:text-white/40">
                          Due: {new Date(emi.due_date).toLocaleDateString("en-IN")}
                          {emi.paid_date && ` · Paid: ${new Date(emi.paid_date).toLocaleDateString("en-IN")}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">₹{fmt(emi.amount_due)}</p>
                      <p className="text-xs text-gray-400 dark:text-white/30">
                        P: ₹{parseFloat(emi.principal_component).toFixed(0)} + I: ₹{parseFloat(emi.interest_component).toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pay EMI Sidebar */}
          <aside className="lg:col-span-4">
            {loan.status === "ACTIVE" && nextDue && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-500 dark:text-white/50" />
                  <h2 className="font-semibold">Pay Next EMI</h2>
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/40">
                  <p className="text-xs text-gray-500 dark:text-white/50">
                    EMI #{nextDue.emi_number} – Due {new Date(nextDue.due_date).toLocaleDateString("en-IN")}
                  </p>
                  <p className="mt-1 text-2xl font-bold">₹{fmt(nextDue.amount_due)}</p>
                </div>

                {paySuccess && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" /> {paySuccess}
                  </div>
                )}
                {payError && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    <AlertCircle className="h-4 w-4" /> {payError}
                  </div>
                )}

                <form onSubmit={handlePayEMI}>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-white/60">Transaction PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                    value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white" />
                  <button type="submit" disabled={paying || pin.length !== 4}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50 dark:bg-white dark:text-black">
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <IndianRupee className="h-4 w-4" />}
                    {paying ? "Processing…" : "Pay EMI Now"}
                  </button>
                </form>
              </div>
            )}

            {loan.status === "PENDING" && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <Clock className="mb-2 h-5 w-5" />
                <p className="font-semibold">Pending Review</p>
                <p className="mt-1 text-xs">Your loan is under review. You will be notified once approved.</p>
              </div>
            )}

            {loan.status === "CLOSED" && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="mb-2 h-5 w-5" />
                <p className="font-semibold">Loan Fully Repaid</p>
                <p className="mt-1 text-xs">All EMIs have been paid. This loan is now closed.</p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 dark:border-white/10 dark:bg-black/40 dark:text-white/40">
              EMI is debited directly from your wallet. Ensure sufficient balance before the due date to avoid late penalties.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LoanDetail;