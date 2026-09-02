import { webkit } from "@playwright/test";

const repeats = Math.max(1, Number.parseInt(process.argv[2] || "3", 10));
const concurrency = Math.max(1, Math.min(7, Number.parseInt(process.argv[3] || "5", 10)));
const baseURL = process.env.RML_BASE_URL || "http://127.0.0.1:8765";
const tasks = [];

for (let yard = 1; yard <= 25; yard += 1) {
  for (let run = 1; run <= repeats; run += 1) tasks.push({ yard, run });
}

const browser = await webkit.launch({ headless: true });
const results = [];
let cursor = 0;

async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor];
    cursor += 1;
    const page = await browser.newPage();
    try {
      await page.goto(`${baseURL}/?yard=${task.yard}&autoplay=1`);
      await page.locator("#result").waitFor({ state: "visible", timeout: 20_000 });
      results.push(await page.evaluate(({ yard, run }) => {
        const level = window.RML_LEVELS[yard - 1];
        return {
          yard,
          run,
          result: document.body.dataset.lastResult,
          reason: document.querySelector("#resultTitle")?.textContent || "",
          airMs: Number(document.body.dataset.lastAirMs || 0),
          minAirMs: level.contract?.minAirMs ?? null
        };
      }, task));
    } catch (error) {
      results.push({ ...task, result: "error", reason: error.message, airMs: 0, minAirMs: null });
    } finally {
      await page.close();
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
await browser.close();

const summary = [];
for (let yard = 1; yard <= 25; yard += 1) {
  const runs = results.filter((result) => result.yard === yard);
  const failures = runs.filter((result) => result.result !== "win");
  summary.push({
    yard,
    runs: runs.length,
    minAirMs: Math.min(...runs.map((result) => result.airMs)),
    contractAirMs: runs.find((result) => result.minAirMs != null)?.minAirMs ?? null,
    failures: failures.length,
    reasons: [...new Set(failures.map((result) => result.reason))].join(", ")
  });
}

console.table(summary);
if (summary.some((yard) => yard.failures > 0)) process.exitCode = 1;
