import type { Quote, QuoteCurrency } from "@/types/models";

const CURRENCY_SYMBOLS: Record<QuoteCurrency, string> = {
  GBP: "£", EUR: "€", USD: "$", TRY: "₺",
};

export function currencySymbol(currency: QuoteCurrency) {
  return CURRENCY_SYMBOLS[currency];
}

export function formatQuoteMoney(amount: number, currency: QuoteCurrency) {
  return `${currencySymbol(currency)}${amount.toLocaleString()}`;
}

export function calculateQuoteTotals(quote: Quote) {
  const subtotal = quote.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  return {
    subtotal,
    total: subtotal + quote.hotel_total + quote.transfer_total - quote.discount,
  };
}
