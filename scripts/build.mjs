import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
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

async function collectFiles(directory, urlPrefix) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(directory, entry.name);
    const url = `${urlPrefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectFiles(source, url));
    else if (entry.isFile()) files.push({ source, url });
  }
  return files.sort((a, b) => a.url.localeCompare(b.url));
}

if (!dist.startsWith(`${root}/`)) {
  throw new Error(`Refusing to clean unexpected output directory: ${dist}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });

const styleAsset = await emitHashed(join(root, "styles.css"), "styles.css");
const levelsAsset = await emitHashed(join(root, "levels.js"), "levels.js");
const telemetryAsset = await emitHashed(join(root, "telemetry.js"), "telemetry.js");
const audioAsset = await emitHashed(join(root, "audio.js"), "audio.js");
const gameAsset = await emitHashed(join(root, "game.js"), "game.js");
const pwaAsset = await emitHashed(join(root, "pwa.js"), "pwa.js");
const matterAsset = await emitHashed(
  join(root, "node_modules", "matter-js", "build", "matter.min.js"),
  "matter.min.js"
);

let html = await readFile(join(root, "index.html"), "utf8");
const replacements = [
  [/href="styles\.css"/, `href="${styleAsset}"`],
  [/src="vendor\/matter\.min\.js"/, `src="${matterAsset}"`],
  [/src="levels\.js"/, `src="${levelsAsset}"`],
  [/src="telemetry\.js"/, `src="${telemetryAsset}"`],
  [/src="audio\.js"/, `src="${audioAsset}"`],
  [/src="game\.js"/, `src="${gameAsset}"`],
  [/src="pwa\.js"/, `src="${pwaAsset}"`]
];

for (const [pattern, replacement] of replacements) {
  if (!pattern.test(html)) throw new Error(`Build placeholder not found: ${pattern}`);
  html = html.replace(pattern, replacement);
}

const buildVersion = digest([styleAsset, levelsAsset, telemetryAsset, audioAsset, gameAsset, pwaAsset, matterAsset].join("|"));
if (!/name="build-version" content="dev"/.test(html)) throw new Error("Build version placeholder not found");
html = html.replace(/name="build-version" content="dev"/, `name="build-version" content="${buildVersion}"`);

await writeFile(join(dist, "index.html"), html);
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
await cp(join(root, "_headers"), join(dist, "_headers"));
await cp(join(root, "manifest.webmanifest"), join(dist, "manifest.webmanifest"));
await cp(join(root, "legal.css"), join(dist, "legal.css"));
for (const page of ["privacy.html", "terms.html", "support.html"]) {
  await cp(join(root, page), join(dist, page));
}

const stableFiles = [
  { source: join(root, "manifest.webmanifest"), url: "/manifest.webmanifest" },
  { source: join(root, "legal.css"), url: "/legal.css" },
  { source: join(root, "privacy.html"), url: "/privacy.html" },
  { source: join(root, "terms.html"), url: "/terms.html" },
  { source: join(root, "support.html"), url: "/support.html" },
  ...await collectFiles(join(root, "assets"), "/assets")
];
const precache = [
  "/",
  "/index.html",
  `/${styleAsset}`,
  `/${levelsAsset}`,
  `/${telemetryAsset}`,
  `/${audioAsset}`,
  `/${gameAsset}`,
  `/${pwaAsset}`,
  `/${matterAsset}`,
  ...stableFiles.map((file) => file.url)
];
const stableSignature = (await Promise.all(stableFiles.map(async (file) => `${file.url}:${digest(await readFile(file.source))}`))).join("|");
const cacheVersion = digest(JSON.stringify(precache) + html + stableSignature);
const serviceWorker = `"use strict";
const CACHE = "ride-my-line-${cacheVersion}";
const PRECACHE = ${JSON.stringify(precache, null, 2)};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("ride-my-line-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const pathname = new URL(request.url).pathname;
        const cacheKey = pathname === "/" ? "/index.html" : request;
        caches.open(CACHE).then((cache) => cache.put(cacheKey, response.clone()));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html"))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
`;
await writeFile(join(dist, "service-worker.js"), serviceWorker);
await writeFile(
  join(dist, "build-manifest.json"),
  `${JSON.stringify({ buildVersion, styleAsset, levelsAsset, telemetryAsset, audioAsset, gameAsset, pwaAsset, matterAsset, cacheVersion }, null, 2)}\n`
);

console.log(`Built Ride My Line into ${dist}`);
