import type { ExpenseSettings, LivingItem, LivingPreset, SimulationInput } from "./types";

export const PRESET_LABEL: Record<LivingPreset, string> = {
  luxury: "贅沢",
  average: "平均",
  saving: "節約",
};

export const PRESET_ORDER: LivingPreset[] = ["luxury", "average", "saving"];

/** 「平均」に対する「贅沢」「節約」の倍率 */
const PRESET_RATIO: Record<LivingPreset, number> = { luxury: 1.4, average: 1, saving: 0.7 };

/**
 * 基本生活費の項目と、単身世帯の平均的な月額（万円/月）。
 * 総務省「家計調査」（単身世帯）などを参考にした概算で、合計は月14.5万円。
 * 住宅ローン・自動車・教育費は別ステップで扱うので含めない。
 */
export const LIVING_CATEGORIES: {
  key: string;
  label: string;
  hint: string;
  base: number;
}[] = [
  { key: "food", label: "食費", hint: "外食・お弁当を含む", base: 4 },
  { key: "utility", label: "水道光熱費", hint: "電気・ガス・水道", base: 1.2 },
  { key: "telecom", label: "通信費", hint: "スマホ・ネット回線・サブスク", base: 0.7 },
  { key: "daily", label: "日用品", hint: "洗剤・消耗品など", base: 0.5 },
  { key: "allowance", label: "小遣い", hint: "家族全員の合計", base: 2 },
  { key: "housing", label: "住居費（ローン以外）", hint: "家賃・管理費・固定資産税など", base: 2 },
  { key: "insurance", label: "保険料", hint: "生命保険・医療保険など", base: 1 },
  { key: "clothing", label: "被服・美容", hint: "衣類・理美容", base: 0.6 },
  { key: "medical", label: "医療費", hint: "通院・薬代", base: 0.5 },
  { key: "leisure", label: "趣味・交際・娯楽", hint: "レジャー・交際費", base: 1.5 },
  { key: "other", label: "その他", hint: "予備費・雑費", base: 0.5 },
];

export const categoryOf = (key: string) => LIVING_CATEGORIES.find((c) => c.key === key);

/** 世帯構成係数: 単身 1.0、配偶者 +0.5、子供1人につき +0.3 */
export function householdFactor(input: Pick<SimulationInput, "spouse" | "children">) {
  return 1 + (input.spouse.enabled ? 0.5 : 0) + 0.3 * input.children.length;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** 項目のプリセット月額（万円、0.1万円単位）。贅沢・節約は丸めた平均額に倍率を掛ける */
export function presetAmount(base: number, preset: LivingPreset, factor: number) {
  return round1(round1(base * factor) * PRESET_RATIO[preset]);
}

export function presetItems(preset: LivingPreset, factor: number): LivingItem[] {
  return LIVING_CATEGORIES.map((c) => ({
    id: `lv-${c.key}`,
    key: c.key,
    label: c.label,
    monthly: presetAmount(c.base, preset, factor),
    preset,
  }));
}

/** 家族構成の変更に合わせて、プリセット選択中の項目の金額を再計算する（手入力の項目はそのまま） */
export function syncLivingPresets(input: SimulationInput): SimulationInput {
  const factor = householdFactor(input);
  const items = input.expense.items.map((x) => {
    const cat = categoryOf(x.key);
    return cat && x.preset ? { ...x, monthly: presetAmount(cat.base, x.preset, factor) } : x;
  });
  return { ...input, expense: { ...input.expense, items } };
}

/** 年間の基本生活費（現在価値、万円） */
export function livingCostOf(expense: ExpenseSettings) {
  return expense.items.reduce((s, x) => s + Math.max(0, x.monthly), 0) * 12;
}
