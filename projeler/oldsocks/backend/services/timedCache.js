function timedCache(ttlMs) {
  let state = { hasValue: false, value: undefined, expiresAt: 0, pending: null };

  return {
    invalidate() {
      state = { hasValue: false, value: undefined, expiresAt: 0, pending: null };
    },
    get(load) {
      const current = state;
      if (current.hasValue && Date.now() < current.expiresAt) {
        return Promise.resolve(current.value);
      }
      if (!current.pending) {
        current.pending = Promise.resolve()
          .then(load)
          .then((value) => {
            if (state === current) {
              current.hasValue = true;
              current.value = value;
              const duration = typeof ttlMs === "function" ? ttlMs() : ttlMs;
              current.expiresAt = Date.now() + duration;
            }
            return value;
          })
          .finally(() => { current.pending = null; });
      }
      return current.pending;
    },
  };
}

module.exports = { timedCache };
