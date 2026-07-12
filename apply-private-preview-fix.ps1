$ErrorActionPreference = "Stop"

$root = Get-Location
$required = @(
  "src/routes/pro.quotes.`$id.tsx",
  "src/routes/pro.treatment-plans.`$id.tsx",
  "src/routes/shared.treatment-plan.`$token.tsx",
  "src/lib/quote-visibility.ts"
)

foreach ($file in $required) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Project root not detected or the previous fix is missing. Missing: $file"
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
    throw "Could not apply '$Label'. Expected code was not found in $Path."
  }
  Set-Content -LiteralPath $Path -Value ($content.Replace($Old, $New)) -Encoding utf8
  Write-Host "Updated: $Path ($Label)" -ForegroundColor Green
}

# QUOTE PAGE: public link when public, authenticated private preview when not public.
$quotePath = Join-Path $root "src/routes/pro.quotes.`$id.tsx"
Replace-Exact `
  -Path $quotePath `
  -Label "enable quote private preview" `
  -Old @'
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
'@ `
  -New @'
            {quote.share_token ? (
              <Button asChild variant="outline">
                <Link
                  to="/shared/treatment-plan/$token"
                  params={{ token: quote.share_token }}
                  search={isQuotePubliclyViewable(status) ? {} : { preview: true }}
                >
                  <ExternalLink className="size-4 mr-1" />
                  {isQuotePubliclyViewable(status) ? "View shared" : "Preview shared"}
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled
                title="A shared link has not been created yet"
              >
                <ExternalLink className="size-4 mr-1" /> Preview shared
              </Button>
            )}
'@

# TREATMENT PLAN PAGE: same behavior through the linked Quote.
$treatmentPath = Join-Path $root "src/routes/pro.treatment-plans.`$id.tsx"
Replace-Exact `
  -Path $treatmentPath `
  -Label "enable treatment plan private preview" `
  -Old @'
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
'@ `
  -New @'
            {existingQuote?.share_token ? (
              <Button asChild variant="outline">
                <Link
                  to="/shared/treatment-plan/$token"
                  params={{ token: existingQuote.share_token }}
                  search={
                    isQuotePubliclyViewable(existingQuote.status) ? {} : { preview: true }
                  }
                >
                  <ExternalLink className="size-4 mr-1" />
                  {isQuotePubliclyViewable(existingQuote.status)
                    ? "View shared"
                    : "Preview shared"}
                </Link>
              </Button>
            ) : existingQuote ? (
              <Button
                type="button"
                variant="outline"
                disabled
                title="Open the quote to prepare its shared link"
              >
                <ExternalLink className="size-4 mr-1" /> Preview shared
              </Button>
            ) : null}
'@

# SHARED PAGE: allow a secure clinic-only preview for non-public quote statuses.
$sharedPath = Join-Path $root "src/routes/shared.treatment-plan.`$token.tsx"

Replace-Exact `
  -Path $sharedPath `
  -Label "add auth import" `
  -Old 'import { isQuotePubliclyViewable } from "@/lib/quote-visibility";' `
  -New @'
import { isQuotePubliclyViewable } from "@/lib/quote-visibility";
import { useAuth } from "@/lib/auth/mock-auth";
'@

Replace-Exact `
  -Path $sharedPath `
  -Label "add preview search schema" `
  -Old @'
export const Route = createFileRoute("/shared/treatment-plan/$token")({ component: SharedPlan });
'@ `
  -New @'
export const Route = createFileRoute("/shared/treatment-plan/$token")({
  validateSearch: (search: Record<string, unknown>) => ({
    preview:
      search.preview === true ||
      search.preview === "true" ||
      search.preview === "1",
  }),
  component: SharedPlan,
});
'@

Replace-Exact `
  -Path $sharedPath `
  -Label "secure private preview resolution" `
  -Old @'
function SharedPlan() {
  const { token } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const tokenQuote = useMockStore((s) => s.quotes.find((quote) => quote.share_token === token));
  const quote = tokenQuote && isQuotePubliclyViewable(tokenQuote.status) ? tokenQuote : undefined;
'@ `
  -New @'
function SharedPlan() {
  const { token } = Route.useParams();
  const { preview } = Route.useSearch();
  const activeUser = useAuth((state) => state.user);
  const hydrated = useMockStoreHydrated();
  const tokenQuote = useMockStore((s) => s.quotes.find((quote) => quote.share_token === token));
  const canClinicPreview =
    Boolean(preview) &&
    Boolean(tokenQuote) &&
    Boolean(activeUser) &&
    (activeUser?.role === "platform_admin" || activeUser?.clinic_id === tokenQuote?.clinic_id);
  const quote =
    tokenQuote && (isQuotePubliclyViewable(tokenQuote.status) || canClinicPreview)
      ? tokenQuote
      : undefined;
'@

Replace-Exact `
  -Path $sharedPath `
  -Label "do not mark private previews as viewed" `
  -Old @'
  useEffect(() => {
    if (quote?.status === "sent") updateQuote(quote.id, { status: "viewed" }, "patient_shared");
  }, [quote?.id, quote?.status, updateQuote]);
'@ `
  -New @'
  useEffect(() => {
    if (!preview && quote?.status === "sent")
      updateQuote(quote.id, { status: "viewed" }, "patient_shared");
  }, [preview, quote?.id, quote?.status, updateQuote]);
'@

Write-Host ""
Write-Host "Private shared-plan preview enabled." -ForegroundColor Cyan
Write-Host "Run:" -ForegroundColor Cyan
Write-Host "  npx tsc --noEmit"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Expected:" -ForegroundColor Cyan
Write-Host "  Draft/review quote + logged-in clinic user -> Preview shared works"
Write-Host "  Approved/sent/viewed/accepted -> View shared works publicly"
Write-Host "  Draft link opened without clinic login -> still unavailable"
