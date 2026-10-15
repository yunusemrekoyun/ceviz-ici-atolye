// Hesap (e-posta) bazlı giriş kilidi. IP başına sınır, farklı IP'lerden tek bir hesaba
// yapılan parola denemelerini durdurmaz. Var olmayan adreslere de aynı kural uygulanır,
// böylece kilit hesabın varlığını ele vermez. Süreç belleğinde tutulur.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 20000;
const attempts = new Map();

function lockMsFor(count) {
  if (count >= 15) return 15 * 60 * 1000;
  if (count >= 10) return 5 * 60 * 1000;
  if (count >= 5) return 60 * 1000;
  return 0;
}

function remainingLockMs(key, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry) return 0;
  if (entry.lockedUntil > now) return entry.lockedUntil - now;
  if (now - entry.firstAt > WINDOW_MS) attempts.delete(key);
  return 0;
}

function recordFailure(key, now = Date.now()) {
  let entry = attempts.get(key);
  if (!entry || (now - entry.firstAt > WINDOW_MS && entry.lockedUntil <= now)) {
    entry = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  entry.count += 1;
  const lockMs = lockMsFor(entry.count);
  if (lockMs) entry.lockedUntil = now + lockMs;
  attempts.delete(key);
  attempts.set(key, entry);
  if (attempts.size > MAX_ENTRIES) attempts.delete(attempts.keys().next().value);
}

function recordSuccess(key) {
  attempts.delete(key);
}

module.exports = { recordFailure, recordSuccess, remainingLockMs };
