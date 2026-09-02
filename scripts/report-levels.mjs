import { loadLevels, levelMechanics } from "./validate-levels.mjs";

function strokeLength(stroke) {
  return stroke.slice(1).reduce((length, point, index) => {
    const previous = stroke[index];
    return length + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

const levels = await loadLevels();
const report = levels.map((level, index) => ({
  yard: index + 1,
  id: level.id,
  name: level.name,
  difficulty: level.difficulty,
  mechanics: levelMechanics(level),
  strokes: level.rules.maxStrokes,
  material: level.rules.material,
  inkBudget: level.inkMax,
  referenceInk: Math.round(level.reference.reduce((sum, stroke) => sum + strokeLength(stroke), 0)),
  gravity: level.physics.gravityY,
  launch: level.push.x
}));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.table(report.map((level) => ({
    yard: level.yard,
    difficulty: level.difficulty,
    name: level.name,
    mechanics: level.mechanics.join(", "),
    ink: `${level.referenceInk}/${level.inkBudget}`,
    gravity: level.gravity,
    launch: level.launch
  })));
}
