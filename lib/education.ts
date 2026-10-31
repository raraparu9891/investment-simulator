import type { Child } from "./types";

// 年間教育費の目安（万円/年）
// 小〜高: 文部科学省「子供の学習費調査（令和3年度）」の学習費総額を概算
// 大学: 授業料＋入学金・施設費を4年で按分した概算
// 大学院(修士): 授業料＋入学金を2年で按分した概算（国立 ≒ 53.6万×2＋28.2万）
export const EDUCATION_COST = {
  elementary: { public: 35, private: 167 },
  juniorHigh: { public: 54, private: 144 },
  highSchool: { public: 51, private: 105 },
  university: { public: 60, private: 115, none: 0 },
  graduate: { public: 68, private: 110, none: 0 },
} as const;

export const STAGES = [
  { key: "elementary", label: "小学校", from: 6, to: 11 },
  { key: "juniorHigh", label: "中学校", from: 12, to: 14 },
  { key: "highSchool", label: "高校", from: 15, to: 17 },
  { key: "university", label: "大学", from: 18, to: 21 },
  { key: "graduate", label: "大学院", from: 22, to: 23 },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

/** 子供の年齢に対する、現在価値ベースの年間教育費と在籍段階 */
export function educationCostAt(child: Child, childAge: number) {
  const stage = STAGES.find((s) => childAge >= s.from && childAge <= s.to);
  if (!stage) return { cost: 0, stage: null };
  if (stage.key === "graduate" && child.university === "none") return { cost: 0, stage: null };
  const choice = child[stage.key];
  const cost = (EDUCATION_COST[stage.key] as Record<string, number>)[choice] ?? 0;
  return { cost, stage: cost > 0 ? stage : null };
}
