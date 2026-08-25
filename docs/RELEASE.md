# Release runbook

## Preconditions

- Work from a clean, reviewed branch based on the latest `main`.
- Confirm the checked-in OpenMusic license record is retained privately by Knock on Wood Studios and `assets/audio/LICENSES.json` matches every shipped audio file.
- Confirm Cloudflare authentication targets the intended Knock on Wood Studios account and Worker named `ride-my-line`.

## Quality gate

Run:

```sh
npm ci
npm audit --audit-level=high
npm run check
npm run test:e2e
WRANGLER_LOG_PATH=/tmp/ride-my-line-wrangler.log npx wrangler deploy --dry-run
```

Every command must exit successfully. Review `dist/build-manifest.json`, the Playwright report, and the worktree diff. Do not deploy from an uncommitted build.

## Deploy and verify

1. Record the current deployment with `npx wrangler deployments list --name ride-my-line --json`.
2. Deploy with `npm run deploy`.
3. Verify `/api/health` returns HTTP 200 with `{"ok":true,"analytics":true}`.
4. Verify the root document, a hashed `/static/*` file, `manifest.webmanifest`, `service-worker.js`, and one audio sample all return HTTP 200.
5. Verify the root response has CSP, HSTS, `nosniff`, `DENY`, referrer, permissions, and cross-origin headers. Verify hashed files have the immutable one-year cache rule.
6. Smoke-test Yard 1 by touch or mouse, Yard 1 by keyboard only, one advanced reference yard, sound category switches, two-step progress reset, reduced motion, and offline reload after one online visit.
7. Confirm a real attempt appears in Workers Analytics Engine and no client or Worker exceptions appear in observability.
8. Tag the exact release commit only after production verification.

## Rollback

If the health endpoint, asset load, CSP, game boot, or Yard 1 smoke test fails:

1. Stop the rollout and copy the failing deployment ID into the incident notes.
2. Find the last known-good version with `npx wrangler deployments list --name ride-my-line`.
3. Run `npx wrangler rollback <version-id> --name ride-my-line --message "rollback: <reason>"`.
4. Repeat every production verification step above.
5. Open a regression issue with the failed version, symptom, browser, UTC timestamps, and rollback version.
