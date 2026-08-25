# Level authoring and expansion

Ride My Line should scale by composing visible physics rules, not by adding control complexity. Every yard keeps the same verbs: draw, reset, and go.

## Campaign structure

The launch campaign has a 12-yard opening run and a 13-yard mastery run. A future season should introduce at most one unfamiliar visible rule at a time before combining it with established mechanics. A returning player can enter a new run immediately; a first-time player should learn the rule before it becomes part of a compound contract.

The checked-in difficulty scale is 1–15. Yards 1–3 are fixed at 1, 2, and 3; Yard 4 must jump to at least 5; Yard 13 begins mastery difficulty at 11; later yards cannot decrease. Difficulty describes expected player execution and reasoning, not only gravity.

## Differentiation palette

Use combinations of:

- green draw zones and red no-ink zones;
- one, two, or three strokes;
- anchor pins;
- directional and speed-gated rings;
- chalk, rubber, and ice track behavior;
- wind fields and physical obstacles;
- air-time, impact, speed, angle, cargo, and parking contracts;
- optional stars that ask for a riskier route.

Advanced yards require at least two differentiating mechanics beyond the basic draw zone. Introduce only one unfamiliar visual rule at a time, then recombine it later.

## Authoring checklist

1. Copy the closest mechanical neighbor in `levels.js` for the opening run or `levels-launch.js` for mastery content, then assign the next ordered `yard-NN` ID.
2. Set a unique name, one-line objective, difficulty, ink budget, stroke count, material, geometry, launch, physics, friction, and optional contract mechanics.
3. Draw an authored reference solution with enough margin that minor engine and browser timing differences still clear.
4. Run `npm run validate`; this checks IDs, bounds, ranges, entire reference segments, zones, anchors, checkpoints, contracts, physics keys, mechanics count, ink feasibility, and difficulty order.
5. Run `npm run report:levels` and compare ink margin, gravity, launch speed, and mechanic count with neighboring yards.
6. Add the new yard to the authored-reference browser test and to at least one generic-pattern regression.
7. Run the playtest protocol in `docs/PLAYTESTING.md`. Do not ship an advanced yard with a zero-clear cohort or unexplained failures.

## Hundreds of levels without bloat

Keep each run or season in a separate data file, concatenate and validate them in load order, and include each content asset in the hashed build and offline cache. Load only the current and next season if total data becomes material. Reuse engine mechanics, visual language, and audio; expand with geometry and contract combinations before introducing another control. Archive telemetry by build and season so difficulty changes can be compared without a player identifier.
