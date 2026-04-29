// Let's import some packages at the top of the FundWallet.tsx

// Import React core
import React from "react";
// Link component for navigation between routes
import { Link } from "react-router-dom";
// Import some icons from lucide-react
import { ArrowLeft, Wallet, UserRound, Lock } from "lucide-react";
// Stripe client libraries
import { loadStripe } from "@stripe/stripe-js"; // loads Stripe with a publishable key
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
// API helper to call our backend and verify funding
import { verifyWalletFunding } from "@/libs/core";

// Load Stripe publishable key from environment (Vite config)
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function FundForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [amount, setAmount] = React.useState<string>(""); // amount to fund
  const [cardholderName, setCardholderName] = React.useState<string>(""); // cardholder input
  const [transactionPin, setTransactionPin] = React.useState(""); // transaction pin
  const [submitting, setSubmitting] = React.useState(false); // loading spinner state
  const [errorMsg, setErrorMsg] = React.useState(""); // error feedback
  const [successMsg, setSuccessMsg] = React.useState(""); // success feedback

  async function handleFund() {
    setErrorMsg("");
    setSuccessMsg("");

    if (!stripe || !elements) {
      setErrorMsg("Stripe is not ready yet, Try again in a second");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Enter a valid amount");
      return;
    }

    if (transactionPin.length !== 4) {
      setErrorMsg("Enter your 4-digit transaction PIN");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setErrorMsg("Card field is not ready");
      return;
    }

    setSubmitting(true);

    try {
      const pmResult = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: {
          name: cardholderName || undefined,
        },
      });

      if (pmResult.error || !pmResult.paymentMethod) {
        setErrorMsg(
          pmResult.error.message || "Could not create a payment method",
        );
        setSubmitting(false);
        return;
      }

      const paymentId = pmResult.paymentMethod.id;

      const { data } = await verifyWalletFunding({
        paymentId,
        amount: parsedAmount,
        transaction_pin: transactionPin,
      });

      setSuccessMsg(data?.message || "wallet funding Successful");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const resp = err?.response?.data;
      if (resp?.error) setErrorMsg(resp.error);
      else setErrorMsg("Funding failed, please try again later");
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Fund Wallet</h1>
        <p className="text-sm text-gray-600 dark:text-white/60">
          Add money to your wallet securely. Card fields are placeholders.
        </p>
      </div>

      {errorMsg && <div className="alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      <form
        className="space-y-6"
        noValidate
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Amount */}
        <div>
          <label className="form-label">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-white/60">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input-fund px-7"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Cardholder name</label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Jane Doe"
              className="input-fund px-9"
            />
          </div>
        </div>

        {/* Transaction PIN */}
        <div>
          <label className="form-label">Transaction PIN</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/50" />
            <input
              type="password"
              value={transactionPin}
              onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              className="input-fund px-9"
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="">
            Card details
          </label>
          <div className="rounded-xl border px-3 py-2">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: "14px",
                    "::placeholder": { color: "#9ca3af" },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="text-xs text-gray-600 dark:text-white/60">
            You’ll complete payment in a secure checkout when integrated.
          </div>
          <div className="flex gap-2">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              onClick={handleFund}
              disabled={submitting || !stripe || !elements}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {submitting ? "Processing..." : "Fund Wallet"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const FundWallet: React.FC = () => {
  return (
    <div className="page-container pt-6">
      {/* Breadcrumb */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="btn-back">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="hidden text-sm text-gray-500 dark:text-white/60 sm:block">
            / Wallet / Fund
          </div>
        </div>
      </div>

      <div className="page-container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: context/tips */}
          <aside className="lg:col-span-4">
            <div className="panel-sm">
              <div className="flex items-center gap-2">
                <div className="icon-box">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Fund your wallet</div>
                  <div className="text-xs text-gray-600 dark:text-white/60">
                    Top up instantly with your card.
                  </div>
                </div>
              </div>

              <div className="tip-dashed">
                <ul className="list-inside list-disc space-y-1">
                  <li>Enter the amount you want to add.</li>
                  <li>
                    Use a valid card number, expiry, and CVV (dummy for now).
                  </li>
                  <li>We’ll show fees during checkout (when wired).</li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Right: form */}
          <section className="lg:col-span-8">
            {stripePromise ? (
              <Elements stripe={stripePromise} options={{}}>
                <FundForm />
              </Elements>
            ) : (
              <div className="panel">
                <div className="alert-warning">
                  Stripe is not configured. Add{" "}
                  <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your environment
                  to enable card payments.
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="tip-muted">
              Card data here is non-functional. Swap these inputs for your
              Stripe Elements/Checkout to go live.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FundWallet;
