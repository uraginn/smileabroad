import type { PlanCurrency } from "@/types/models";
export { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";

const CURRENCY_SYMBOLS: Record<PlanCurrency, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  TRY: "₺",
};

export function currencySymbol(currency: PlanCurrency) {
  return CURRENCY_SYMBOLS[currency];
}

export function formatQuoteMoney(amount: number, currency: PlanCurrency) {
  return `${currencySymbol(currency)}${amount.toLocaleString()}`;
}
