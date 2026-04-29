// frontend\src\pages\dashboard\loans\LoanApply.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, IndianRupee, Calendar, Percent, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
// FIX: Use shared lib functions instead of calling apiClient directly
import { calculateEMI, applyForLoan } from "@/libs/core";

const LOAN_TYPES = [
  { value: "PERSONAL", label: "Personal Loan", maxAmount: 500000, defaultRate: 12 },
  { value: "HOME", label: "Home Loan", maxAmount: 5000000, defaultRate: 8.5 },
  { value: "AUTO", label: "Auto Loan", maxAmount: 1500000, defaultRate: 9.5 },
  { value: "EDUCATION", label: "Education Loan", maxAmount: 1000000, defaultRate: 10 },
];

// FIX: Proper interface instead of any
interface EMIPreview {
  emi_amount: string;
  principal_amount: string;
  total_interest: string;
  total_payment: string;
}

const LoanApply: React.FC = () => {
  const navigate = useNavigate();
  const [loanType, setLoanType] = useState("PERSONAL");
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("12");
  const [rate, setRate] = useState("12");
  const [emiPreview, setEmiPreview] = useState<EMIPreview | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const selectedType = LOAN_TYPES.find((t) => t.value === loanType)!;

  // FIX: Clean up auto-navigate timeout on unmount to prevent memory leak
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate("/dashboard/loans"), 2500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleLoanTypeChange = (type: string) => {
    const t = LOAN_TYPES.find((lt) => lt.value === type)!;
    setLoanType(type);
    setRate(String(t.defaultRate));
    setEmiPreview(null);
  };

  const handleCalculateEMI = async () => {
    if (!amount || !tenure || !rate) return;
    // FIX: Validate tenure is a valid number before parsing
    const tenureNum = parseInt(tenure);
    if (isNaN(tenureNum) || tenureNum <= 0) {
      setError("Please enter a valid tenure.");
      return;
    }
    setCalculating(true);
    setError("");
    try {
      // FIX: Use shared lib function
      const { data } = await calculateEMI({
        principal_amount: amount,
        interest_rate: rate,
        tenure_months: tenureNum,
      });
      setEmiPreview(data);
    } catch (err) {
      // FIX: Proper typing instead of err:any
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!amount || !tenure || !rate) {
      setError("All fields are required.");
      return;
    }
    // FIX: Validate tenure
    const tenureNum = parseInt(tenure);
    if (isNaN(tenureNum) || tenureNum <= 0) {
      setError("Please enter a valid tenure.");
      return;
    }
    if (parseFloat(amount) > selectedType.maxAmount) {
      setError(`Maximum amount for ${selectedType.label} is ₹${selectedType.maxAmount.toLocaleString("en-IN")}`);
      return;
    }
    setSubmitting(true);
    try {
      // FIX: Use shared lib function
      const { data } = await applyForLoan({
        loan_type: loanType,
        principal_amount: amount,
        interest_rate: rate,
        tenure_months: tenureNum,
      });
      setSuccess(
        `Application submitted! Loan ID: ${data.loan_id}. EMI: ₹${parseFloat(data.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/month`,
      );
      // FIX: Navigation is handled by useEffect cleanup above — no setTimeout here
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Application failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pt-6 sm:px-6 lg:px-8">
        <Link to="/dashboard/loans"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <span className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">/ Loans / Apply</span>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Apply for a Loan</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
            Fill in your loan details. Your application will be reviewed within 24 hours.
          </p>
        </div>

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={handleApply} className="space-y-5 lg:col-span-3">
            {/* Loan Type */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-white/80">Loan Type</h2>
              <div className="grid grid-cols-2 gap-3">
                {LOAN_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => handleLoanTypeChange(t.value)}
                    className={`rounded-xl border p-3 text-left text-sm transition ${
                      loanType === t.value
                        ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400/50 dark:bg-blue-500/10 dark:text-blue-300"
                        : "border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5"
                    }`}>
                    <div className="font-semibold">{t.label}</div>
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                      Up to ₹{(t.maxAmount / 100000).toFixed(0)}L @ {t.defaultRate}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Details */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-white/80">Loan Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-white/60">Loan Amount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="number" value={amount}
                      onChange={(e) => { setAmount(e.target.value); setEmiPreview(null); }}
                      placeholder={`Max ₹${selectedType.maxAmount.toLocaleString("en-IN")}`}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-white/60">Tenure (Months)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="number" value={tenure} min={1} max={360}
                      onChange={(e) => { setTenure(e.target.value); setEmiPreview(null); }}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {Math.round((parseFloat(tenure || "0") / 12) * 10) / 10} years
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-white/60">Interest Rate (% per annum)</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="number" value={rate} step={0.1}
                      onChange={(e) => { setRate(e.target.value); setEmiPreview(null); }}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={handleCalculateEMI}
                  disabled={!amount || !tenure || !rate || calculating}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-white">
                  {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  Calculate EMI
                </button>
                <button type="submit" disabled={submitting || !amount}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-black">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Submitting..." : "Apply for Loan"}
                </button>
              </div>
            </div>
          </form>

          {/* EMI Preview */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-gray-500 dark:text-white/50" />
                <h2 className="text-sm font-semibold">EMI Preview</h2>
              </div>
              {emiPreview ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/40">
                    <p className="text-xs text-gray-500 dark:text-white/50">Monthly EMI</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                      ₹{parseFloat(emiPreview.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {([
                    ["Principal", emiPreview.principal_amount],
                    ["Total Interest", emiPreview.total_interest],
                    ["Total Payment", emiPreview.total_payment],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-white/50">{label}</span>
                      <span className="font-semibold">
                        ₹{parseFloat(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
                    EMI = P × r × (1+r)^n / ((1+r)^n − 1)<br />Reducing balance method
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-center text-sm text-gray-400 dark:text-white/30">
                  Enter loan details and click<br />"Calculate EMI" to preview
                </div>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 dark:border-white/10 dark:bg-black/40 dark:text-white/40">
              Applications are reviewed within 24 hours. Once approved, EMI schedule is auto-generated.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanApply;