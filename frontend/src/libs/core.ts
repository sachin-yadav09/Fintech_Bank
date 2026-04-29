// src/libs/core.ts

import apiClient from "./apiClient";

// ── Wallet ────────────────────────────────────────────────────────────────────

export const verifyWalletFunding = (payload: {
  paymentId: string;
  amount: number;
  transaction_pin: string;
}) => apiClient.post("core/verify/", payload);

export const getWalletDetail = ({ wallet_id }: { wallet_id: string }) =>
  apiClient.get(`core/wallet/${wallet_id}/`);

// ── Overview ──────────────────────────────────────────────────────────────────

export const getOverview = () => apiClient.get("core/overview/");

// ── Transfers ─────────────────────────────────────────────────────────────────

export const transferFunds = (payload: {
  wallet_id: string;
  amount: number | string;
  transaction_pin: string;
  save_beneficiary?: boolean;
}) => apiClient.post("core/transfer/", payload);

// ── Beneficiaries ─────────────────────────────────────────────────────────────

export const getBeneficiaries = () => apiClient.get("core/beneficiaries/");

export const addBeneficiary = ({ wallet_id }: { wallet_id: string }) =>
  apiClient.post("core/beneficiaries/add/", { wallet_id });

export const deleteBeneficiary = (id: number | string) =>
  apiClient.delete(`core/beneficiaries/${id}/`);

// ── Transactions ──────────────────────────────────────────────────────────────

export const getTransactions = () => apiClient.get("core/transactions/");

export const getTransaction = (reference: string) =>
  apiClient.get(`core/transactions/${reference}/`);

// ── Savings Goals ─────────────────────────────────────────────────────────────

// FIX: Previous implementation spread payload twice, meaning target_date was
// duplicated when present and sent as null (not omitted) when absent.
// Now we destructure and only include target_date when it's a non-empty string.
export const createSavingsGoal = (payload: {
  name: string;
  target_amount: number | string;
  target_date?: string | null;
}) => {
  const { target_date, ...rest } = payload;
  return apiClient.post("core/savings-goals/create/", {
    ...rest,
    ...(target_date ? { target_date } : {}),
  });
};

export const getSavingsGoals = () => apiClient.get("core/savings-goals/");

export const getSavingsGoal = (uuid: string) =>
  apiClient.get(`core/savings-goals/${uuid}/`);

export const depositToSavingsGoal = (payload: {
  uuid: string;
  amount: number | string;
}) => apiClient.post("core/savings-goals/deposit/", payload);

/**
 * Withdraw from a savings goal.
 * Pass `amount` for a partial withdrawal; omit it to withdraw the full balance.
 */
export const withdrawFromSavingsGoal = (payload: {
  uuid: string;
  amount?: number | string;
}) => apiClient.post("core/savings-goals/withdraw/", payload);

// ── Notifications ─────────────────────────────────────────────────────────────

export const getNotifications = (unreadOnly = false) =>
  apiClient.get("core/notifications/", {
    params: unreadOnly ? { unread: "true" } : {},
  });

export const markNotificationRead = (id: number) =>
  apiClient.post(`core/notifications/${id}/read/`);

export const markAllNotificationsRead = () =>
  apiClient.post("core/notifications/read-all/");

// ── Loans ─────────────────────────────────────────────────────────────────────

export const calculateEMI = (payload: {
  principal_amount: number | string;
  interest_rate: number | string;
  tenure_months: number;
}) => apiClient.post("core/loans/calculate-emi/", payload);

export const applyForLoan = (payload: {
  loan_type: string;
  principal_amount: number | string;
  interest_rate: number | string;
  tenure_months: number;
}) => apiClient.post("core/loans/apply/", payload);

export const getLoans = () => apiClient.get("core/loans/");

export const getLoan = (uuid: string) => apiClient.get(`core/loans/${uuid}/`);

export const payEMI = (payload: { loan_id: string; transaction_pin: string }) =>
  apiClient.post("core/loans/pay-emi/", payload);