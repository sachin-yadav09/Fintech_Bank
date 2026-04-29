// frontend\src\pages\dashboard\kyc\KYC.tsx
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User2, Calendar, IdCard, UploadCloud, ShieldCheck, Info } from "lucide-react";
// FIX: Use unified getKYC instead of deprecated kycProfile duplicate
import { createKyc, uploadFile, getKYC } from "@/libs/user";
import { toast } from "sonner";
import type { KYCRecord } from "@/types";

const KYC: React.FC = () => {
  const [kyc, setKyc] = React.useState<KYCRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fullName, setFullName] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [idType, setIdType] = React.useState("NATIONAL_ID");
  const [idImageUrl, setIdImageUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    const fetchKycProfile = async () => {
      try {
        // FIX: Use getKYC() which returns data directly (no destructuring needed)
        const data = await getKYC();
        setKyc(data);
        if (data) {
          setFullName(data?.full_name || "");
          if (data?.date_of_birth) {
            const d = String(data?.date_of_birth);
            setDob(d.length > 10 ? d.slice(0, 10) : d);
          }
          setIdType(data?.id_type || "NATIONAL_ID");
          setIdImageUrl(data?.id_image || "");
        }
      } catch {
        // KYC not submitted yet — not an error state
      } finally {
        setLoading(false);
      }
    };
    fetchKycProfile();
  }, []);

  const alreadySubmitted = Boolean(kyc);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");
    setSuccessMsg("");
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setIdImageUrl(url);
    } catch {
      // FIX: Show error instead of swallowing silently
      setErrorMsg("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (alreadySubmitted) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!dob) {
      setErrorMsg("Please select your date of birth.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        date_of_birth: dob,
        id_type: idType,
        id_image: idImageUrl,
      };
      const resp = await createKyc(payload);
      const msg = resp?.data?.message || "KYC submitted successfully.";
      setSuccessMsg(msg);
      toast.success("KYC updated");
      const saved = resp?.data?.kyc || payload;
      setKyc({
        ...saved,
        verification_status: saved?.verification_status || "UNVERIFIED",
      });
    } catch (error) {
      // FIX: Show error to user instead of swallowing silently
      const axiosErr = error as { response?: { data?: { error?: string; detail?: string } } };
      const data = axiosErr?.response?.data;
      setErrorMsg(data?.error || data?.detail || "KYC submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const status = kyc?.verification_status || "UNVERIFIED";

  return (
    <div className="page-container">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">/ Settings / KYC</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: guidance / status */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/40">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">KYC Verification</div>
                  <div className="text-xs text-gray-600 dark:text-white/60">
                    Status:{" "}
                    <span className={`font-medium ${
                      status === "VERIFIED" ? "text-emerald-600 dark:text-emerald-400"
                        : status === "PENDING" ? "text-amber-600 dark:text-amber-400"
                        : status === "REJECTED" ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-600 dark:text-white/60"
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-600 dark:border-white/10 dark:text-white/60">
                <p>Submit your legal name, date of birth, ID type, and a photo/scan of your ID.</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Name must match your government ID.</li>
                  <li>Date of birth must be in the past.</li>
                  <li>Accepted IDs: National ID, Driver&apos;s License, Passport.</li>
                  <li>Image should be clear, full document, no glare.</li>
                </ul>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-white/10 dark:bg-black/40 dark:text-white/80">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4" />
                  <p>
                    By submitting, you consent to verification and secure storage of KYC metadata.
                    Your verification status will show as <strong>Pending Review</strong> until approved.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right: form */}
          <section className="lg:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5">
                {/* FIX: Render error/success with proper styling instead of raw text */}
                {errorMsg && (
                  <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {successMsg}
                  </div>
                )}
                <h1 className="text-lg font-semibold">Submit your KYC</h1>
                <p className="text-sm text-gray-600 dark:text-white/60">
                  This helps us keep your account safe and compliant.
                </p>
              </div>

              <form className="space-y-5" noValidate onSubmit={handleSubmit}>
                {/* Full name */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Full name</label>
                  <div className="relative">
                    <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      disabled={alreadySubmitted} placeholder="As shown on your ID"
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white dark:placeholder:text-white/50" />
                  </div>
                </div>

                {/* Date of birth */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Date of birth</label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                      disabled={alreadySubmitted}
                      className="w-full rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none ring-0 transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white" />
                  </div>
                </div>

                {/* ID type */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">ID type</label>
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
                    <select value={idType} onChange={(e) => setIdType(e.target.value)}
                      disabled={alreadySubmitted}
                      className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 outline-none ring-0 transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white">
                      <option value="NATIONAL_ID">National ID Card</option>
                      <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                      <option value="PASSPORT">International Passport</option>
                    </select>
                  </div>
                </div>

                {/* ID image */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">ID image URL</label>
                    <input value={idImageUrl} onChange={(e) => setIdImageUrl(e.target.value)}
                      disabled={alreadySubmitted} type="url" placeholder="https://…"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-400 dark:border-white/10 dark:bg-transparent dark:text-white dark:placeholder:text-white/50" />
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-white/60">
                      Upload to your storage and paste the public URL here.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-white/70">Or upload file</label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5">
                        <UploadCloud className="h-4 w-4" />
                        <span>{uploading ? "Uploading..." : "Choose file"}</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={handleFileChange} disabled={uploading || alreadySubmitted} />
                      </label>
                      <span className="text-xs text-gray-600 dark:text-white/60">PNG/JPG up to ~5MB</span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/40">
                    <div className="text-xs text-gray-600 dark:text-white/60">Live preview</div>
                    <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                      <div className="grid h-48 place-items-center text-xs text-gray-500 dark:text-white/50">
                        {idImageUrl ? (
                          <img src={idImageUrl} alt="ID Preview" className="h-48 w-full object-contain" />
                        ) : "No image selected"}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-white/10 dark:bg-black/40">
                    <div className="text-xs text-gray-600 dark:text-white/60">What we'll store</div>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700 dark:text-white/80">
                      <li><span className="font-medium">full_name</span> {fullName || "—"}</li>
                      <li><span className="font-medium">date_of_birth</span> {dob || "—"}</li>
                      <li><span className="font-medium">id_type</span> {idType || "—"}</li>
                      <li><span className="font-medium">id_image</span> {idImageUrl || "—"}</li>
                    </ul>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="text-xs text-gray-600 dark:text-white/60">Submissions are reviewed within 24–72 hours.</div>
                  <div className="flex gap-2">
                    <Link to="/dashboard"
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5">
                      Cancel
                    </Link>
                    {/* FIX: Disable button when already submitted or submitting */}
                    <button type="submit"
                      disabled={alreadySubmitted || submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-black">
                      {alreadySubmitted ? "KYC Submitted" : submitting ? "Submitting..." : "Submit KYC"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-white/10 dark:bg-black/40 dark:text-white/60">
              If you already submitted KYC and need corrections, please contact support. Duplicate submissions aren't allowed.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default KYC;