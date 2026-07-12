# SmileAbroad shared-plan fix

This package fixes the `View shared` behavior without using Codex.

## What it fixes

- The Treatment Plan page was linking with `plan.share_token`, while the public shared route resolves `quote.share_token`.
- A share token was enough to show an active button, even when the Quote was still draft or under review.
- Public visibility status rules were duplicated.

After the fix:

- Draft/review/declined/expired quotes do not open the public shared page.
- Approved/sent/viewed/accepted quotes can open it.
- The Treatment Plan page uses the linked Quote's share token.
- The Quote page and public route use the same centralized rule.

## How to install

1. Extract this ZIP.
2. Copy `apply-shared-plan-fix.ps1` into the SmileAbroad project root:
   the folder that contains `package.json` and `src`.
3. Open PowerShell in that folder.
4. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\apply-shared-plan-fix.ps1
```

5. Validate:

```powershell
npx tsc --noEmit
npm run build
```

6. Start the project and test.

## Expected behavior

- Treatment plan is Draft or Awaiting Doctor Review:
  `View shared` is disabled.
- Quote is Approved, Sent, Viewed or Accepted:
  `View shared` opens the shared page.
- Invalid tokens continue to show the safe unavailable page.

## Commit

```powershell
git status
git add .
git commit -m "Fix shared plan availability controls"
git push origin main
```
