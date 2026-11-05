import type { ExpenseSettings, LivingItem, LivingPreset } from "./types";

export const PRESET_LABEL: Record<LivingPreset, string> = {
  luxury: "贅沢",
  average: "平均",
  saving: "節約",
};

export const PRESET_ORDER: LivingPreset[] = ["luxury", "average", "saving"];

/**
 * 基本生活費の項目と月額の相場（万円/月）。
 * 総務省「家計調査」（2人以上の世帯）などを参考にした、子育て世帯の概算。
 * 住宅ローン・自動車・教育費は別ステップで扱うので含めない。
 */
export const LIVING_CATEGORIES: {
  key: string;
  label: string;
  hint: string;
  presets: Record<LivingPreset, number>;
}[] = [
  { key: "food", label: "食費", hint: "外食・お弁当を含む", presets: { luxury: 10, average: 8, saving: 5.5 } },
  { key: "utility", label: "水道光熱費", hint: "電気・ガス・水道", presets: { luxury: 3, average: 2.4, saving: 1.8 } },
  { key: "telecom", label: "通信費", hint: "スマホ・ネット回線・サブスク", presets: { luxury: 2, average: 1.2, saving: 0.6 } },
  { key: "daily", label: "日用品", hint: "洗剤・消耗品など", presets: { luxury: 1.5, average: 1, saving: 0.6 } },
  { key: "allowance", label: "小遣い", hint: "夫婦の合計", presets: { luxury: 8, average: 5, saving: 3 } },
  { key: "housing", label: "住居費（ローン以外）", hint: "家賃・管理費・固定資産税など", presets: { luxury: 12, average: 8, saving: 3 } },
  { key: "insurance", label: "保険料", hint: "生命保険・医療保険など", presets: { luxury: 4, average: 2.5, saving: 1.2 } },
  { key: "clothing", label: "被服・美容", hint: "衣類・理美容", presets: { luxury: 2.5, average: 1.3, saving: 0.6 } },
  { key: "medical", label: "医療費", hint: "通院・薬代", presets: { luxury: 1.5, average: 1, saving: 0.6 } },
  { key: "leisure", label: "趣味・交際・娯楽", hint: "レジャー・交際費", presets: { luxury: 5, average: 3, saving: 1.5 } },
  { key: "other", label: "その他", hint: "予備費・雑費", presets: { luxury: 3, average: 1.5, saving: 0.5 } },
];

export const categoryOf = (key: string) => LIVING_CATEGORIES.find((c) => c.key === key);

export function presetItems(preset: LivingPreset): LivingItem[] {
  return LIVING_CATEGORIES.map((c) => ({
    id: `lv-${c.key}`,
    key: c.key,
    label: c.label,
    monthly: c.presets[preset],
    preset,
  }));
}

/** 年間の基本生活費（現在価値、万円） */
export function livingCostOf(expense: ExpenseSettings) {
  return expense.items.reduce((s, x) => s + Math.max(0, x.monthly), 0) * 12;
}
