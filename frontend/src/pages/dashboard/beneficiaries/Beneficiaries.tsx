// frontend\src\pages\dashboard\beneficiaries\Beneficiaries.tsx
import { Link } from "react-router-dom";
import { UserPlus, Trash2, Hash, ShieldCheck, X, Plus } from "lucide-react";
import { getBeneficiaries, deleteBeneficiary, addBeneficiary } from "@/libs/core";
import React, { useEffect } from "react";
import { toast } from "sonner";

type BeneficiaryCard = {
  id: number | string;
  name: string;
  email?: string;
  wallet?: string;
  created_at?: string;
};

function normalize(raw: any): BeneficiaryCard {
  const user = raw?.beneficiary_user || {};
  const name = user?.username || user?.email?.split?.("@")?.[0] || raw?.name || "Unknown";
  const wallet = user?.wallet?.wallet_id || raw?.wallet_id || "";
  return {
    id: raw?.id ?? `${name}-${wallet}`,
    name,
    email: user?.email || "",
    wallet,
    created_at: raw?.created_at || "",
  };
}

const Beneficiaries = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [items, setItems] = React.useState<BeneficiaryCard[]>([]);

  async function load() {
    try {
      setLoading(true);
      const { data } = await getBeneficiaries();
      setItems(data?.map(normalize));
    } catch {
      // FIX: actually set error state so user sees feedback
      setError("Failed to load beneficiaries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: number | string) {
    try {
      await deleteBeneficiary(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
      toast.success("Beneficiary deleted");
    } catch {
      // FIX: show toast error instead of swallowing silently
      toast.error("Failed to delete beneficiary.");
    }
  }

  const [newWalletId, setNewWalletId] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  async function handleAdd() {
    if (!newWalletId) {
      toast.warning("Enter a wallet ID");
      return;
    }
    try {
      setAdding(true);
      const { data } = await addBeneficiary({ wallet_id: newWalletId });
      const card = normalize(data);
      setItems((prev) => [card, ...prev]);
      setNewWalletId("");
      const checkbox = document.getElementById("add-beneficiary") as HTMLInputElement | null;
      if (checkbox) checkbox.checked = false;
      toast.success("Beneficiary added");
    } catch {
      // FIX: show toast error instead of swallowing silently
      toast.error("Failed to add beneficiary.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="page-container">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Beneficiaries</h1>
          <p className="text-sm text-gray-600 dark:text-white/60">People you can transfer to quickly.</p>
        </div>

        <input id="add-beneficiary" type="checkbox" className="peer/add hidden" />
        <label htmlFor="add-beneficiary" className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 dark:bg-white dark:text-black">
          <UserPlus className="h-4 w-4" />
          Add Beneficiary
        </label>

        {/* Add Modal */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center bg-black/0 p-4 opacity-0 transition peer-checked/add:pointer-events-auto peer-checked/add:bg-black/40 peer-checked/add:opacity-100">
          <label htmlFor="add-beneficiary" className="absolute inset-0" aria-hidden="true" />
          <div className="relative w-full max-w-md -translate-y-62 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition dark:border-white/10 dark:bg-[#101113] peer-checked/add:translate-y-0"
            role="dialog" aria-modal="true" aria-labelledby="add-title">
            <label htmlFor="add-beneficiary" className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700" aria-label="Close modal">
              <X className="h-4 w-4" />
            </label>

            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 id="add-title" className="text-base font-semibold">Add a new beneficiary</h3>
                <p className="text-xs text-gray-600 dark:text-white/60">Add by email or account/wallet ID.</p>
              </div>
            </div>

            <form className="space-y-4" noValidate>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Account / Wallet ID</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                  <input value={newWalletId} onChange={(e) => setNewWalletId(e.target.value)}
                    placeholder="3141592653"
                    className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-white/10 dark:bg-black/40 dark:text-white/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <p>We'll verify the account is valid before saving.</p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <label htmlFor="add-beneficiary" className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5">
                  Cancel
                </label>
                <button onClick={handleAdd} type="button" disabled={adding}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50 dark:bg-white dark:text-black">
                  <Plus className="h-4 w-4" />
                  {adding ? "Saving…" : "Save Beneficiary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 dark:border-white/10 dark:border-t-white" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
          <UserPlus className="mb-4 h-10 w-10 text-gray-300 dark:text-white/20" />
          <p className="text-sm font-medium text-gray-500 dark:text-white/50">No beneficiaries yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-white/30">Add a beneficiary to send money quickly.</p>
        </div>
      )}

      {/* Grid of beneficiary cards */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => {
            const initials =
              b?.name?.split(" ")?.map((p) => p[0])?.join("")?.slice(0, 2)?.toUpperCase() || "??";

            return (
              <div key={b.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gray-200 bg-gray-50 font-semibold dark:border-white/10 dark:bg-black/40">
                      <span className="text-sm">{initials}</span>
                    </div>
                    <div>
                      <div className="font-medium">{b.name}</div>
                      {b.email && <div className="text-xs text-gray-600 dark:text-white/60">{b.email}</div>}
                      <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-white/60">
                        <Hash className="h-3.5 w-3.5" /> {b.wallet}
                      </div>
                    </div>
                  </div>

                  {/* FIX: Use b.id (not b object) for unique delete modal ID */}
                  <input id={`del-${b.id}`} type="checkbox" className="peer/del hidden" />
                  <label htmlFor={`del-${b.id}`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </label>

                  {/* Delete confirm modal */}
                  <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center bg-black/0 p-4 opacity-0 transition peer-checked/del:pointer-events-auto peer-checked/del:bg-black/40 peer-checked/del:opacity-100">
                    <label htmlFor={`del-${b.id}`} className="absolute inset-0" aria-hidden="true" />
                    <div className="relative w-full max-w-sm -translate-y-72 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition dark:border-white/10 dark:bg-[#101113] peer-checked/del:translate-y-0"
                      role="dialog" aria-modal="true">
                      <label htmlFor={`del-${b.id}`} className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700" aria-label="Close modal">
                        <X className="h-4 w-4" />
                      </label>

                      <div className="mb-3 text-base font-semibold">Delete beneficiary?</div>
                      {/* FIX: Use dynamic b.name instead of hardcoded "Maya Johnson" */}
                      <p className="text-sm text-gray-600 dark:text-white/60">
                        This will remove <span className="font-medium">{b.name}</span> from your beneficiaries list.
                      </p>

                      <div className="mt-5 flex items-center justify-end gap-2">
                        <label htmlFor={`del-${b.id}`} className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5">
                          Cancel
                        </label>
                        <button onClick={() => handleDelete(b?.id)} type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link to="/dashboard/transfers/new"
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black">
                    Send money
                  </Link>
                  {/* FIX: Guard against empty/invalid created_at */}
                  <span className="text-xs text-gray-600 dark:text-white/60">
                    Added: {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 dark:border-white/10 dark:bg-black/40 dark:text-white/80">
        Tip: You can add beneficiaries via email or account/wallet ID. We'll validate before saving.
      </div>
    </div>
  );
};

export default Beneficiaries;