const roundToTwo = (value) => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  return Number.isFinite(rounded) ? rounded : null;
};

const clampDiscount = (value) => {
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatMoney = (value) =>
  Number.isFinite(value) ? roundToTwo(value).toFixed(2) : "";

const formatPercent = (value) =>
  Number.isFinite(value) ? roundToTwo(value).toFixed(2) : "";

const ensurePricingShape = (pricing = {}) => ({
  originalPrice: pricing.originalPrice ?? "",
  discount: pricing.discount ?? "",
  price: pricing.price ?? pricing.finalPrice ?? "",
});

export function normalizePricing(pricingInput, changedField) {
  const pricing = ensurePricingShape(pricingInput);
  let original = parseNumber(pricing.originalPrice);
  let discount = parseNumber(pricing.discount);
  let price = parseNumber(pricing.price);

  if (original !== null) {
    original = Math.max(0, roundToTwo(original));
  }
  if (price !== null) {
    price = Math.max(0, roundToTwo(price));
  }
  if (discount !== null) {
    discount = clampDiscount(discount);
    discount = roundToTwo(discount);
  }

  let missingOriginal = pricing.originalPrice === "" || original === null;
  let missingDiscount = pricing.discount === "" || discount === null;
  let missingPrice = pricing.price === "" || price === null;

  if (missingPrice && !missingOriginal && !missingDiscount && changedField !== "price") {
    price = roundToTwo(original * (1 - discount / 100));
    if (price !== null && price < 0) price = 0;
    missingPrice = price === null;
  }

  if (
    missingDiscount &&
    !missingOriginal &&
    !missingPrice &&
    changedField !== "discount"
  ) {
    if (original === 0) {
      discount = 0;
    } else {
      const derived = clampDiscount(100 - (price / original) * 100);
      discount = roundToTwo(derived);
    }
    missingDiscount = discount === null;
  }

  if (
    missingOriginal &&
    !missingDiscount &&
    !missingPrice &&
    changedField !== "originalPrice"
  ) {
    const denom = 1 - discount / 100;
    if (denom > 0) {
      original = roundToTwo(price / denom);
      missingOriginal = original === null;
    }
  }

  return {
    values: {
      originalPrice:
        !missingOriginal && original !== null ? formatMoney(original) : pricing.originalPrice,
      discount:
        !missingDiscount && discount !== null
          ? formatPercent(discount)
          : pricing.discount,
      price: !missingPrice && price !== null ? formatMoney(price) : pricing.price,
    },
    numbers: {
      original,
      discount,
      price,
    },
  };
}

export function resolvePricingForSubmit(pricingInput) {
  const { values, numbers } = normalizePricing(pricingInput);
  const original = numbers.original;
  const price = numbers.price;
  const discount = numbers.discount ?? 0;

  const normalizedValues = {
    originalPrice: values.originalPrice || "",
    price: values.price || "",
    discount:
      numbers.discount === null || values.discount === ""
        ? "0.00"
        : values.discount,
  };

  return {
    values: normalizedValues,
    numbers: {
      original,
      discount,
      price,
    },
    valid:
      original !== null &&
      price !== null &&
      original >= 0 &&
      price >= 0 &&
      price <= original,
  };
}

export function pricingHasDiscount(numbers) {
  if (!numbers) return false;
  const { original, price, discount } = numbers;
  if (original === null || price === null) return false;
  if (original <= 0) return false;
  if (price >= original) return false;
  return (discount ?? 0) > 0;
}
