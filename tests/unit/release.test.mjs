import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ci = await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const deploy = await readFile(new URL("../../.github/workflows/deploy-production.yml", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

test("the release candidate declares version 1.3.0", () => {
  assert.equal(packageJson.version, "1.3.0");
});

test("pull requests and main run the complete quality gate", () => {
  assert.match(ci, /pull_request:/);
  assert.match(ci, /branches: \[main\]/);
  assert.match(ci, /npm audit --audit-level=high/);
  assert.match(ci, /npm run check/);
  assert.match(ci, /npm run test:e2e/);
  assert.match(ci, /chromium firefox webkit/);
});

test("production deploys only through an audited manual workflow", () => {
  assert.match(deploy, /workflow_dispatch:/);
  assert.match(deploy, /description: Audited main commit or release tag/);
  assert.match(deploy, /environment: production/);
  assert.match(deploy, /npm run check/);
  assert.match(deploy, /npm run test:e2e/);
  assert.match(deploy, /CLOUDFLARE_API_TOKEN/);
  assert.match(deploy, /CLOUDFLARE_ACCOUNT_ID/);
});
