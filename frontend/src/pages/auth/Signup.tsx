// frontend\src\pages\auth\Signup.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
// FIX: Use useAuth hook instead of redefining AuthContextType locally
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

type Step = "contact" | "otp" | "profile";
type DeliveryMethod = "SMS" | "EMAIL";

const Signup: React.FC = () => {
  // FIX: useAuth() instead of useContext(AuthContext) as AuthContextType
  // — the local AuthContextType had register returning Promise<{success,message}>
  //   but AuthContext has it returning Promise<void>, causing a type mismatch.
  const { sendOTP, register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("contact");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("SMS");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState<number | null>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      purpose: "REGISTER";
      delivery_method: DeliveryMethod;
      phone_number?: string;
      email?: string;
    } = {
      purpose: "REGISTER",
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
      const axiosErr = err as {
        response?: { data?: { error?: string; phone_number?: string[] } };
      };
      const data = axiosErr?.response?.data;
      setError(data?.error || data?.phone_number?.[0] || "Failed to send OTP.");
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

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otpDigits.join("").length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setStep("profile");
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setOtpDigits(["", "", "", "", "", ""]);
    setLoading(true);

    const payload: {
      purpose: "REGISTER";
      delivery_method: DeliveryMethod;
      phone_number?: string;
      email?: string;
    } = {
      purpose: "REGISTER",
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!otpId) {
      setError("Session expired. Please start over.");
      setStep("contact");
      return;
    }

    const payload: {
      phone_number?: string;
      email?: string;
      otp_id: number;
      otp_code: string;
      full_name: string;
      password: string;
      delivery_method: DeliveryMethod;
    } = {
      otp_id: otpId,
      otp_code: otpDigits.join(""),
      full_name: fullName.trim(),
      password,
      delivery_method: deliveryMethod,
    };

    if (deliveryMethod === "SMS") {
      payload.phone_number = cleanMobile();
      if (profileEmail.trim()) payload.email = profileEmail.trim();
    } else {
      payload.email = email.trim().toLowerCase();
      const cleanedMobile = cleanMobile();
      if (cleanedMobile) payload.phone_number = cleanedMobile;
    }

    setLoading(true);
    try {
      await register(payload);
      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; detail?: string } };
      };
      const data = axiosErr?.response?.data;
      const msg =
        data?.error || data?.detail || "Registration failed. Please try again.";
      setError(msg);
      if (msg.toLowerCase().includes("otp")) {
        setStep("otp");
        setOtpDigits(["", "", "", "", "", ""]);
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (p: string) => {
    if (!p) return null;
    if (p.length < 6) return { level: 1, label: "Weak", color: "bg-red-400" };
    if (p.length < 8)
      return { level: 2, label: "Fair", color: "bg-yellow-400" };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p))
      return { level: 4, label: "Strong", color: "bg-green-400" };
    return { level: 3, label: "Good", color: "bg-blue-400" };
  };
  const strength = passwordStrength(password);

  const stepLabels = ["Contact", "Verify OTP", "Profile"];
  const stepIndex = step === "contact" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 mb-3 shadow-2xl">
            <svg
              className="w-8 h-8 text-white"
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
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < stepIndex
                      ? "bg-green-400 text-white"
                      : i === stepIndex
                        ? "bg-indigo-400 text-white ring-2 ring-indigo-300 ring-offset-1 ring-offset-transparent"
                        : "bg-white/10 text-indigo-300"
                  }`}
                >
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${i === stepIndex ? "text-white" : "text-indigo-400"}`}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={`w-6 h-0.5 ${i < stepIndex ? "bg-green-400" : "bg-white/20"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* ── Step 1: Contact ── */}
          {step === "contact" && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  Enter your contact
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  We'll send a one-time password to verify
                </p>
              </div>

              <div className="flex bg-white/10 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("SMS");
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${deliveryMethod === "SMS" ? "bg-indigo-500 text-white shadow" : "text-indigo-300 hover:text-white"}`}
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
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${deliveryMethod === "EMAIL" ? "bg-indigo-500 text-white shadow" : "text-indigo-300 hover:text-white"}`}
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
                        autoFocus
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
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
                      autoFocus
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                    />
                  </div>
                )}
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner label="Sending…" /> : "Send OTP"}
                </button>
              </form>
              <p className="mt-6 text-center text-indigo-300 text-sm">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-indigo-200 font-medium hover:text-white transition-colors underline underline-offset-2"
                >
                  Login
                </Link>
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
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
                <h2 className="text-lg font-semibold text-white">
                  Verify your {deliveryMethod === "SMS" ? "number" : "email"}
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  OTP sent to{" "}
                  <span className="text-white font-medium">
                    {deliveryMethod === "SMS" ? `+91 ${mobile}` : email}
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
                  disabled={otpDigits.join("").length !== 6}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg"
                >
                  Continue
                </button>
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-indigo-300 text-sm">
                      Resend in{" "}
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

          {/* ── Step 3: Profile ── */}
          {step === "profile" && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  Complete your profile
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  Almost done — set up your account details
                </p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {showPassword ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        ) : (
                          <>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  {strength && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${strength.level * 25}%` }}
                        />
                      </div>
                      <span className="text-xs text-indigo-300">
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition ${confirmPassword && confirmPassword !== password ? "border-red-400/50" : "border-white/20"}`}
                  />
                </div>

                {deliveryMethod === "SMS" ? (
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-1.5">
                      Email{" "}
                      <span className="text-indigo-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-1.5">
                      Mobile Number{" "}
                      <span className="text-indigo-400 font-normal">
                        (optional)
                      </span>
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
                      />
                    </div>
                  </div>
                )}

                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <Spinner label="Creating account…" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-indigo-400 text-xs mt-6">
          By signing up you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Signup;
