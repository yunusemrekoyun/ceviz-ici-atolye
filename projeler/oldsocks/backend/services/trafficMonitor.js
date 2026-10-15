const BUCKET_MS = 1000;
const BUCKET_COUNT = 60;
const SAMPLE_SECONDS = 10;

function createTrafficMonitor(now = Date.now) {
  const buckets = Array.from({ length: BUCKET_COUNT }, () => ({ second: -1, requests: 0, errors: 0, limited: 0, durationMs: 0 }));
  let inFlight = 0;

  function bucket(second) {
    const entry = buckets[second % BUCKET_COUNT];
    if (entry.second !== second) {
      Object.assign(entry, { second, requests: 0, errors: 0, limited: 0, durationMs: 0 });
    }
    return entry;
  }

  function begin() {
    inFlight += 1;
    const startedAt = now();
    let finished = false;
    return (statusCode) => {
      if (finished) return;
      finished = true;
      inFlight = Math.max(0, inFlight - 1);
      const completedAt = now();
      const entry = bucket(Math.floor(completedAt / BUCKET_MS));
      entry.requests += 1;
      entry.errors += Number(statusCode >= 500);
      entry.limited += Number(statusCode === 429);
      entry.durationMs += Math.max(0, completedAt - startedAt);
    };
  }

  function totals(seconds) {
    const current = Math.floor(now() / BUCKET_MS);
    return buckets.reduce((result, entry) => {
      if (entry.second > current || current - entry.second >= seconds) return result;
      result.requests += entry.requests;
      result.errors += entry.errors;
      result.limited += entry.limited;
      result.durationMs += entry.durationMs;
      return result;
    }, { requests: 0, errors: 0, limited: 0, durationMs: 0 });
  }

  function mode() {
    const recent = totals(SAMPLE_SECONDS);
    const perSecond = recent.requests / SAMPLE_SECONDS;
    const averageDurationMs = recent.requests ? recent.durationMs / recent.requests : 0;
    if (perSecond >= 60 || inFlight >= 150 || (recent.requests >= 10 && averageDurationMs >= 800)) return "surge";
    if (perSecond >= 20 || inFlight >= 50 || (recent.requests >= 10 && averageDurationMs >= 400)) return "busy";
    return "normal";
  }

  function publicTtlMs(baseMs) {
    const multiplier = { normal: 1, busy: 2, surge: 3 }[mode()];
    return Math.max(baseMs, Math.min(baseMs * multiplier, 45_000));
  }

  function snapshot() {
    const recent = totals(SAMPLE_SECONDS);
    const minute = totals(BUCKET_COUNT);
    return {
      mode: mode(),
      inFlight,
      last10Seconds: {
        requests: recent.requests,
        requestsPerSecond: Number((recent.requests / SAMPLE_SECONDS).toFixed(1)),
        errors: recent.errors,
        limited: recent.limited,
        averageDurationMs: recent.requests ? Math.round(recent.durationMs / recent.requests) : 0,
      },
      last60Seconds: { requests: minute.requests, errors: minute.errors, limited: minute.limited },
    };
  }

  return { begin, mode, publicTtlMs, snapshot };
}

const trafficMonitor = createTrafficMonitor();
module.exports = { createTrafficMonitor, trafficMonitor };
