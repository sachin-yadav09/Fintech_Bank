// frontend\src\pages\dashboard\savings\SavingsGoalNew.tsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, PiggyBank, Calendar, Target, Coins, Info } from "lucide-react";
import { createSavingsGoal } from "@/libs/core";
import { toast } from "sonner";

const SavingsGoalNew: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Goal name is required.");
      return;
    }
    if (!targetAmount.trim() || Number(targetAmount) <= 0) {
      setErrorMsg("Target amount must be greater than 0.");
      return;
    }
    // FIX: Validate that target date is in the future
    if (targetDate && new Date(targetDate) <= new Date()) {
      setErrorMsg("Target date must be in the future.");
      return;
    }

    try {
      setSubmitting(true);

      // FIX: Proper type instead of `any`
      const payload: {
        name: string;
        target_amount: string;
        target_date?: string;
      } = {
        name: name.trim(),
        target_amount: targetAmount.trim(),
      };

      if (targetDate) payload.target_date = targetDate;

      const { data } = await createSavingsGoal(payload);

      // FIX: Use toast instead of setSuccessMsg which was never visible
      // (the component navigated away before the state update rendered)
      toast.success("Goal created successfully!");

      // FIX: Guard against undefined uuid before navigating
      if (data?.uuid) {
        navigate(`/dashboard/savings/${data.uuid}`);
      } else {
        navigate("/dashboard/savings");
      }
    } catch (error) {
      // FIX: Show error to user instead of swallowing silently
      const axiosErr = error as { response?: { data?: { error?: string; detail?: string } } };
      const data = axiosErr?.response?.data;
      setErrorMsg(data?.error || data?.detail || "Failed to create goal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">
            / Savings / New Goal
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left panel: tips */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Saving Goals</div>
                  <div className="text-xs text-gray-600 dark:text-white/60">Plan and track your savings.</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-600 dark:border-white/10 dark:text-white/60">
                <p>Create a goal by setting a target amount and date. Add funds manually or automate deposits.</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Pick a descriptive name (e.g. "Vacation 2025").</li>
                  <li>Target amount should be realistic.</li>
                  <li>You can start with a current balance or 0.</li>
                  <li>Set a future target date to stay accountable.</li>
                </ul>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-white/10 dark:bg-black/40 dark:text-white/80">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4" />
                  <p>Your goal will appear on your dashboard where you can track progress and deposit anytime.</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right panel: form */}
          <section className="lg:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5">
                <h1 className="text-lg font-semibold">Create a new Saving Goal</h1>
                <p className="text-sm text-gray-600 dark:text-white/60">Set your goal and start tracking progress.</p>
              </div>

              {errorMsg && (
                <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {errorMsg}
                </div>
              )}

              <form className="space-y-5" noValidate onSubmit={handleCreate}>
                {/* Name */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Goal name</label>
                  <div className="relative">
                    <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text"
                      placeholder="e.g. Emergency Fund"
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white dark:placeholder:text-white/50"
                    />
                  </div>
                </div>

                {/* Target amount */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Target amount</label>
                  <div className="relative">
                    <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <input
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      type="number"
                      // FIX: Add min="1" to prevent negative values at browser level
                      min="1"
                      placeholder="1000"
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                </div>

                {/* Target date */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">
                    Target date <span className="text-gray-400 font-normal">(optional — must be in the future)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <input
                      type="date"
                      value={targetDate}
                      // FIX: Set min to today so browser also blocks past dates
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="text-xs text-gray-600 dark:text-white/60">You can always update or deposit later.</div>
                  <div className="flex gap-2">
                    <Link
                      to="/dashboard/savings"
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-black"
                    >
                      {submitting ? "Creating..." : "Create Goal"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SavingsGoalNew;