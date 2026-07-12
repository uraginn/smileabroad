import type { QuoteStatus } from "@/types/models";

export const PUBLIC_QUOTE_STATUSES = [
  "approved",
  "sent",
  "viewed",
  "accepted",
] as const satisfies readonly QuoteStatus[];

export function isQuotePubliclyViewable(status: QuoteStatus | undefined): boolean {
  return PUBLIC_QUOTE_STATUSES.includes(
    (status ?? "draft") as (typeof PUBLIC_QUOTE_STATUSES)[number],
  );
}
