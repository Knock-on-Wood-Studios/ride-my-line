import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "levels.js");
const DESIGN_WIDTH = 720;
const DESIGN_HEIGHT = 1280;
const MATERIALS = new Set(["chalk", "rubber", "ice"]);
const DIRECTIONS = new Set(["up", "down", "left", "right"]);

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function inBounds(point) {
  return finiteNumber(point?.x) && finiteNumber(point?.y) &&
    point.x >= 0 && point.x <= DESIGN_WIDTH && point.y >= 0 && point.y <= DESIGN_HEIGHT;
}

function validRect(rect) {
  return inBounds(rect) && finiteNumber(rect?.w) && finiteNumber(rect?.h) &&
    rect.w > 0 && rect.h > 0 && rect.x + rect.w <= DESIGN_WIDTH && rect.y + rect.h <= DESIGN_HEIGHT;
}

function contains(rect, point, padding = 0) {
  return point.x >= rect.x - padding && point.x <= rect.x + rect.w + padding &&
    point.y >= rect.y - padding && point.y <= rect.y + rect.h + padding;
}

function strokeLength(stroke) {
  let length = 0;
  for (let index = 1; index < stroke.length; index += 1) {
    length += Math.hypot(stroke[index].x - stroke[index - 1].x, stroke[index].y - stroke[index - 1].y);
  }
  return length;
}

export async function loadLevels(path = sourcePath) {
  const source = await readFile(path, "utf8");
  const adjacentDuplicate = source.match(/^\s*([A-Za-z_$][\w$]*):[^\n]*\n\s*\1:/m);
  if (adjacentDuplicate) {
    throw new Error(`Duplicate adjacent key in levels source: ${adjacentDuplicate[1]}`);
  }

  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: path });
  if (!Array.isArray(sandbox.RML_LEVELS)) throw new Error("levels.js did not define RML_LEVELS");
  return sandbox.RML_LEVELS;
}

export function validateLevels(levels) {
  const errors = [];
  const ids = new Set();

  if (!Array.isArray(levels) || levels.length === 0) return ["At least one level is required"];

  levels.forEach((level, index) => {
    const label = level?.id || `level ${index + 1}`;
    const expectedId = `yard-${String(index + 1).padStart(2, "0")}`;

    if (level?.id !== expectedId) errors.push(`${label}: expected ordered id ${expectedId}`);
    if (ids.has(level?.id)) errors.push(`${label}: duplicate id`);
    ids.add(level?.id);
    if (typeof level?.name !== "string" || !level.name.trim()) errors.push(`${label}: name is required`);
    if (typeof level?.objective !== "string" || !level.objective.trim()) errors.push(`${label}: objective is required`);
    if (!finiteNumber(level?.inkMax) || level.inkMax <= 0) errors.push(`${label}: inkMax must be positive`);
    if (!Number.isInteger(level?.rules?.maxStrokes) || level.rules.maxStrokes < 1 || level.rules.maxStrokes > 3) {
      errors.push(`${label}: rules.maxStrokes must be an integer from 1 to 3`);
    }
    if (!MATERIALS.has(level?.rules?.material)) errors.push(`${label}: unsupported material`);
    if (!finiteNumber(level?.rules?.parInk) || level.rules.parInk <= 0 || level.rules.parInk > 1) {
      errors.push(`${label}: rules.parInk must be greater than 0 and at most 1`);
    }

    for (const key of ["ledge", "landing"]) {
      if (!validRect(level?.[key])) errors.push(`${label}: invalid ${key} rectangle`);
    }
    for (const key of ["flag", "star", "push"]) {
      if (!inBounds(level?.[key])) errors.push(`${label}: invalid ${key} point`);
    }

    for (const [groupName, rectangles] of [
      ["drawZones", level?.rules?.drawZones || []],
      ["noDrawZones", level?.rules?.noDrawZones || []]
    ]) {
      if (!Array.isArray(rectangles) || rectangles.some((rect) => !validRect(rect))) {
        errors.push(`${label}: invalid ${groupName}`);
      }
    }

    if (!Array.isArray(level?.reference) || level.reference.length === 0) {
      errors.push(`${label}: at least one reference stroke is required`);
    } else {
      if (level.reference.length > level.rules.maxStrokes) errors.push(`${label}: reference exceeds maxStrokes`);
      let totalInk = 0;
      level.reference.forEach((stroke, strokeIndex) => {
        if (!Array.isArray(stroke) || stroke.length < 2) {
          errors.push(`${label}: reference stroke ${strokeIndex + 1} needs at least two points`);
          return;
        }
        totalInk += strokeLength(stroke);
        stroke.forEach((point, pointIndex) => {
          if (!inBounds(point)) errors.push(`${label}: reference point ${strokeIndex + 1}.${pointIndex + 1} is out of bounds`);
          const drawZones = level.rules.drawZones || [];
          const noDrawZones = level.rules.noDrawZones || [];
          if (drawZones.length && !drawZones.some((zone) => contains(zone, point, 2))) {
            errors.push(`${label}: reference point ${strokeIndex + 1}.${pointIndex + 1} is outside draw zones`);
          }
          if (noDrawZones.some((zone) => contains(zone, point, 5))) {
            errors.push(`${label}: reference point ${strokeIndex + 1}.${pointIndex + 1} enters a no-draw zone`);
          }
        });
      });
      if (totalInk > level.inkMax) errors.push(`${label}: reference requires ${Math.ceil(totalInk)} ink but inkMax is ${level.inkMax}`);
    }

    const checkpointIds = new Set();
    (level?.checkpoints || []).forEach((checkpoint) => {
      if (!checkpoint.id || checkpointIds.has(checkpoint.id)) errors.push(`${label}: checkpoint ids must be unique`);
      checkpointIds.add(checkpoint.id);
      if (!inBounds(checkpoint) || !finiteNumber(checkpoint.r) || checkpoint.r <= 0) {
        errors.push(`${label}: invalid checkpoint ${checkpoint.id || "without id"}`);
      }
      if (!DIRECTIONS.has(checkpoint.direction)) errors.push(`${label}: invalid checkpoint direction`);
    });

    (level?.fields || []).forEach((field) => {
      if (field.type !== "wind" || !validRect(field) || !finiteNumber(field.forceX)) {
        errors.push(`${label}: invalid field`);
      }
    });
    (level?.extras || []).forEach((extra) => {
      if (extra.type !== "wall" || !validRect(extra)) errors.push(`${label}: invalid extra`);
    });
    if (!finiteNumber(level?.physics?.gravityY) || level.physics.gravityY <= 0) errors.push(`${label}: gravityY must be positive`);
  });

  return errors;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const levels = await loadLevels();
    const errors = validateLevels(levels);
    if (errors.length) {
      console.error(errors.map((error) => `- ${error}`).join("\n"));
      process.exitCode = 1;
    } else {
      console.log(`Validated ${levels.length} levels.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
