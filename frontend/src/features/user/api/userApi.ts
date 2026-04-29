import apiClient from "@/shared/api/client";

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

export const getProfile = () => apiClient.get("user/profile/").then((r) => r.data);

export const updateProfile = (data: Record<string, string>) =>
  apiClient.patch("user/profile/update/", data).then((r) => r.data);

export const getKYC = () => apiClient.get("user/kyc-profile/").then((r) => r.data);

export const submitKYC = (data: Record<string, string>) =>
  apiClient.post("user/kyc/", data).then((r) => r.data);

export const kycProfile = () => apiClient.get("user/kyc-profile/");

export const createKyc = (data: Record<string, string>) =>
  apiClient.post("user/kyc/", data);

export const uploadFile = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("core/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as string;
};

export const setTransactionPin = (data: Record<string, string>) =>
  apiClient.post("user/pin/set/", data).then((r) => r.data);

