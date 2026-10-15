const formatterCache = new Map();

const getFormatter = (fractionDigits) => {
  const digits = fractionDigits === 0 ? 0 : 2;
  if (!formatterCache.has(digits)) {
    formatterCache.set(
      digits,
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    );
  }
  return formatterCache.get(digits);
};

export function formatTry(value, { fractionDigits = 2 } = {}) {
  const amount = Number(value);
  return getFormatter(fractionDigits).format(
    Number.isFinite(amount) ? amount : 0
  );
}
