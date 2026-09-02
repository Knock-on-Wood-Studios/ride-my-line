import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

async function files(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await files(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

const manifest = JSON.parse(await readFile(join(dist, "build-manifest.json"), "utf8"));
const html = await readFile(join(dist, "index.html"), "utf8");
const serviceWorker = await readFile(join(dist, "service-worker.js"), "utf8");
const headers = await readFile(join(dist, "_headers"), "utf8");

for (const key of ["styleAsset", "levelsAsset", "launchLevelsAsset", "telemetryAsset", "audioAsset", "gameAsset", "pwaAsset", "matterAsset"]) {
  assert.match(manifest[key], /^static\/[a-z.-]+\.[a-f0-9]{12}\.(?:css|js)$/);
  await access(join(dist, manifest[key]));
  assert.ok(html.includes(manifest[key]), `${key} is not linked from the built document`);
}

assert.match(manifest.buildVersion, /^[a-f0-9]{12}$/);
assert.match(manifest.cacheVersion, /^[a-f0-9]{12}$/);
assert.ok(html.includes(`name="build-version" content="${manifest.buildVersion}"`));
assert.doesNotMatch(html, /content="dev"/);
assert.match(html, /<link rel="canonical" href="https:\/\/ride-my-line\.robertwood50\.workers\.dev\/"/);
assert.match(html, /property="og:image" content="https:\/\/ride-my-line\.robertwood50\.workers\.dev\/assets\/brand\/ride-my-line-share\.png"/);
assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
assert.match(serviceWorker, /\/assets\/audio\/ride-my-line-backyard-loop\.mp3/);
assert.match(serviceWorker, /\/privacy\.html/);
assert.match(serviceWorker, /\["\/privacy", "\/terms", "\/support"\]\.includes\(pathname\)/);
assert.match(serviceWorker, /\/robots\.txt/);
assert.match(serviceWorker, /\/sitemap\.xml/);
assert.match(headers, /Content-Security-Policy:/);
await access(join(dist, "robots.txt"));
await access(join(dist, "sitemap.xml"));
assert.doesNotMatch(await readFile(join(dist, "sitemap.xml"), "utf8"), /\.html<\/loc>/);

const allFiles = await files(dist);
const totalBytes = (await Promise.all(allFiles.map(async (path) => (await stat(path)).size))).reduce((sum, size) => sum + size, 0);
assert.ok(totalBytes <= 2_500_000, `Production build is ${totalBytes} bytes; the release budget is 2,500,000 bytes`);
assert.ok(!allFiles.some((path) => /\.(?:map|log)$/i.test(path)), "Production output contains debug artifacts");

console.log(`Verified ${allFiles.length} production files (${Math.round(totalBytes / 1024)} KiB).`);
