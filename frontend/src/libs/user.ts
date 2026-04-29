// src/libs/user.ts

import apiClient from "./apiClient";

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number_masked: string;
  ifsc_code: string;
  account_holder_name: string;
  registered_mobile: string;
  verification_status: "PENDING" | "VERIFIED" | "FAILED";
  is_primary: boolean;
  created_at: string;
}

export const getBankAccounts = () =>
  apiClient.get<BankAccount[]>("user/bank/accounts/").then((r) => r.data);

export const deleteBankAccount = (id: string) =>
  apiClient.delete(`user/bank/accounts/${id}/`).then((r) => r.data);

export const setPrimaryAccount = (id: string) =>
  apiClient
    .patch(`user/bank/accounts/${id}/`, { set_as_primary: true })
    .then((r) => r.data);

// FIX: Added bank OTP and link helpers so BankLink.tsx doesn't call apiClient directly
export const sendBankOTP = (mobile_number: string) =>
  apiClient.post("user/bank/send-otp/", { mobile_number });

export const linkBankAccount = (payload: {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  registered_mobile: string;
  otp_id: string;
  otp_code: string;
}) => apiClient.post("user/bank/link/", payload);

export const getProfile = () =>
  apiClient.get("user/profile/").then((r) => r.data);

// FIX: Changed type from Record<string, string> to Record<string, unknown>
// so that optional fields like current_password / new_password (which may be
// absent) don't cause TypeScript errors at the call site in Profile.tsx.
export const updateProfile = (data: Record<string, unknown>) =>
  apiClient.patch("user/profile/update/", data).then((r) => r.data);

// FIX: Removed duplicate kycProfile() — use getKYC() everywhere.
// getKYC returns unwrapped data directly for consistent usage.
export const getKYC = () =>
  apiClient.get("user/kyc-profile/").then((r) => r.data);

// FIX: Removed duplicate submitKYC() — use createKyc() everywhere.
// createKyc returns the full axios response so callers can read resp.data.message etc.
export const createKyc = (data: Record<string, string>) =>
  apiClient.post("user/kyc/", data);

/**
 * Upload an image file to the backend's file-upload endpoint and return the
 * public URL string that the server sends back.
 */
export const uploadFile = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("core/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as string;
};

export const setTransactionPin = (data: Record<string, string>) =>
  apiClient.post("user/auth/pin/set/", data).then((r) => r.data);