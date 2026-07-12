import type { Quote, QuoteCurrency } from "@/types/models";

const CURRENCY_SYMBOLS: Record<QuoteCurrency, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  TRY: "₺",
};

export function currencySymbol(currency: QuoteCurrency) {
  return CURRENCY_SYMBOLS[currency];
}

export function formatQuoteMoney(amount: number, currency: QuoteCurrency) {
  return `${currencySymbol(currency)}${amount.toLocaleString()}`;
}

export function calculateQuoteTotals(quote: Quote) {
  const subtotal = (quote.items ?? []).reduce(
    (sum, item) => sum + Math.max(0, finite(item.qty)) * Math.max(0, finite(item.unit_price)),
    0,
  );
  const gross =
    subtotal + Math.max(0, finite(quote.hotel_total)) + Math.max(0, finite(quote.transfer_total));
  const discount = Math.min(gross, Math.max(0, finite(quote.discount)));
  return {
    subtotal,
    total: Math.max(0, gross - discount),
  };
}

function finite(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}
