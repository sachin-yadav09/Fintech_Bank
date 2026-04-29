// frontend\src\pages\dashboard\Profile.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User2, Mail, Lock, CheckCircle2, AlertCircle, Pencil, LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile, getKYC, setTransactionPin } from "@/libs/user";
import type { KYCRecord } from "@/types";

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // even if server call fails, local state is cleared
    } finally {
      navigate("/login");
    }
  };

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kyc, setKyc] = useState<KYCRecord | null>(null);

  // PIN states
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState("");
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // FIX: getKYC returns data directly (not wrapped in axios response)
    getKYC()
      .then((data) => setKyc(data))
      .catch(() => setKyc(null));
  }, []);

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrors({});

    const localErrors: Record<string, string> = {};
    if (!username.trim()) localErrors.username = "Username cannot be empty.";
    if (!email.trim()) localErrors.email = "Email cannot be empty.";
    if (newPassword && newPassword !== confirmPassword)
      localErrors.confirmPassword = "Passwords do not match.";
    if (newPassword && newPassword.length < 8)
      localErrors.newPassword = "Password must be at least 8 characters.";
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    // FIX: Record<string, unknown> to match updated updateProfile signature in user.ts
    const payload: Record<string, unknown> = { username, email };
    if (newPassword) {
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }

    try {
      setSaving(true);
      await updateProfile(payload);
      setSuccessMsg("Profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // FIX: Refresh user in context so DashboardHeader/Sidebar show updated name
      await refreshUser();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string> } })?.response?.data;
      if (data && typeof data === "object") {
        setErrors(data);
      } else {
        setErrors({ general: "Failed to update profile. Please try again." });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePinSave(e: React.FormEvent) {
    e.preventDefault();
    setPinSuccessMsg("");
    setPinErrors({});

    const localErrors: Record<string, string> = {};
    if (pin.length !== 4 || !/^\d+$/.test(pin)) localErrors.pin = "PIN must be 4 digits.";
    if (pin !== confirmPin) localErrors.confirmPin = "PINs do not match.";
    if (user?.has_pin && !pinCurrent) localErrors.pinCurrent = "Current PIN is required.";

    if (Object.keys(localErrors).length > 0) {
      setPinErrors(localErrors);
      return;
    }

    try {
      setPinSaving(true);
      await setTransactionPin({
        pin,
        confirm_pin: confirmPin,
        current_pin: pinCurrent,
      });
      setPinSuccessMsg("Transaction PIN updated successfully!");
      setPin("");
      setConfirmPin("");
      setPinCurrent("");
      await refreshUser();
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      setPinErrors({ general: data?.detail || "Failed to update PIN." });
    } finally {
      setPinSaving(false);
    }
  }

  const kycStatusColor: Record<string, string> = {
    VERIFIED:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30",
    PENDING:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30",
    UNVERIFIED:
      "text-gray-600 dark:text-white/60 bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10",
    REJECTED:
      "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30",
  };

  const kycStatus = kyc?.verification_status ?? "UNVERIFIED";
  const initials = (user?.username ?? "?").slice(0, 2).toUpperCase();

  // FIX: Safe fallback if status string is not in the map
  const kycColor = kycStatusColor[kycStatus] ?? kycStatusColor.UNVERIFIED;

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">
          / Settings / Profile
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left: Avatar + account summary ── */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gray-900 text-2xl font-bold text-white dark:bg-white dark:text-black">
              {initials}
            </div>
            <div className="mt-3 text-lg font-semibold">{user?.username}</div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-white/60">{user?.email}</div>

            {/* FIX: Use computed kycColor with safe fallback */}
            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold ${kycColor}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              KYC: {kycStatus}
            </div>

            <div className="mt-4">
              <button
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>

          {kyc && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold">KYC Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-white/50">Full name</dt>
                  <dd className="font-medium">{kyc.full_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-white/50">Date of birth</dt>
                  <dd className="font-medium">{kyc.date_of_birth ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-white/50">ID type</dt>
                  <dd className="font-medium">{kyc.id_type ?? "—"}</dd>
                </div>
              </dl>
              {kycStatus !== "VERIFIED" && (
                <Link
                  to="/dashboard/kyc"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-black"
                >
                  <Pencil className="h-4 w-4" />
                  {kycStatus === "UNVERIFIED" ? "Complete KYC" : "Update KYC"}
                </Link>
              )}
            </div>
          )}

          {!kyc && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-white/10 dark:text-white/50">
              KYC not submitted yet.{" "}
              <Link
                to="/dashboard/kyc"
                className="font-semibold text-gray-900 underline-offset-4 hover:underline dark:text-white"
              >
                Complete it now
              </Link>
            </div>
          )}
        </aside>

        {/* ── Right: Edit form ── */}
        <section className="lg:col-span-8 space-y-6">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errors.general && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Account info */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-5 text-base font-semibold">Account Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Username</label>
                  <div className="relative">
                    <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                    <input
                      type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                  {errors.username && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.username}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Transaction PIN */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold">Transaction PIN</h2>
                {user?.has_pin ? (
                   <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                     <CheckCircle2 className="h-3 w-3" />
                     PIN Set
                   </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    Not Set
                  </span>
                )}
              </div>

              {pinSuccessMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {pinSuccessMsg}
                </div>
              )}
              {pinErrors.general && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {pinErrors.general}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {user?.has_pin && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Current PIN</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                      <input
                        type="password" value={pinCurrent} onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="••••" maxLength={4}
                        className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                      />
                    </div>
                    {pinErrors.pinCurrent && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{pinErrors.pinCurrent}</p>}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">{user?.has_pin ? "New PIN" : "Set PIN"}</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                    <input
                      type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••" maxLength={4}
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                  {pinErrors.pin && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{pinErrors.pin}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Confirm PIN</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                    <input
                      type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••" maxLength={4}
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>
                  {pinErrors.confirmPin && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{pinErrors.confirmPin}</p>}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button" onClick={handlePinSave} disabled={pinSaving}
                  className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  {pinSaving ? "Updating..." : (user?.has_pin ? "Update PIN" : "Set PIN")}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;