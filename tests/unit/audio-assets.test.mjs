import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const audioRoot = join(root, "assets/audio");

async function collectFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await collectFiles(path));
    else if (entry.isFile() && entry.name !== "LICENSES.json") found.push(relative(audioRoot, path));
  }
  return found;
}

test("the audio license manifest accounts for every shipped recording", async () => {
  const manifest = JSON.parse(await readFile(join(audioRoot, "LICENSES.json"), "utf8"));
  const actual = (await collectFiles(audioRoot)).sort();
  const listed = manifest.assets.flatMap((asset) => asset.files).sort();

  assert.deepEqual(listed, actual);
  for (const asset of manifest.assets) {
    assert.ok(asset.title);
    assert.ok(asset.license);
    assert.ok(asset.sourceUrl || asset.licenseRecord);
    if (asset.license !== "Commercial license") assert.ok(asset.licenseUrl);
  }
});

test("the playful audio director references real local samples without oscillator fallbacks", async () => {
  const source = await readFile(join(root, "audio.js"), "utf8");
  const references = Array.from(source.matchAll(/"assets\/audio\/([^"\n]+)"/g), (match) => match[1]);

  assert.ok(references.length >= 20);
  assert.equal(new Set(references).size, references.length);
  for (const reference of references) {
    assert.ok((await collectFiles(audioRoot)).includes(reference), `Missing audio sample: ${reference}`);
  }
  assert.doesNotMatch(source, /createOscillator|OscillatorNode/);
  assert.match(source, /backyard-slapstick-v2/);
});
