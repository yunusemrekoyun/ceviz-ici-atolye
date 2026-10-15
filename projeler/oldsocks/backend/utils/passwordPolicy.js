const PASSWORD_RULES = [
  {
    id: "min8",
    label: "En az 8 karakter",
    test: (value) => String(value || "").length >= 8,
  },
  {
    id: "upper",
    label: "En az 1 büyük harf",
    test: (value) => /[A-ZÇĞİÖŞÜ]/.test(String(value || "")),
  },
  {
    id: "lower",
    label: "En az 1 küçük harf",
    test: (value) => /[a-zçğıöşü]/.test(String(value || "")),
  },
  {
    id: "digit",
    label: "En az 1 rakam",
    test: (value) => /\d/.test(String(value || "")),
  },
];

function validatePasswordPolicy(password) {
  const failedRules = PASSWORD_RULES.filter((rule) => !rule.test(password));
  return {
    ok: failedRules.length === 0,
    failedRules,
    message:
      failedRules.length === 0
        ? ""
        : `Şifre kuralları sağlanmıyor: ${failedRules
            .map((rule) => rule.label)
            .join(", ")}`,
  };
}

module.exports = {
  PASSWORD_RULES,
  validatePasswordPolicy,
};
