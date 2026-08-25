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
const CONTRACT_KEYS = new Set(["minAirMs", "maxAngle", "maxImpact", "minSpeed", "cargoMaxImpact", "maxSpeed", "settleMs"]);
const PHYSICS_KEYS = new Set([
  "gravityY", "stability", "inertiaScale", "driveMax", "driveAdd",
  "suspensionDamping", "suspensionStiffness", "rubberBounce",
  "iceFriction", "iceBounce", "wheelBounce"
]);

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

function pointIssue(level, point) {
  const drawZones = level?.rules?.drawZones || [];
  const noDrawZones = level?.rules?.noDrawZones || [];
  if (drawZones.length && !drawZones.some((zone) => contains(zone, point, 2))) return "outside draw zones";
  if (noDrawZones.some((zone) => contains(zone, point, 5))) return "a no-draw zone";
  return "";
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function levelMechanics(level) {
  const mechanics = [];
  if ((level?.rules?.drawZones || []).length) mechanics.push("draw-zone");
  if ((level?.rules?.noDrawZones || []).length) mechanics.push("no-draw");
  if ((level?.rules?.anchors || []).length) mechanics.push("anchors");
  if ((level?.checkpoints || []).length) mechanics.push("checkpoints");
  if ((level?.fields || []).length) mechanics.push("wind");
  if ((level?.extras || []).length) mechanics.push("obstacles");
  if (Object.keys(level?.contract || {}).length) mechanics.push("finish-contract");
  if (level?.rules?.material && level.rules.material !== "chalk") mechanics.push(level.rules.material);
  if ((level?.rules?.maxStrokes || 1) > 1) mechanics.push("multi-stroke");
  if (level?.cargo) mechanics.push("cargo");
  return mechanics;
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
    if (!Number.isInteger(level?.difficulty) || level.difficulty < 1 || level.difficulty > 10) {
      errors.push(`${label}: difficulty must be an integer from 1 to 10`);
    }
    if (!finiteNumber(level?.inkMax) || level.inkMax <= 0) errors.push(`${label}: inkMax must be positive`);
    if (!Number.isInteger(level?.rules?.maxStrokes) || level.rules.maxStrokes < 1 || level.rules.maxStrokes > 3) {
      errors.push(`${label}: rules.maxStrokes must be an integer from 1 to 3`);
    }
    if (!MATERIALS.has(level?.rules?.material)) errors.push(`${label}: unsupported material`);
    if (!finiteNumber(level?.rules?.parInk) || level.rules.parInk <= 0 || level.rules.parInk > 1) {
      errors.push(`${label}: rules.parInk must be greater than 0 and at most 1`);
    }

    for (const key of ["ledge", "landing", "backstop"]) {
      if (!validRect(level?.[key])) errors.push(`${label}: invalid ${key} rectangle`);
    }
    for (const key of ["posts", "landPosts"]) {
      if (!Array.isArray(level?.[key]) || level[key].some((rect) => !validRect(rect))) {
        errors.push(`${label}: invalid ${key}`);
      }
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
          const issue = pointIssue(level, point);
          if (issue === "outside draw zones") errors.push(`${label}: reference point ${strokeIndex + 1}.${pointIndex + 1} is outside draw zones`);
          if (issue === "a no-draw zone") errors.push(`${label}: reference point ${strokeIndex + 1}.${pointIndex + 1} enters a no-draw zone`);
        });
        for (let pointIndex = 1; pointIndex < stroke.length; pointIndex += 1) {
          const start = stroke[pointIndex - 1];
          const end = stroke[pointIndex];
          const samples = Math.max(1, Math.ceil(distance(start, end) / 4));
          let issue = "";
          for (let sample = 1; sample < samples; sample += 1) {
            const t = sample / samples;
            issue = pointIssue(level, { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
            if (issue) break;
          }
          if (issue) {
            errors.push(`${label}: reference segment ${strokeIndex + 1}.${pointIndex} crosses ${issue}`);
            break;
          }
        }
      });
      if (totalInk > level.inkMax) errors.push(`${label}: reference requires ${Math.ceil(totalInk)} ink but inkMax is ${level.inkMax}`);
      if (finiteNumber(level?.rules?.parInk) && totalInk > level.inkMax * level.rules.parInk) {
        errors.push(`${label}: reference requires ${Math.ceil(totalInk)} ink but the craft medal allows ${Math.floor(level.inkMax * level.rules.parInk)}`);
      }
    }

    const anchors = level?.rules?.anchors || [];
    if (!Array.isArray(anchors) || anchors.some((anchor) => !inBounds(anchor))) {
      errors.push(`${label}: invalid anchors`);
    } else if (anchors.length) {
      level.reference?.forEach((stroke, strokeIndex) => {
        const startAnchor = anchors.findIndex((anchor) => distance(anchor, stroke[0]) <= 3);
        const endAnchor = anchors.findIndex((anchor) => distance(anchor, stroke[stroke.length - 1]) <= 3);
        if (startAnchor < 0 || endAnchor < 0 || startAnchor === endAnchor) {
          errors.push(`${label}: reference stroke ${strokeIndex + 1} must connect two distinct anchors`);
        }
      });
    }

    const checkpointIds = new Set();
    (level?.checkpoints || []).forEach((checkpoint) => {
      if (!checkpoint.id || checkpointIds.has(checkpoint.id)) errors.push(`${label}: checkpoint ids must be unique`);
      checkpointIds.add(checkpoint.id);
      if (!inBounds(checkpoint) || !finiteNumber(checkpoint.r) || checkpoint.r <= 0) {
        errors.push(`${label}: invalid checkpoint ${checkpoint.id || "without id"}`);
      }
      if (!DIRECTIONS.has(checkpoint.direction)) errors.push(`${label}: invalid checkpoint direction`);
      for (const key of ["minSpeed", "maxSpeed", "minAxisSpeed"]) {
        if (checkpoint[key] != null && (!finiteNumber(checkpoint[key]) || checkpoint[key] < 0)) {
          errors.push(`${label}: invalid checkpoint ${key}`);
        }
      }
    });

    (level?.fields || []).forEach((field) => {
      if (field.type !== "wind" || !validRect(field) || !finiteNumber(field.forceX)) {
        errors.push(`${label}: invalid field`);
      }
    });
    (level?.extras || []).forEach((extra) => {
      if (extra.type !== "wall" || !validRect(extra) || (extra.restitution != null && (!finiteNumber(extra.restitution) || extra.restitution < 0 || extra.restitution > 1))) {
        errors.push(`${label}: invalid extra`);
      }
    });
    for (const [key, value] of Object.entries(level?.contract || {})) {
      if (!CONTRACT_KEYS.has(key) || !finiteNumber(value) || value < 0) errors.push(`${label}: invalid contract ${key}`);
    }
    for (const [key, value] of Object.entries(level?.physics || {})) {
      if (!PHYSICS_KEYS.has(key) || !finiteNumber(value) || value < 0) errors.push(`${label}: invalid physics ${key}`);
    }
    if (!finiteNumber(level?.physics?.gravityY) || level.physics.gravityY <= 0) errors.push(`${label}: gravityY must be positive`);
    if (!finiteNumber(level?.push?.x) || !finiteNumber(level?.push?.y) || Math.abs(level.push.x) > 10 || Math.abs(level.push.y) > 10) {
      errors.push(`${label}: invalid push vector`);
    }
    if (!finiteNumber(level?.driveMs) || level.driveMs < 0 || level.driveMs > 10000) errors.push(`${label}: invalid driveMs`);
    for (const key of ["track", "land"]) {
      if (!finiteNumber(level?.friction?.[key]) || level.friction[key] < 0 || level.friction[key] > 2) errors.push(`${label}: invalid ${key} friction`);
    }
    if (index >= 3 && levelMechanics(level).filter((mechanic) => mechanic !== "draw-zone").length < 2) {
      errors.push(`${label}: advanced yards require at least two differentiating mechanics`);
    }
  });

  if (levels.length >= 3) {
    for (let index = 0; index < 3; index += 1) {
      if (levels[index]?.difficulty !== index + 1) errors.push(`${levels[index]?.id || `level ${index + 1}`}: onboarding difficulty must be ${index + 1}`);
    }
  }
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index]?.difficulty < levels[index - 1]?.difficulty) errors.push(`${levels[index]?.id}: difficulty must not decrease`);
  }
  if (levels[3] && levels[3].difficulty < 5) errors.push(`${levels[3].id}: the advanced campaign must ramp to difficulty 5 or higher`);

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
