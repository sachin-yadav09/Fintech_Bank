// frontend\src\pages\dashboard\Fund.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  Building2,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { getOverview } from "@/libs/core";\nimport CopyButton from "@/components/dashboard/CopyButton";

interface BankDetails {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  account_type: string;
  upi_id: string;
  swift_code?: string;
  micr_code?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface BankDetailsData {
  bank_details: BankDetails;
  deposit_instructions: string[];
  supported_payment_modes: string[];
  minimum_deposit: number;
  maximum_deposit: number;
  currency: string;
}

const Fund: React.FC = () => {
  const [walletId, setWalletId] = useState("");
  const [walletError, setWalletError] = useState(false);
  const [bankData, setBankData] = useState<BankDetailsData | null>(null);
  const [bankError, setBankError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    getOverview()
      .then(({ data }) => setWalletId(data?.wallet?.wallet_id ?? ""))
      .catch(() => {
        // FIX: Track wallet load failure separately so UI shows error instead of "Loading…" forever
        setWalletError(true);
      });

    fetch("/bank_details.json")
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setBankData(data))
      .catch(() => {
        // FIX: Set error state instead of leaving bankData null forever (infinite spinner)
        setBankError(
          "Bank details could not be loaded. Please contact support.",
        );
      });
  }, []);

  // FIX: Async clipboard with error handling
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard API failed (e.g. non-secure context)
      alert("Copy failed. Please copy manually: " + text);
    }
  };

  // FIX: Show error if bank_details.json failed to load instead of infinite spinner
  if (bankError) {
    return (
      <div className="page-container">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-rose-500" />
            <p className="text-rose-600 dark:text-rose-400">{bankError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while bank data fetches
  if (!bankData) {
    return (
      <div className="page-container">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600 dark:border-gray-600 dark:border-t-indigo-400" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading bank details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    bank_details,
    deposit_instructions,
    supported_payment_modes,
    minimum_deposit,
    maximum_deposit,
    currency,
  } = bankData;

  return (
    <div className="page-container">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm text-gray-500 dark:text-white/60">
            / Fund Wallet
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fund Your Wallet
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Transfer funds to the bank account below using your Wallet ID as the
            reference
          </p>
        </div>

        {/* Wallet ID Card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <p className="mb-2 text-sm opacity-90">
            Your Wallet ID (Use as Payment Reference)
          </p>
          <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
            {/* FIX: Show error message if wallet ID failed to load */}
            <p className="font-mono text-lg font-bold">
              {walletError ? "Failed to load" : walletId || "Loading..."}
            </p>
            {walletId && !walletError && (
              <CopyButton
                text={walletId}
                field="walletId"
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            )}
          </div>
          <p className="mt-3 text-xs opacity-75">
            ⚠️ Important: Add this Wallet ID in the payment remarks/reference
            for instant credit
          </p>
        </div>

        {/* Bank Details Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {bank_details.bank_name}
              </p>
              <p className="text-sm text-white/70">{bank_details.branch}</p>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Account Holder Name
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {bank_details.account_holder_name}
                  </p>
                  <CopyButton
                    text={bank_details.account_holder_name}
                    field="holderName"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Account Number
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bank_details.account_number}
                  </p>
                  <CopyButton
                    text={bank_details.account_number}
                    field="accountNumber"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  IFSC Code
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bank_details.ifsc_code}
                  </p>
                  <CopyButton
                    text={bank_details.ifsc_code}
                    field="ifsc"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Account Type
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {bank_details.account_type}
                </p>
              </div>
              {bank_details.micr_code && (
                <div>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    MICR Code
                  </p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bank_details.micr_code}
                  </p>
                </div>
              )}
              {bank_details.swift_code && (
                <div>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    SWIFT Code
                  </p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bank_details.swift_code}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* UPI Card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="mb-3 flex items-center gap-3">
            <Smartphone className="h-6 w-6" />
            <p className="text-lg font-semibold">UPI Payment</p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
            <p className="font-mono text-base font-bold">
              {bank_details.upi_id}
            </p>
            <CopyButton
              text={bank_details.upi_id}
              field="upi"
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          </div>
          <p className="mt-3 text-xs opacity-75">
            Scan QR or use UPI ID • Add Wallet ID in remarks
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
          <h3 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-300">
            Deposit Instructions
          </h3>
          <ul className="space-y-2">
            {deposit_instructions.map((instruction, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-blue-800 dark:text-blue-200"
              >
                <span className="mt-0.5 text-blue-600 dark:text-blue-400">
                  •
                </span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment Modes & Limits */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Supported Payment Modes
            </p>
            <div className="flex flex-wrap gap-2">
              {supported_payment_modes.map((mode) => (
                <span
                  key={mode}
                  className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-500/20 dark:text-green-400"
                >
                  {mode}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Deposit Limits
            </p>
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-semibold">Min:</span> {currency}{" "}
              {minimum_deposit.toLocaleString("en-IN")}
              <span className="mx-2">•</span>
              <span className="font-semibold">Max:</span> {currency}{" "}
              {maximum_deposit.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {bank_details.contact_email && (
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact us at{" "}
            <a
              href={`mailto:${bank_details.contact_email}`}
              className="text-indigo-600 underline dark:text-indigo-400"
            >
              {bank_details.contact_email}
            </a>
            {bank_details.contact_phone && (
              <>
                {" "}
                or call{" "}
                <a
                  href={`tel:${bank_details.contact_phone}`}
                  className="text-indigo-600 underline dark:text-indigo-400"
                >
                  {bank_details.contact_phone}
                </a>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Fund;
