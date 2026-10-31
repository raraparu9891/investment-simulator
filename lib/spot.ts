import type { SpotEvent } from "./types";

/** 指定年齢（本人）にこのスポット支出が発生するか */
export function occursAt(e: SpotEvent, age: number) {
  if (!e.isRecurring) return age === e.startAge;
  const interval = Math.max(1, Math.round(e.interval));
  return age >= e.startAge && age <= e.endAge && (age - e.startAge) % interval === 0;
}

/** 発生年齢の一覧（UI の要約表示用） */
export function occurrenceAges(e: SpotEvent) {
  if (!e.isRecurring) return [e.startAge];
  const interval = Math.max(1, Math.round(e.interval));
  const ages: number[] = [];
  for (let a = e.startAge; a <= e.endAge && ages.length < 200; a += interval) ages.push(a);
  return ages;
}

export interface SpotPreset {
  id: string;
  label: string;
  description: string;
  items: { label: string; amount: number; interval: number; untilAge: number }[];
}

export const SPOT_PRESETS: SpotPreset[] = [
  {
    id: "house",
    label: "戸建て修繕・メンテパック",
    description: "10年ごと50万・15年ごと150万",
    items: [
      { label: "給湯器・インターホン・家電交換", amount: 50, interval: 10, untilAge: 85 },
      { label: "外壁・屋根塗装・庭木手入れ", amount: 150, interval: 15, untilAge: 85 },
    ],
  },
  {
    id: "travel",
    label: "定期的な家族旅行",
    description: "毎年30万",
    items: [{ label: "家族旅行（国内離島など）", amount: 30, interval: 1, untilAge: 75 }],
  },
  {
    id: "car",
    label: "自動車買い替え",
    description: "7年ごと300万",
    items: [{ label: "自動車買い替え", amount: 300, interval: 7, untilAge: 75 }],
  },
];
