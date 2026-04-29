// frontend\src\pages\auth\Login.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
// FIX: Import shared components instead of redefining locally
const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-xl text-red-100 text-sm">
    <svg
      className="w-4 h-4 inline mr-2"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
    {message}
  </div>
);

const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <span className="flex items-center gap-2">
    <svg
      className="animate-spin -ml-1 h-5 w-5 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    {label}
  </span>
);

type Step = "contact" | "otp";
type DeliveryMethod = "SMS" | "EMAIL";

const Login: React.FC = () => {
  const { sendOTP, login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("contact");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("SMS");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState<number | null>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const cleanMobile = () => mobile.replace(/\s/g, "");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload: {
      purpose: "LOGIN";
      delivery_method: DeliveryMethod;
      phone_number?: string;
      email?: string;
    } = {
      purpose: "LOGIN",
      delivery_method: deliveryMethod,
    };

    if (deliveryMethod === "SMS") {
      const cleaned = cleanMobile();
      if (!/^\d{10}$/.test(cleaned)) {
        setError("Enter a valid 10-digit mobile number.");
        return;
      }
      payload.phone_number = cleaned;
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Enter a valid email address.");
        return;
      }
      payload.email = trimmedEmail;
    }

    setLoading(true);
    try {
      const result = await sendOTP(payload);
      setOtpId(result.otp_id);
      setStep("otp");
      setResendTimer(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr?.response?.data?.error ||
          "Failed to send OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    if (!otpId) {
      setError("Session expired. Please go back and request a new OTP.");
      return;
    }

    const payload: {
      otp_id: number;
      otp_code: string;
      delivery_method: DeliveryMethod;
      phone_number?: string;
      email?: string;
    } = {
      otp_id: otpId,
      otp_code: otp,
      delivery_method: deliveryMethod,
    };

    if (deliveryMethod === "SMS") {
      payload.phone_number = cleanMobile();
    } else {
      payload.email = email.trim().toLowerCase();
    }

    setLoading(true);
    try {
      await login(payload);
      navigate("/dashboard");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr?.response?.data?.error || "Invalid OTP. Please try again.",
      );
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setOtpDigits(["", "", "", "", "", ""]);
    setLoading(true);

    const payload: {
      purpose: "LOGIN";
      delivery_method: DeliveryMethod;
      phone_number?: string;
      email?: string;
    } = {
      purpose: "LOGIN",
      delivery_method: deliveryMethod,
    };

    if (deliveryMethod === "SMS") {
      payload.phone_number = cleanMobile();
    } else {
      payload.email = email.trim().toLowerCase();
    }

    try {
      const result = await sendOTP(payload);
      setOtpId(result.otp_id);
      setResendTimer(30);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // FIX: Indian mobile number formatting is 5-5 (e.g. 98765 43210), not 3-4-3
  const contactDisplay =
    deliveryMethod === "SMS"
      ? `+91 ${mobile.replace(/(\d{5})(\d{5})/, "$1 $2")}`
      : email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 mb-4 shadow-2xl">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">FinanceOS</h1>
          <p className="text-indigo-300 text-sm mt-1">
            Digital Wallet Platform
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {step === "contact" && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Welcome back
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  Choose how you want to receive your OTP
                </p>
              </div>

              {/* Delivery Method Toggle */}
              <div className="flex bg-white/10 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("SMS");
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    deliveryMethod === "SMS"
                      ? "bg-indigo-500 text-white shadow"
                      : "text-indigo-300 hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    SMS
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("EMAIL");
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    deliveryMethod === "EMAIL"
                      ? "bg-indigo-500 text-white shadow"
                      : "text-indigo-300 hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </span>
                </button>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-5">
                {deliveryMethod === "SMS" ? (
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-medium min-w-fit">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) =>
                          setMobile(e.target.value.replace(/[^\d\s]/g, ""))
                        }
                        placeholder="98765 43210"
                        maxLength={11}
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                      autoFocus
                    />
                  </div>
                )}

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Spinner label="Sending OTP…" />
                  ) : (
                    <>
                      Get OTP <ArrowIcon />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-indigo-300 text-sm">
                New to FinanceOS?{" "}
                <Link
                  to="/signup"
                  className="text-indigo-200 font-medium hover:text-white transition-colors underline underline-offset-2"
                >
                  Create account
                </Link>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <button
                onClick={() => {
                  setStep("contact");
                  setError("");
                }}
                className="flex items-center gap-1 text-indigo-300 hover:text-white text-sm mb-5 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Change {deliveryMethod === "SMS" ? "number" : "email"}
              </button>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Verify OTP</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  Sent to{" "}
                  <span className="text-white font-medium">
                    {contactDisplay}
                  </span>
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-3">
                    Enter 6-digit OTP
                  </label>
                  <div
                    className="flex gap-2 justify-between"
                    onPaste={handlePaste}
                  >
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPDigit(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition caret-transparent"
                      />
                    ))}
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading || otpDigits.join("").length !== 6}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner label="Verifying…" /> : "Verify & Login"}
                </button>

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-indigo-300 text-sm">
                      Resend OTP in{" "}
                      <span className="text-white font-medium">
                        {resendTimer}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-indigo-300 hover:text-white text-sm underline underline-offset-2 transition-colors"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-indigo-400 text-xs mt-6">
          Secured with end-to-end encryption · OTP valid for 10 minutes
        </p>
      </div>
    </div>
  );
};

const ArrowIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7l5 5m0 0l-5 5m5-5H6"
    />
  </svg>
);

export default Login;
