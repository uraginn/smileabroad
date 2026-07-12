# Enable clinic-only shared-plan preview

The previous patch intentionally disabled `View shared` for draft and review-stage quotes. That protected the public route, but it also prevented clinic staff from previewing the patient-facing page.

This patch adds two separate behaviors:

- **Preview shared:** available to the authenticated clinic user, even while the quote is draft/review.
- **View shared:** public link for approved/sent/viewed/accepted quotes.

Public security remains unchanged. A draft shared link opened without the correct logged-in clinic user still shows the unavailable page.

## Install

Place `apply-private-preview-fix.ps1` in the SmileAbroad project root and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\apply-private-preview-fix.ps1
```

Then:

```powershell
npx tsc --noEmit
npm run build
```

Test:

1. Open a draft quote or treatment plan while logged in as the clinic.
2. Click **Preview shared**.
3. The patient-facing shared design should open.
4. Open the same URL in an incognito window: it must remain unavailable until the quote is approved/public.
5. Change quote status to approved and save.
6. The action should become **View shared**.

Commit:

```powershell
git status
git add .
git commit -m "Enable secure clinic shared-plan preview"
git push origin main
```
