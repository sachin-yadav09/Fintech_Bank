// frontend\src\pages\dashboard\bank\BankLink.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { sendBankOTP, linkBankAccount } from "@/libs/user";

type Step = "details" | "otp";

const BankLink: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [registeredMobile, setRegisteredMobile] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // FIX: Use refs for OTP inputs instead of fragile querySelectorAll
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!bankName || !accountNumber || !confirmAccountNumber || !ifscCode || !accountHolderName || !registeredMobile) {
      setError("All fields are required.");
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      setError("Account numbers do not match.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      setError("Invalid IFSC code format.");
      return;
    }
    setLoading(true);
    try {
      // FIX: Use shared lib function instead of calling apiClient directly
      const { data } = await sendBankOTP(registeredMobile.replace(/\s/g, ""));
      setOtpId(data.otp_id);
      setStep("otp");
      setResendTimer(30);
    } catch (err) {
      // FIX: Proper typing instead of err:any
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      // FIX: Use shared lib function
      await linkBankAccount({
        bank_name: bankName.toUpperCase(),
        account_number: accountNumber,
        ifsc_code: ifscCode.toUpperCase(),
        account_holder_name: accountHolderName,
        registered_mobile: registeredMobile.replace(/\s/g, ""),
        otp_id: otpId,
        otp_code: otp,
      });
      navigate("/dashboard/bank");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const data = axiosErr?.response?.data;
      setError(data?.error || data?.detail || "Failed to link account.");
      setOtpDigits(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setOtpDigits(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      const { data } = await sendBankOTP(registeredMobile.replace(/\s/g, ""));
      setOtpId(data.otp_id);
      setResendTimer(30);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // FIX: OTP digit handler using refs instead of querySelectorAll
  const handleOTPDigit = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    const next = [...otpDigits];
    next[i] = clean;
    setOtpDigits(next);
    if (clean && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleOTPKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="page-container">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Link
            to="/dashboard/bank"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm text-gray-500 dark:text-white/60">/ Bank Accounts / Link New</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Link Bank Account</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Add a bank account to enable withdrawals from your wallet
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
          {step === "details" && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
                <select value={bankName} onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">Select Bank</option>
                  <option value="SBI">State Bank of India</option>
                  <option value="HDFC">HDFC Bank</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="AXIS">Axis Bank</option>
                  <option value="KOTAK">Kotak Mahindra Bank</option>
                  <option value="YES">Yes Bank</option>
                  <option value="PNB">Punjab National Bank</option>
                  <option value="BOB">Bank of Baroda</option>
                  <option value="CANARA">Canara Bank</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Account Holder Name</label>
                <input type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="As per bank records"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
                <input type="text" value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="1234567890123456" maxLength={20}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-mono text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Account Number</label>
                <input type="text" value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter account number" maxLength={20}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-mono text-gray-900 outline-none transition focus:border-gray-400 dark:bg-gray-700 dark:text-white ${
                    confirmAccountNumber && confirmAccountNumber !== accountNumber
                      ? "border-red-400 dark:border-red-500/50"
                      : "border-gray-300 dark:border-gray-600"
                  }`} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code</label>
                <input type="text" value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="SBIN0001234" maxLength={11}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-mono uppercase text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Registered Mobile Number</label>
                <div className="flex gap-2">
                  <div className="flex min-w-fit items-center rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    +91
                  </div>
                  <input type="tel" value={registeredMobile}
                    onChange={(e) => setRegisteredMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210" maxLength={10}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">OTP will be sent to this number for verification</p>
              </div>

              <button type="submit" disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                {loading ? "Sending OTP..." : "Continue"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <>
              <button onClick={() => { setStep("details"); setError(""); }}
                className="mb-5 flex items-center gap-1 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                ← Edit Details
              </button>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verify OTP</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  OTP sent to{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {registeredMobile.replace(/(\d{2})(\d+)(\d{3})/, "$1•••••$3")}
                  </span>
                </p>
              </div>
              <form onSubmit={handleVerifyAndLink} className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Enter 6-digit OTP</label>
                  <div className="flex justify-between gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpDigits[i] ?? ""}
                        onChange={(e) => handleOTPDigit(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        className="h-14 w-12 rounded-xl border border-gray-300 bg-gray-50 text-center text-xl font-bold text-gray-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || otpDigits.join("").length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {loading ? "Verifying..." : "Verify & Link Account"}
                </button>

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Resend OTP in <span className="font-medium text-gray-900 dark:text-white">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button type="button" onClick={handleResend} disabled={loading}
                      className="text-sm text-indigo-600 underline underline-offset-2 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BankLink;