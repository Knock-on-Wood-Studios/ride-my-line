# Ride My Line 1.3.0 production and play audit

- Audit date: September 2, 2026
- Release candidate: 1.3.0
- Candidate branch: `codex/prime-time-pass`
- Build version: `e9cec0c6ca38`
- Production status: not deployed by this audit

## Verdict

Ride My Line 1.3.0 passes the automated production and full-campaign play gate. The release candidate is ready for review and merge. No code, asset, layout, cross-browser, or automated gameplay blocker remains.

The remaining launch gates require people or production authority outside this audit: a blind-player cohort using the protocol in `docs/PLAYTESTING.md`, confirmation that the GitHub `production` environment has required reviewers and Cloudflare secrets, and the post-deploy live smoke checks in `docs/RELEASE.md`.

## Deficiencies remediated

- Result screens now present one obvious next action: advance after a clear, retry the same line after a wipeout, or ride again after the crown. Replay and redraw remain nearby without competing for attention.
- Failure results explain the specific recovery instead of showing only a failure label.
- Every yard now keeps personal best score, fastest clear, leanest line, and medals. Corrupt or older saves recover safely, and the two-step campaign reset clears every record.
- Yard 12 now marks the start of the mastery run; Yard 25 has a distinct campaign-completion crown.
- Compact phone landscape receives a portrait recommendation with an explicit “Play Sideways” escape. Portrait, short-phone, landscape, and desktop layouts have no page overflow or undersized controls in the audited states.
- Patrick Hand is self-hosted as WOFF2 with its complete SIL Open Font License, removing the external font dependency while strengthening the hand-drawn visual identity.
- Pull requests into `main` now run the complete quality gate. Production deployment has a separate manual workflow bound to the GitHub `production` environment and an explicitly audited ref.
- Repeated mobile WebKit sampling exposed frame-edge airtime rejections on late-game authored routes. Nine airtime contracts received safety margin without changing their gates, materials, stroke limits, wind, speed, parking, or one-move rejection behavior.

## Full play evidence

- All 25 authored reference routes cleared in mobile Chromium, desktop Chromium, desktop Firefox, and mobile WebKit.
- All twelve sampled repeated-swoop routes failed in every browser profile: Yards 4, 6, 8, 10, 12, 13, 15, 17, 19, 21, 23, and 25.
- The first three yards retain their 1–2–3 difficulty onboarding before Yard 4 steps to difficulty 5. The 13-yard mastery run retains its mixed chalk, ice, rubber, wind, anchors, cargo, gaps, directional checkpoints, and precision finishes.
- A 125-run WebKit margin sample exercised every authored yard five times. It found two unsafe contract edges during the audit; after remediation the same sample completed with zero failures. Yard 24 also passed ten consecutive focused runs, and the Yard 12/Yard 25 milestones passed twenty focused runs.
- Clear, failure, boss, and crown progression flows passed with their intended calls to action and record persistence.
- Pointer, touch-profile, and keyboard-only play passed. The result dialog owns focus, the game behind it becomes inert, yard selection uses native buttons, and progress reset requires confirmation.
- Real audio assets decoded successfully, controls remained independently operable, and rapid events stayed inside voice and sample polyphony caps.
- The 320×568 control surface, the 25-yard chooser, mobile landscape prompt, reduced-motion startup, render-on-demand idle state, active simulation rendering, and four-megapixel canvas cap all passed.
- Audio settings, unlock progress, records, reset behavior, corrupt-save recovery, privacy-respecting telemetry, and Do Not Track behavior all passed.

## Release evidence

- `npm audit --audit-level=high`: zero vulnerabilities.
- `npm test`: 25 unit, schema, security, PWA, licensing, and release-governance checks passed; 248 end-to-end scenarios passed.
- Production build: 51 files, 1,301 KiB; build verification passed.
- Cloudflare dry run: 57 asset files read, Worker bundle 3.67 KiB / 1.41 KiB gzip, Analytics Engine and static asset bindings resolved, and no deployment was performed.
- Interface anti-pattern detector: zero findings.
- Bounded visual QA: success, failure, Yard 12 boss, Yard 25 crown, compact phone, phone landscape, and desktop states loaded the self-hosted font, stayed within the viewport, and emitted zero console errors.
- `git diff --check`: passed.

## External release gates

1. Run at least twelve uncoached sessions and record anonymous results using `docs/PLAYTEST_RESULTS_TEMPLATE.md`. The automated authored routes establish solvability; they do not establish human comprehension, delight, or fair difficulty.
2. Protect `main`, require the `Quality gates` check, and configure required reviewers plus Cloudflare secrets on the GitHub `production` environment.
3. Merge the reviewed release candidate, dispatch `Deploy production` with the exact audited ref, and complete the live health, headers, cache, offline, audio, gameplay, analytics, and observability smoke checks.

## Release decision

**Approved for pull request and human playtest. Not yet approved as a verified production deployment.**
