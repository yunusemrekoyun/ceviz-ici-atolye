#!/usr/bin/env node

// Only run against an isolated local API. Production traffic must not be load tested here.
const target = new URL(process.argv[2] || "http://127.0.0.1:5000");
if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) {
  throw new Error("Load test target must be a local API");
}

const paths = [
  "/products", "/categories", "/hero-videos", "/campaigns/active",
  "/mini-campaigns", "/shipping", "/announcement-bar", "/cart-campaigns/header",
];
const base = new URL("/api/v1", target).toString().replace(/\/$/, "");
const maxParallel = Number(process.argv[3] || 100);
if (!Number.isInteger(maxParallel) || maxParallel < 1 || maxParallel > 500) {
  throw new Error("Parallel visitors must be an integer from 1 to 500");
}

async function run(visitors, parallel) {
  let nextVisitor = 0;
  let failures = 0;
  const times = [];
  const statuses = {};
  const errors = {};
  const started = performance.now();
  await Promise.all(Array.from({ length: parallel }, async () => {
    while (nextVisitor < visitors) {
      const visitor = nextVisitor++;
      const address = `198.18.${Math.floor(visitor / 250)}.${(visitor % 250) + 1}`;
      await Promise.all(paths.map(async (route) => {
        const began = performance.now();
        try {
          const response = await fetch(`${base}${route}`, {
            headers: { "X-Forwarded-For": address },
          });
          await response.arrayBuffer();
          statuses[response.status] = (statuses[response.status] || 0) + 1;
          if (response.status >= 500 || response.status === 429) failures += 1;
        } catch (error) {
          failures += 1;
          const reason = `${route}: ${error.cause?.code || error.name}: ${error.cause?.message || error.message}`;
          errors[reason] = (errors[reason] || 0) + 1;
        }
        times.push(performance.now() - began);
      }));
    }
  }));
  times.sort((left, right) => left - right);
  const percentile = (fraction) => Math.round(times[Math.floor((times.length - 1) * fraction)] || 0);
  const result = {
    visitors, parallel, requests: times.length, failures, statuses, errors,
    p50ms: percentile(0.5), p95ms: percentile(0.95), p99ms: percentile(0.99),
    maxMs: percentile(1), durationMs: Math.round(performance.now() - started),
  };
  console.log(JSON.stringify(result));
  if (failures) process.exitCode = 1;
}

(async () => {
  await run(100, Math.min(100, maxParallel));
  await run(500, maxParallel);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
