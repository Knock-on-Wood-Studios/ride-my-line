import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const staticDir = join(dist, "static");

function digest(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

async function emitHashed(source, basename) {
  const content = await readFile(source);
  const extensionIndex = basename.lastIndexOf(".");
  const stem = basename.slice(0, extensionIndex);
  const extension = basename.slice(extensionIndex);
  const filename = `${stem}.${digest(content)}${extension}`;
  await writeFile(join(staticDir, filename), content);
  return `static/${filename}`;
}

if (!dist.startsWith(`${root}/`)) {
  throw new Error(`Refusing to clean unexpected output directory: ${dist}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });

const styleAsset = await emitHashed(join(root, "styles.css"), "styles.css");
const levelsAsset = await emitHashed(join(root, "levels.js"), "levels.js");
const gameAsset = await emitHashed(join(root, "game.js"), "game.js");
const matterAsset = await emitHashed(
  join(root, "node_modules", "matter-js", "build", "matter.min.js"),
  "matter.min.js"
);

let html = await readFile(join(root, "index.html"), "utf8");
const replacements = [
  [/href="styles\.css"/, `href="${styleAsset}"`],
  [/src="vendor\/matter\.min\.js"/, `src="${matterAsset}"`],
  [/src="levels\.js"/, `src="${levelsAsset}"`],
  [/src="game\.js"/, `src="${gameAsset}"`]
];

for (const [pattern, replacement] of replacements) {
  if (!pattern.test(html)) throw new Error(`Build placeholder not found: ${pattern}`);
  html = html.replace(pattern, replacement);
}

await writeFile(join(dist, "index.html"), html);
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
await writeFile(
  join(dist, "build-manifest.json"),
  `${JSON.stringify({ styleAsset, levelsAsset, gameAsset, matterAsset }, null, 2)}\n`
);

console.log(`Built Ride My Line into ${dist}`);
