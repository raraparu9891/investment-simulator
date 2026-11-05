import { pmt } from "./loan";
import type { CarPlan } from "./types";

/** 購入する年齢（本人）の一覧 */
export function purchaseAges(car: CarPlan) {
  const interval = Math.max(1, Math.round(car.interval));
  const ages: number[] = [];
  for (let a = car.startAge; a <= car.endAge && ages.length < 100; a += interval) ages.push(a);
  return ages;
}

/** ローンの月々の返済額と総支払額（万円） */
export function carLoanTerms(car: CarPlan) {
  const months = Math.max(1, Math.round(car.loanYears * 12));
  const monthly = pmt(Math.max(0, car.loanRate) / 100 / 12, months, Math.max(0, car.price));
  return { months, monthly, total: monthly * months };
}

/**
 * 本人の年齢 age の年に、この車で発生する支出（万円/年）。
 * 一括は購入年に車両価格を計上。ローンは購入年から月々の返済額 × 12 を毎年計上する
 * （買い替え周期より返済期間が長い場合は、前の車のローンと重複して支払う）。
 */
export function carCostAt(car: CarPlan, age: number) {
  const ages = purchaseAges(car);
  if (car.payment === "cash") return ages.includes(age) ? Math.max(0, car.price) : 0;
  const { months, monthly } = carLoanTerms(car);
  let cost = 0;
  for (const p of ages) {
    const paidBefore = (age - p) * 12; // この年の期首までに支払った回数
    if (paidBefore < 0 || paidBefore >= months) continue;
    cost += monthly * Math.min(12, months - paidBefore);
  }
  return cost;
}
