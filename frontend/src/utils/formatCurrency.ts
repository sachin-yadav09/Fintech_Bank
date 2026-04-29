export const formatCurrency = (
  amount: string | number,
  locale = "en-IN",
): string => {
  const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatProgress = (
  current: string | number,
  target: string | number,
): number => {
  const c = Number(current) || 0;
  const t = Number(target) || 0;
  if (!t) return 0;
  return Math.min(100, Math.round((c / t) * 100));
};
