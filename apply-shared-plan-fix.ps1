$ErrorActionPreference = "Stop"

$root = Get-Location
$required = @(
  "src/routes/pro.quotes.`$id.tsx",
  "src/routes/pro.treatment-plans.`$id.tsx",
  "src/routes/shared.treatment-plan.`$token.tsx"
)

foreach ($file in $required) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Project root not detected. Missing: $file`nOpen PowerShell in the SmileAbroad project root and run this script again."
  }
}

function Replace-Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Label
  )

  $content = Get-Content -LiteralPath $Path -Raw
  if (-not $content.Contains($Old)) {
    throw "Could not apply '$Label' because the expected code was not found in $Path. The file may have changed."
  }

  $updated = $content.Replace($Old, $New)
  Set-Content -LiteralPath $Path -Value $updated -Encoding utf8
  Write-Host "Updated: $Path ($Label)" -ForegroundColor Green
}

# 1) Add centralized public-visibility helper.
$helperPath = Join-Path $root "src/lib/quote-visibility.ts"
$helperContent = @'
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
'@
Set-Content -LiteralPath $helperPath -Value $helperContent -Encoding utf8
Write-Host "Created: src/lib/quote-visibility.ts" -ForegroundColor Green

# 2) Quote editor: only show public shared preview when the quote is public.
$quotePath = Join-Path $root "src/routes/pro.quotes.`$id.tsx"

Replace-Exact `
  -Path $quotePath `
  -Label "quote visibility import" `
  -Old 'import { calculateQuoteTotals, formatQuoteMoney } from "@/lib/quote";' `
  -New @'
import { calculateQuoteTotals, formatQuoteMoney } from "@/lib/quote";
import { isQuotePubliclyViewable } from "@/lib/quote-visibility";
'@

Replace-Exact `
  -Path $quotePath `
  -Label "quote shared preview button" `
  -Old @'
            {quote.share_token && (
              <Button asChild variant="outline">
                <Link to="/shared/treatment-plan/$token" params={{ token: quote.share_token }}>
                  <ExternalLink className="size-4 mr-1" /> Preview shared
                </Link>
              </Button>
            )}
'@ `
  -New @'
            {quote.share_token && isQuotePubliclyViewable(status) ? (
              <Button asChild variant="outline">
                <Link to="/shared/treatment-plan/$token" params={{ token: quote.share_token }}>
                  <ExternalLink className="size-4 mr-1" /> View shared
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled
                title={
                  quote.share_token
                    ? "Available after the quote is approved"
                    : "A shared link has not been created yet"
                }
              >
                <ExternalLink className="size-4 mr-1" /> View shared
              </Button>
            )}
'@

# 3) Treatment plan editor:
# - use the linked Quote token, not plan.share_token
# - require a public Quote status
$treatmentPath = Join-Path $root "src/routes/pro.treatment-plans.`$id.tsx"

Replace-Exact `
  -Path $treatmentPath `
  -Label "treatment plan visibility import" `
  -Old 'import { formatQuoteMoney } from "@/lib/quote";' `
  -New @'
import { formatQuoteMoney } from "@/lib/quote";
import { isQuotePubliclyViewable } from "@/lib/quote-visibility";
'@

Replace-Exact `
  -Path $treatmentPath `
  -Label "treatment plan shared button" `
  -Old @'
            {plan.share_token && (
              <Button asChild variant="outline">
                <Link to="/shared/treatment-plan/$token" params={{ token: plan.share_token }}>
                  <ExternalLink className="size-4 mr-1" /> View shared
                </Link>
              </Button>
            )}
'@ `
  -New @'
            {existingQuote?.share_token && isQuotePubliclyViewable(existingQuote.status) ? (
              <Button asChild variant="outline">
                <Link
                  to="/shared/treatment-plan/$token"
                  params={{ token: existingQuote.share_token }}
                >
                  <ExternalLink className="size-4 mr-1" /> View shared
                </Link>
              </Button>
            ) : existingQuote ? (
              <Button
                type="button"
                variant="outline"
                disabled
                title={
                  existingQuote.share_token
                    ? "Available after the quote is approved"
                    : "Open the quote to prepare its shared link"
                }
              >
                <ExternalLink className="size-4 mr-1" /> View shared
              </Button>
            ) : null}
'@

# 4) Shared route: reuse the same centralized rule.
$sharedPath = Join-Path $root "src/routes/shared.treatment-plan.`$token.tsx"

Replace-Exact `
  -Path $sharedPath `
  -Label "shared visibility import" `
  -Old 'import { mapClinicQuoteCarePlan } from "@/lib/care-plan";' `
  -New @'
import { mapClinicQuoteCarePlan } from "@/lib/care-plan";
import { isQuotePubliclyViewable } from "@/lib/quote-visibility";
'@

Replace-Exact `
  -Path $sharedPath `
  -Label "remove duplicated public statuses" `
  -Old @'
export const Route = createFileRoute("/shared/treatment-plan/$token")({ component: SharedPlan });
const PUBLIC_STATUSES = ["approved", "sent", "viewed", "accepted"] as const;
'@ `
  -New @'
export const Route = createFileRoute("/shared/treatment-plan/$token")({ component: SharedPlan });
'@

Replace-Exact `
  -Path $sharedPath `
  -Label "shared quote visibility check" `
  -Old @'
  const quote =
    tokenQuote &&
    PUBLIC_STATUSES.includes((tokenQuote.status ?? "draft") as (typeof PUBLIC_STATUSES)[number])
      ? tokenQuote
      : undefined;
'@ `
  -New @'
  const quote = tokenQuote && isQuotePubliclyViewable(tokenQuote.status) ? tokenQuote : undefined;
'@

Write-Host ""
Write-Host "Shared-plan fix applied." -ForegroundColor Cyan
Write-Host "Next run:" -ForegroundColor Cyan
Write-Host "  npx tsc --noEmit"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Then test:" -ForegroundColor Cyan
Write-Host "  Draft / doctor review -> View shared disabled"
Write-Host "  Approved / sent / viewed / accepted -> View shared opens"
