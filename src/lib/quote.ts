import type { Quote } from "@/types/models";

export function calculateQuoteTotals(quote: Quote) {
  const subtotal = quote.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  return {
    subtotal,
    total: subtotal + quote.hotel_total + quote.transfer_total - quote.discount,
  };
}
