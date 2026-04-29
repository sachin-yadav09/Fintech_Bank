// frontend\src\pages\dashboard\savings\SavingGoalList.tsx
import React from "react";
import { Link } from "react-router-dom";
import { PiggyBank, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { getSavingsGoals } from "@/libs/core";
import { useEffect, useState } from "react";

type Goal = {
  uuid: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  progress_percentage: number;
  created_at: string;
};

const SavingsGoalsList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await getSavingsGoals();
        setGoals(data);
      } catch {
        setError("Failed to load goals.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your Saving Goals</h1>
        <Link
          to="/dashboard/savings/new"
          className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black"
        >
          + New Goal
        </Link>
      </div>

      {/* FIX: Loading state UI — previously missing */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* FIX: Error state UI — was declared but never rendered */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* FIX: Empty state UI — previously showed blank grid */}
      {!loading && !error && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
          <PiggyBank className="mb-4 h-10 w-10 text-gray-300 dark:text-white/20" />
          <p className="text-sm font-medium text-gray-500 dark:text-white/50">No savings goals yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-white/30">
            Create your first goal and start saving.
          </p>
          <Link
            to="/dashboard/savings/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black"
          >
            + New Goal
          </Link>
        </div>
      )}

      {/* Grid of cards */}
      {!loading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.max(0, Math.min(100, Math.round(g.progress_percentage)));

            return (
              <div
                key={g.uuid}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-medium">{g?.name}</h2>
                    {/* FIX: Consistent toLocaleString formatting for target_amount */}
                    <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
                      Target: ₹{Number(g.target_amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-black dark:bg-white"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-white/60">
                  <span>₹{g.current_amount.toLocaleString("en-IN")} saved</span>
                  <span>{pct}%</span>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {/* FIX: Null guard + formatted date for target_date */}
                    {g.target_date
                      ? new Date(g.target_date).toLocaleDateString("en-IN")
                      : "No target date"}
                  </span>
                  <Link
                    to={`/dashboard/savings/${g.uuid}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:underline dark:text-white"
                  >
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavingsGoalsList;