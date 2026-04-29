import React from "react";
import { Link } from "react-router-dom";
import {
  Wallet as WalletIcon,
  PiggyBank,
  Users,
  ArrowRight,
  Send,
  Plus,
  TrendingUp,
  TrendingDown,
  Bell,
} from "lucide-react";
import { getOverview } from "@/libs/core";
import { useAuth } from "@/hooks/useAuth";

interface SavingsGoal {
  uuid: string;
  name: string;
  target: string;
  current: string;
}

interface Transaction {
  reference: string;
  transaction_type: string;
  amount: string;
  status: string;
  timestamp: string;
  sender?: any;
  receiver?: any;
}

interface OverviewData {
  wallet: { balance: string; wallet_id: string } | null;
  beneficiaries: number;
  unread_notifications: number;
  recent_transactions: Transaction[];
  savings_goals: SavingsGoal[];
}

const Overview: React.FC = () => {
  const { user } = useAuth();

  const isCredit = (tx: Transaction): boolean => {
    const t = tx.transaction_type.toUpperCase();
    if (t === "DEPOSIT" || (t === "SAVINGS" && !t.includes("WITHDRAWAL"))) return true;
    if (t === "TRANSFER") {
      if (typeof tx.receiver === "string") return tx.receiver === user?.username;
      if (tx.receiver && typeof tx.receiver === "object") {
         return tx.receiver.username === user?.username || tx.receiver.email === user?.email;
      }
    }
    return false;
  };
  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await getOverview();
        setOverview(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center text-sm text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  const balance = overview?.wallet?.balance
    ? Number(overview.wallet.balance).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })
    : "0.00";

  const progress = (g: SavingsGoal): number => {
    const current = Number(g.current) || 0;
    const target = Number(g.target) || 0;
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="page-container space-y-6">
      {/* Balance Card */}
      <div className="card-blue">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100">Total Balance</p>
            <h2 className="mt-1 text-4xl font-bold">₹{balance}</h2>
            <p className="mt-1 text-xs text-blue-100">
              Wallet ID: {overview?.wallet?.wallet_id ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-white/20 p-2">
            <WalletIcon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-3">
          <Link
            to="/dashboard/transfers/new"
            className="quick-action !bg-white/10 !border-white/10 !text-white hover:!bg-white/20"
          >
            <Send className="h-5 w-5" />
            <span className="text-xs font-medium">Send</span>
          </Link>
          <Link
            to="/dashboard/fund"
            className="quick-action !bg-white/10 !border-white/10 !text-white hover:!bg-white/20"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Add</span>
          </Link>
          <Link
            to="/dashboard/savings/new"
            className="quick-action !bg-white/10 !border-white/10 !text-white hover:!bg-white/20"
          >
            <PiggyBank className="h-5 w-5" />
            <span className="text-xs font-medium">Save</span>
          </Link>
          <Link
            to="/dashboard/loans/apply"
            className="quick-action !bg-white/10 !border-white/10 !text-white hover:!bg-white/20"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-medium">Loan</span>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-hover flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-500">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Notifications</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.unread_notifications ?? 0}
            </p>
          </div>
        </div>
        <div className="card-hover flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Savings Goals</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.savings_goals?.length ?? 0}
            </p>
          </div>
        </div>
        <div className="card-hover flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Beneficiaries</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.beneficiaries ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Recent Transactions
          </h2>
          <Link
            to="/dashboard/transactions"
            className="btn-ghost text-blue-600"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!overview.recent_transactions ||
        overview.recent_transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No recent transactions.
          </p>
        ) : (
          <div className="space-y-3">
            {overview.recent_transactions.slice(0, 5).map((t) => (
              <Link
                key={t.reference}
                to={`/dashboard/transactions/${t.reference}`}
                className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-gray-50 dark:text-white dark:hover:text-gray-300 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isCredit(t)
                        ? "bg-green-50 text-green-500"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {isCredit(t) ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-inherit">
                      {t.transaction_type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(t.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={isCredit(t) ? "tx-credit" : "tx-debit"}>
                  {isCredit(t) ? "+" : "-"}₹{Number(t.amount).toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Savings Goals */}
      {overview.savings_goals && overview.savings_goals.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Savings Goals</h2>
            <Link to="/dashboard/savings" className="btn-ghost text-blue-600">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.savings_goals.slice(0, 3).map((g) => (
              <Link
                key={g.uuid}
                to={`/dashboard/savings/${g.uuid}`}
                className="card-flat hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900 dark:text-white">{g.name}</p>
                  <span className="text-sm font-bold text-blue-600">
                    {progress(g)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${progress(g)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  ₹{Number(g.current).toLocaleString("en-IN")} of ₹
                  {Number(g.target).toLocaleString("en-IN")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
