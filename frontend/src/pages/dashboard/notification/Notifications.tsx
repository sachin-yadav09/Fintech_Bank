// frontend\src\pages\dashboard\notification\Notifications.tsx
import { CheckCircle2, ArrowRight, Check, AlertCircle, Bell, Loader2 } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/libs/core";
import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import { toast } from "sonner";
import type { NotificationItem } from "@/types";

const Notifications = () => {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  // FIX: Add loading and error states — previously missing
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      const { data } = await getNotifications();
      setItems(data);
    } catch {
      // FIX: Set error state so user gets feedback instead of blank page
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkOne(id: number) {
    try {
      await markNotificationRead(id);
      // FIX: Update local state instead of full refetch
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      // FIX: Update local state instead of full refetch — avoids unnecessary API call
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("Marked all notifications as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  }

  // FIX: Choose icon based on notification type instead of always showing green checkmark
  function NotificationIcon({ type }: { type?: string }) {
    if (type === "ERROR" || type === "FAILED") {
      return <AlertCircle className="h-5 w-5 text-rose-500" />;
    }
    if (type === "WARNING") {
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  }

  return (
    <div className="page-container">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Notifications</h1>
            <p className="text-sm text-gray-600 dark:text-white/60">
              Latest updates on your transactions and activity.
            </p>
          </div>
          <button
            onClick={handleMarkAll}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            title="Mark all as read"
          >
            <Check className="h-4 w-4" />
            Mark all as read
          </button>
        </div>

        {/* FIX: Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* FIX: Error state */}
        {!loading && error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* FIX: Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
            <Bell className="mb-4 h-10 w-10 text-gray-300 dark:text-white/20" />
            <p className="text-sm font-medium text-gray-500 dark:text-white/50">No notifications yet</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-white/30">
              You're all caught up!
            </p>
          </div>
        )}

        {/* Notification list */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-white/5 ${
                  n.is_read
                    ? "border-gray-200 dark:border-white/10"
                    : "border-blue-200 dark:border-blue-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                    {/* FIX: Dynamic icon based on notification type */}
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">{n.title}</h3>
                      <span className="text-xs text-gray-500 dark:text-white/60">
                        {new Date(n.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-white/70">{n?.message}</p>
                    <div className="mt-2 flex items-center gap-3">
                      {n?.tx_reference && (
                        <Link
                          to={`/dashboard/transactions/${n?.tx_reference}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 underline-offset-4 hover:underline dark:text-white"
                        >
                          View transaction <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkOne(n.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-white/70 dark:hover:text-white"
                        >
                          <Check className="h-3 w-3" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-white/60">
          You're all caught up 🎉
        </div>
      </div>
    </div>
  );
};

export default Notifications;