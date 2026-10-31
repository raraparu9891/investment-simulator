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
