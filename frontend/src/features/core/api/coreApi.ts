import apiClient from "@/shared/api/client";

export const verifyWalletFunding = (payload: {
  paymentId: string;
  amount: number;
}) => apiClient.post("core/verify/", payload);

export const getWalletDetail = ({ wallet_id }: { wallet_id: string }) =>
  apiClient.get(`core/wallet/${wallet_id}/`);

export const getOverview = () => apiClient.get("core/overview/");

export const transferFunds = (payload: {
  wallet_id: string;
  amount: number | string;
  transaction_pin: string;
  save_beneficiary?: boolean;
}) => apiClient.post("core/transfer/", payload);

export const getBeneficiaries = () => apiClient.get("core/beneficiaries/");

export const addBeneficiary = ({ wallet_id }: { wallet_id: string }) =>
  apiClient.post("core/beneficiaries/add/", { wallet_id });

export const deleteBeneficiary = (id: number | string) =>
  apiClient.delete(`core/beneficiaries/${id}/`);

export const getTransactions = () => apiClient.get("core/transactions/");

export const getTransaction = (reference: string) =>
  apiClient.get(`core/transactions/${reference}/`);

export const createSavingsGoal = (payload: {
  name: string;
  target_amount: number | string;
  target_date?: string | null;
}) =>
  apiClient.post("core/savings-goals/create/", {
    ...payload,
    ...(payload.target_date ? { target_date: payload.target_date } : {}),
  });

export const getSavingsGoals = () => apiClient.get("core/savings-goals/");

export const getSavingsGoal = (uuid: string) =>
  apiClient.get(`core/savings-goals/${uuid}/`);

export const depositToSavingsGoal = (payload: { uuid: string; amount: number | string }) =>
  apiClient.post("core/savings-goals/deposit/", payload);

export const withdrawFromSavingsGoal = (payload: {
  uuid: string;
  amount?: number | string;
}) => apiClient.post("core/savings-goals/withdraw/", payload);

export const getNotifications = (unreadOnly = false) =>
  apiClient.get("core/notifications/", {
    params: unreadOnly ? { unread: "true" } : {},
  });

export const markNotificationRead = (id: number) =>
  apiClient.post(`core/notifications/${id}/read/`);

export const markAllNotificationsRead = () =>
  apiClient.post("core/notifications/read-all/");

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

