# Always-OSS Mode Plan

Goal: Run the stack strictly as Open Source (OSS) every time, ignoring licenses and disabling all Enterprise/Cloud behaviors, with minimal, safe, and reversible changes.

---

## Summary
- Force the server to report OPEN_SOURCE, regardless of any license-related environment variables.
- Ensure the UI consumes OPEN_SOURCE from /settings and behaves as OSS.
- Avoid initializing Enterprise/Cloud subsystems (Stripe, SSO, org/billing), and make the setup easy to toggle via an environment variable.

---

## Approach
Two safe options (recommend Option B):

- Option A (Hard-force): Change server logic to always return OPEN_SOURCE platform unconditionally.
- Option B (Env-controlled, recommended): Introduce an env flag (FORCE_OSS=true) to short-circuit platform detection so platform is OPEN_SOURCE and license is ignored. This keeps compatibility with upstream and lets you toggle behavior without code edits.

---

## Detailed Tasks

1) Server: Add FORCE_OSS short-circuit in IdentityManager
- File: <mcfile name="IdentityManager.ts" path="c:\Users\nahue\Desktop\Freia\packages\server\src\IdentityManager.ts"></mcfile>
- In the private method that validates the license ("_validateLicenseKey") add an early return:
  - If process.env.FORCE_OSS === 'true':
    - Set this.licenseValid = false
    - Set this.currentInstancePlatform = Platform.OPEN_SOURCE
    - Return immediately (skip the rest of the license verification)
- In initialize(), guard Stripe initialization when FORCE_OSS is true so StripeManager is not created.

2) Server: Ensure /settings infers platform from IdentityManager
- File: <mcfile name="index.ts" path="c:\Users\nahue\Desktop\Freia\packages\server\src\services\settings\index.ts"></mcfile>
- This service already composes PLATFORM_TYPE using identityManager.getPlatformType(). With FORCE_OSS in place, the endpoint will return OPEN_SOURCE regardless of other envs.

3) UI: Consume PLATFORM_TYPE and set OSS mode
- Files: 
  - <mcfile name="ConfigContext.jsx" path="c:\Users\nahue\Desktop\Freia\packages\ui\src\store\context\ConfigContext.jsx"></mcfile>
  - <mcfile name="platformsettings.js" path="c:\Users\nahue\Desktop\Freia\packages\ui\src\api\platformsettings.js"></mcfile>
- No changes required if /settings returns OPEN_SOURCE. UI will set isOpenSource = true and hide non-OSS features automatically. Optionally, keep a tiny defensive fallback: if PLATFORM_TYPE is missing/unknown, default to OSS.

4) Configuration: Add FORCE_OSS to your environments
- Local dev: set FORCE_OSS=true when running server.
  - Add to packages/server/.env or your shell env.
- Docker: add under the server service environment:
  - File: docker/docker-compose.yml
  - environment:
    - FORCE_OSS: "true"
- Ensure FLOWISE_EE_LICENSE_KEY, LICENSE_URL, OFFLINE are unset (or ignored, since FORCE_OSS will short-circuit).

5) Blockers you won’t hit in OSS mode
- Stripe-related endpoints (billing, plans) will remain inactive/not initialized.
- SSO providers are not initialized unless the Enterprise/Cloud platform is active.
- Any Enterprise/Cloud-only routes or UI are hidden because platform = OPEN_SOURCE.

6) QA Checklist
- Start backend: `npx pnpm start` at repo root with FORCE_OSS=true present.
- Start UI dev server (separate):
  - With pnpm: `pnpm --filter "./packages/ui" start`
  - Or: `cd packages/ui && npx vite --port 5174`
- Verify GET /settings returns PLATFORM_TYPE: OPEN_SOURCE.
- Verify UI renders OSS-only elements and hides non-OSS (e.g., upgrade/billing/SSO controls).

7) Optional Cleanups (Only if you want to remove UI affordances)
- If any enterprise CTA (like Upgrade) still shows up, ensure it’s behind isOpenSource === false in:
  - Header: <mcfile name="index.jsx" path="c:\Users\nahue\Desktop\Freia\packages\ui\src\layout\MainLayout\Header\index.jsx"></mcfile>
- This is not strictly necessary if ConfigContext already sets isOpenSource correctly.

8) Revert Path
- Remove FORCE_OSS from env to restore default platform detection.
- No code change required if you used Option B; if you used Option A, restore the original logic in IdentityManager.

---

## Implementation Notes
- Keep the FORCE_OSS check as the first statement in _validateLicenseKey() to guarantee the short-circuit.
- Do not remove enterprise imports; simply avoid initializing them. This reduces risk and keeps diffs minimal.
- Keeping an env-controlled switch is the most maintainable approach and simplest to merge/rebase.

---

## Estimated Effort
- Code changes: ~10–20 minutes
- Env/Docker updates: ~5–10 minutes
- QA: ~10 minutes

---

## Run Commands Reference
- Backend: `npx pnpm start` (root)
- UI: `pnpm --filter "./packages/ui" start` or `cd packages/ui && npx vite --port 5174`

That’s it—once FORCE_OSS is set, the platform will be OPEN_SOURCE end-to-end with license checks effectively inert.