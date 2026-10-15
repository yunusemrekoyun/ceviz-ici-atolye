export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Per100 {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 100g başına değerlerden verilen gram için makro hesaplar. */
export function macrosFor(per100: Per100, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: round1(per100.protein * f),
    carbs: round1(per100.carbs * f),
    fat: round1(per100.fat * f),
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: round1(acc.protein + m.protein),
      carbs: round1(acc.carbs + m.carbs),
      fat: round1(acc.fat + m.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export type MealTypeKey = (typeof MEAL_TYPES)[number];

export const MEAL_LABEL: Record<MealTypeKey, string> = {
  BREAKFAST: "Kahvaltı",
  LUNCH: "Öğle",
  DINNER: "Akşam",
  SNACK: "Ara Öğün",
};
