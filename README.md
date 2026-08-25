# Ride My Line

A production-ready browser physics game from Knock on Wood Studios.

Draw a catch. A junk wagon drops off a high ledge. Gravity spends the speed. Miss, curse, redraw in five seconds.

## Why a vehicle, not liquid

The player is a stick rider in a two-wheel cart, not a puddle of lava. Liquid (lava, water) is a later track material you might draw through or over, not the thing you steer. A wagon has wheels, flips, and a face that reads in a mute clip. A blob does not.

## How to play

1. You start on yard 1 of 25. A high ledge, a gap, a flag. Draw the catch (finger or mouse). Ink is limited.
2. Tap GO. The cart rolls off the ledge and drops in. A short shove, then physics owns it.
3. A curve that meets the fall whooshes. A flat bridge under a tall drop pancakes. Reach the flag.
4. The star is greedy: a worse line, extra points. Skip it if you want the flag only.
5. Wipe out? PLAY AGAIN keeps your line. RESET LINE starts the scribble over. Either way, under a second.
6. Clear a yard to unlock the next. Replay any unlocked yard from the tiny yard chip. NEXT YARD is on the result card.

## Challenge slice

The controls stay the same in every yard: draw, then tap GO. The first three yards teach the basics in sequence: a free draw, a labeled green drawing zone, then a forgiving two-line gap with a red no-ink area. Yards 4–12 ramp gravity, rebound, suspension, friction, wind, launch speed, anchor pins, directional rings, mandatory gaps, rubber and ice ink, fragile cargo, and controlled finishes. Yards 13–25 form a mastery run that recombines those visible rules into tailwind turns, ice needles, rubber relays, pinned deliveries, three-gap stitches, storm gates, and a three-stage parking finale. Twelve sampled yards reject the repeated generic swoop. Each real solution can earn up to three persistent medals: clear the contract, collect the star, and beat the ink par.

## Local preview

Install dependencies with `npm ci`, then run `npm run dev`. The production build vendors the pinned Matter.js package and writes content-hashed assets to `dist/`.

Use `npm run check` for level validation, unit tests, syntax checks, and a production build. Use `npm run test:e2e` for the 25-yard authored-solution suite and the repeated-swoop regression.

Every level is checked for ordered IDs, supported mechanics, valid geometry and ranges, complete reference segments, anchors, checkpoint directions, differentiating mechanics, difficulty progression, ink-budget feasibility, and craft-medal feasibility before a build can complete. `npm run report:levels` prints the campaign’s difficulty and mechanic matrix.

The browser gate runs the entire campaign and the one-move regression in mobile and desktop Chromium, desktop Firefox, and mobile WebKit. GitHub Actions runs the same gates on every pull request and push to `main`.

## Audio

Sound unlocks on the first draw or GO interaction. The HUD keeps a single compact sound control, with separate settings for music, effects, and rider reactions. The current build uses a licensed 24-second OpenMusic loop plus recorded game-audio assets for pencil, wheel, impact, surface, UI, and human rider reactions. It does not synthesize sound effects or voices.

The music lives at `assets/audio/ride-my-line-backyard-loop.mp3`; its OpenMusic commercial license was issued to Robert Wood on August 25, 2026. The audio director loops it, ducks it under rider reactions, and pauses it when the page is hidden. Asset provenance and attribution are recorded in `assets/audio/LICENSES.json` and `THIRD_PARTY_NOTICES.md`.

## Production

The build produces content-hashed executable assets, a strict same-origin security policy, a complete offline cache, install metadata and icons, user-facing privacy/terms/support pages, a health endpoint, and privacy-conscious aggregate difficulty telemetry backed by Cloudflare Analytics Engine. Product telemetry has no cookie, account, session ID, device ID, referrer, browsing history, or arbitrary text, and honors Global Privacy Control and Do Not Track.

Release, rollback, monitoring, playtest, and level-expansion procedures live in `docs/`. See `PRIVACY.md`, `SECURITY.md`, `SUPPORT.md`, `LICENSE.md`, and `THIRD_PARTY_NOTICES.md` for the project policies.


## Core loop

Drop-in start. Draw a catch, fail funny, redraw immediately. Twenty-five yards, no campaign chrome. Almost no tutorial.

## Intentionally out of scope for this release

Economy, login, share URLs, ragdoll rider, liquid player, accounts, ads, shop.
