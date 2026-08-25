# Level authoring and expansion

Ride My Line should scale by composing visible physics rules, not by adding control complexity. Every yard keeps the same verbs: draw, reset, and go.

## Campaign structure

Build content in 12-yard seasons. Each season should have three readable onboarding yards, six escalating combination yards, two mastery yards, and one boss yard. A returning player can start a new season immediately; a first-time player should learn each new visual rule before it is combined with another.

The checked-in difficulty scale is 1–10. Yards 1–3 are fixed at 1, 2, and 3; Yard 4 must jump to at least 5; later yards cannot decrease. Difficulty describes expected player execution and reasoning, not only gravity.

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

1. Copy the closest mechanical neighbor in `levels.js` and assign the next ordered `yard-NN` ID.
2. Set a unique name, one-line objective, difficulty, ink budget, stroke count, material, geometry, launch, physics, friction, and optional contract mechanics.
3. Draw an authored reference solution with enough margin that minor engine and browser timing differences still clear.
4. Run `npm run validate`; this checks IDs, bounds, ranges, entire reference segments, zones, anchors, checkpoints, contracts, physics keys, mechanics count, ink feasibility, and difficulty order.
5. Run `npm run report:levels` and compare ink margin, gravity, launch speed, and mechanic count with neighboring yards.
6. Add the new yard to the authored-reference browser test and to at least one generic-pattern regression.
7. Run the playtest protocol in `docs/PLAYTESTING.md`. Do not ship an advanced yard with a zero-clear cohort or unexplained failures.

## Hundreds of levels without bloat

Keep each season in a separate data file once the campaign exceeds 24 yards, then concatenate validated seasons in the build. Load only the current and next season if total data becomes material. Reuse engine mechanics, visual language, and audio; expand with geometry and contract combinations before introducing another control. Archive telemetry by build and season so difficulty changes can be compared without a player identifier.
