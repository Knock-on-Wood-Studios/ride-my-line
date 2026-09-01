# Ride My Line 1.2.0 production audit

Audit date: September 1, 2026  
Release: 1.2.0  
Application commit: `f437fda`  
Cloudflare deployment: `443e557e-57bf-401f-a2f3-1f5245675d79`  
Build version: `9870a6d7a515`  
Public URL: <https://ride-my-line.robertwood50.workers.dev>

## Verdict

Ride My Line 1.2.0 passes the production release gate with a completely revised live-asset audio mix. No launch-blocking findings remain.

The release keeps the existing compact sound controls and replaces the previous voice and effects palette with playful backyard slapstick: short joy, fall, landing, and victory reactions; spring and toy Foley; pizzicato rewards; and calmer material, wheel, wind, and drawing texture.

## Audio evidence

- The runtime references 21 checked-in recordings and contains no oscillator or synthesized fallback path.
- Production browser decoding loaded all 21 recordings with zero failures or console errors.
- Rider reactions are restricted to one simultaneous voice. Panic and landing reactions interrupt an older voice rather than stacking over it.
- Cooldowns and polyphony caps cover pencil, wheel, wind, impact, rubber, result, and voice events. A rapid-cue browser test stayed at one rider voice and four total active sample voices.
- Drawing now uses short offset grains from the real pencil recording; wheel timing follows speed; wind is restrained; rubber rotates among a boing and two toy squeaks.
- Success and failure use distinct pizzicato cues. Victory rotates between a short “woohoo” and an occasional “yippee”; falling and hard crashes use dedicated comic reactions.
- Music remains independently controllable, ducks under reactions, and changes level between drawing, running, and result states.
- Peak analysis found no clipped source asset. Every shipped recording is represented exactly once in `assets/audio/LICENSES.json`, with required attribution also recorded in `THIRD_PARTY_NOTICES.md`.

## Release evidence

- `npm run check`: passed 25-level validation, 21 unit/security tests, and production build verification.
- `npm test`: 228 end-to-end tests passed across mobile Chromium, desktop Chromium, desktop Firefox, and mobile WebKit.
- The complete 25-yard authored campaign and all twelve repeated-move regressions still pass in every browser profile.
- Production build: 49 files, 1,263 KiB.
- `npm audit --omit=dev`: zero production dependency vulnerabilities.
- The Impeccable detector reported zero findings for the changed audio and gameplay targets.
- The live root and new falling-voice asset returned HTTP 200 with the expected security and cache headers.
- The live build manifest references `static/audio.038b47d902aa.js` and `static/game.1b9072947965.js`.
- `/api/health` returned `{"ok":true,"analytics":true}`.
- A fresh live browser session confirmed build `9870a6d7a515`, the `backyard-slapstick-v2` profile, all 21 decoded samples, 25 yard buttons, enforced voice caps, and zero console errors.

## Intentional follow-up, not a release blocker

The automated gates verify decoding, triggering, provenance, mix safety, and regression behavior; they cannot replace listening sessions on varied speakers and headphones. Collect qualitative playtest notes specifically on voice charm, repetition fatigue, music balance, and whether important physics events remain legible, then tune gains and cue frequency without changing the one-control gameplay model.

## Release decision

**Approved and deployed to production.** Tag the audited release as `v1.2.0` after this report is committed.
