import assert from "node:assert/strict";
import test from "node:test";
import { loadLevels, validateLevels } from "../../scripts/validate-levels.mjs";

const levels = await loadLevels();

test("the complete authored campaign passes schema validation", () => {
  assert.equal(levels.length, 25);
  assert.deepEqual(validateLevels(levels), []);
});

test("duplicate and out-of-order level ids are rejected", () => {
  const copy = structuredClone(levels);
  copy[1].id = copy[0].id;
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("expected ordered id")));
  assert.ok(errors.some((error) => error.includes("duplicate id")));
});

test("reference solutions must stay inside authored draw zones", () => {
  const copy = structuredClone(levels);
  copy[1].reference[0][1] = { x: 700, y: 1200 };
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("outside draw zones")));
});

test("reference solutions must fit within the ink budget", () => {
  const copy = structuredClone(levels);
  copy[0].inkMax = 1;
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("inkMax")));
});

test("reference solutions must qualify for the authored craft medal", () => {
  const copy = structuredClone(levels);
  copy[3].rules.parInk = 0.2;
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("craft medal")));
});

test("checkpoint directions are constrained", () => {
  const copy = structuredClone(levels);
  copy[5].checkpoints[0].direction = "sideways";
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("checkpoint direction")));
});

test("reference segments cannot tunnel through a no-draw zone", () => {
  const copy = structuredClone(levels);
  copy[2].reference = [[{ x: 340, y: 650 }, { x: 404, y: 650 }]];
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("reference segment") && error.includes("no-draw")));
});

test("the first three yards stay gentle before the advanced ramp", () => {
  assert.deepEqual(Array.from(levels.slice(0, 4), (level) => level.difficulty), [1, 2, 3, 5]);
  const copy = structuredClone(levels);
  copy[3].difficulty = 3;
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("advanced campaign must ramp")));
});

test("unknown physics knobs are rejected instead of silently ignored", () => {
  const copy = structuredClone(levels);
  copy[4].physics.magicBoost = 99;
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("invalid physics magicBoost")));
});

test("the mastery run escalates through a diverse mechanic palette", () => {
  const mastery = levels.slice(12);
  assert.deepEqual(Array.from(new Set(mastery.map((level) => level.rules.material))).sort(), ["chalk", "ice", "rubber"]);
  assert.ok(mastery.some((level) => level.rules.maxStrokes === 3));
  assert.ok(mastery.some((level) => level.rules.anchors?.length === 4));
  assert.ok(mastery.filter((level) => level.cargo).length >= 2);
  assert.ok(mastery.filter((level) => level.fields?.length).length >= 4);
  assert.equal(mastery.at(-1).difficulty, 15);
});
