# Release runbook

## Preconditions

- Work from a clean, reviewed branch based on the latest `main`.
- Require the `Quality gates` workflow on pull requests into `main`; do not push release work directly to the protected branch.
- Configure the GitHub `production` environment with required reviewers and the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
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

Every command must exit successfully. Review `dist/build-manifest.json`, the Playwright report, the current production audit, and the worktree diff. Do not deploy from an uncommitted build.

## Deploy and verify

1. Merge the reviewed pull request only after `Quality gates` passes, then record the exact audited `main` commit or release tag.
2. Record the current deployment with `npx wrangler deployments list --name ride-my-line --json`.
3. Run the `Deploy production` GitHub Actions workflow with that exact ref and approve its protected `production` environment. Use local `npm run deploy` only for a documented recovery when Actions is unavailable.
4. Verify `/api/health` returns HTTP 200 with `{"ok":true,"analytics":true}`.
5. Verify the root document, a hashed `/static/*` file, `manifest.webmanifest`, `service-worker.js`, one font, and one audio sample all return HTTP 200.
6. Verify the root response has CSP, HSTS, `nosniff`, `DENY`, referrer, permissions, and cross-origin headers. Verify hashed files have the immutable one-year cache rule.
7. Smoke-test Yard 1 by touch or mouse, Yard 1 by keyboard only, one advanced reference yard, the Yard 12 and Yard 25 milestones, personal-record persistence, sound category switches, two-step progress reset, the compact landscape prompt, reduced motion, and offline reload after one online visit.
8. Confirm a real attempt appears in Workers Analytics Engine and no client or Worker exceptions appear in observability.
9. Tag the exact release commit only after production verification.

## Rollback

If the health endpoint, asset load, CSP, game boot, or Yard 1 smoke test fails:

1. Stop the rollout and copy the failing deployment ID into the incident notes.
2. Find the last known-good version with `npx wrangler deployments list --name ride-my-line`.
3. Run `npx wrangler rollback <version-id> --name ride-my-line --message "rollback: <reason>"`.
4. Repeat every production verification step above.
5. Open a regression issue with the failed version, symptom, browser, UTC timestamps, and rollback version.
