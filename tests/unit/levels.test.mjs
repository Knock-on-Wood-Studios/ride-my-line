import assert from "node:assert/strict";
import test from "node:test";
import { loadLevels, validateLevels } from "../../scripts/validate-levels.mjs";

const levels = await loadLevels();

test("the complete authored campaign passes schema validation", () => {
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

test("checkpoint directions are constrained", () => {
  const copy = structuredClone(levels);
  copy[5].checkpoints[0].direction = "sideways";
  const errors = validateLevels(copy);
  assert.ok(errors.some((error) => error.includes("checkpoint direction")));
});
