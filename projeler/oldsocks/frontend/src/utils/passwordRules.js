export const passwordRules = [
  { id: "min8", label: "En az 8 karakter", test: (s) => String(s || "").length >= 8 },
  {
    id: "upper",
    label: "En az 1 büyük harf",
    test: (s) => /[A-ZÇĞİÖŞÜ]/.test(String(s || "")),
  },
  {
    id: "lower",
    label: "En az 1 küçük harf",
    test: (s) => /[a-zçğıöşü]/.test(String(s || "")),
  },
  { id: "digit", label: "En az 1 rakam", test: (s) => /\d/.test(String(s || "")) },
];

export function getPasswordValidation(password) {
  const results = passwordRules.map((rule) => ({
    ...rule,
    ok: rule.test(password),
  }));

  return {
    results,
    allOk: results.every((rule) => rule.ok),
  };
}
