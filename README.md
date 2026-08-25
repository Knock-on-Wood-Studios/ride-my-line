# Ride My Line

Knock on Wood Studios prototype.

Draw a catch. A junk wagon drops off a high ledge. Gravity spends the speed. Miss, curse, redraw in five seconds.

## Why a vehicle, not liquid

The player is a stick rider in a two-wheel cart, not a puddle of lava. Liquid (lava, water) is a later track material you might draw through or over, not the thing you steer. A wagon has wheels, flips, and a face that reads in a mute clip. A blob does not.

## How to play

1. You start on yard 1 of 12. A high ledge, a gap, a flag. Draw the catch (finger or mouse). Ink is limited.
2. Tap GO. The cart rolls off the ledge and drops in. A short shove, then physics owns it.
3. A curve that meets the fall whooshes. A flat bridge under a tall drop pancakes. Reach the flag.
4. The star is greedy: a worse line, extra points. Skip it if you want the flag only.
5. Wipe out? PLAY AGAIN keeps your line. RESET LINE starts the scribble over. Either way, under a second.
6. Clear a yard to unlock the next. Replay any unlocked yard from the tiny yard chip. NEXT YARD is on the result card.

## Challenge slice

The controls stay the same in every yard: draw, then tap GO. The first three yards teach the basics in sequence: a free draw, a labeled green drawing zone, then a forgiving two-line gap with a red no-ink area. After that, gravity, rebound, suspension, friction, wind, and launch speed ramp quickly, while later yards add anchor pins, directional rings, mandatory gaps, rubber and ice ink, fragile cargo, and controlled finishes. The repeated-swoop regression still fails before the advanced campaign, so the opening yards stay forgiving without becoming one-move copies. Each real solution can earn up to three persistent medals: clear the contract, collect the star, and beat the ink par.

## Local preview

Install dependencies with `npm ci`, then run `npm run dev`. The production build vendors the pinned Matter.js package and writes content-hashed assets to `dist/`.

Use `npm run check` for level validation, unit tests, syntax checks, and a production build. Use `npm run test:e2e` for the 12-yard authored-solution suite and the repeated-swoop regression.

Every level is checked for ordered IDs, supported mechanics, valid geometry, legal reference strokes, checkpoint directions, and ink-budget feasibility before a build can complete. GitHub Actions runs the same gates on every pull request and push to `main`.

## Audio

Sound unlocks on the first draw or GO interaction and can be muted from the HUD. The current build uses a licensed 24-second OpenMusic loop, procedural material effects, and local system speech for rider reactions, with synthesized music and yelps as fallbacks.

The music lives at `assets/audio/ride-my-line-backyard-loop.mp3`; its OpenMusic commercial license was issued to Robert Wood on August 25, 2026. The audio director loops it, ducks it under rider reactions, and pauses it when the page is hidden. If the file cannot load, the game automatically falls back to its lightweight Web Audio score.


## What this proto is testing

Drop-in start. Draw a catch, fail funny, redraw immediately. Twelve yards, no campaign chrome. Almost no tutorial.

## Out of scope

Economy, login, share URLs, ragdoll rider, liquid player, accounts, ads, shop.
