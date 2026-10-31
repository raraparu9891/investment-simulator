import type { MortgageSettings } from "./types";

export interface LoanYear {
  payment: number; // その年の返済額合計
  balance: number; // 年末残高
  rate: number; // その年に適用した金利（%）
  rateChanged: boolean;
  paidOff: boolean; // この年に完済
}

/** 元利均等の毎回返済額（PMT）。r: 1回あたり金利、n: 回数、pv: 残高 */
export function pmt(r: number, n: number, pv: number) {
  if (n <= 0 || pv <= 0) return 0;
  if (r === 0) return pv / n;
  return (pv * r) / (1 - Math.pow(1 + r, -n));
}

/** 現在から afterYears 年後の金利（%） */
export function rateAt(m: MortgageSettings, t: number) {
  const hit = [...m.rateChanges]
    .filter((c) => c.afterYears <= t)
    .sort((a, b) => a.afterYears - b.afterYears)
    .pop();
  return hit ? hit.rate : m.rate;
}

/**
 * 元利均等・月次返済の年次スケジュール。
 * 金利が変わった年は、その時点の残高と残り期間から返済額を再計算する
 * （5年ルール・125%ルールは考慮しない簡易計算）。
 */
export function loanSchedule(m: MortgageSettings, years: number): LoanYear[] {
  const out: LoanYear[] = [];
  let balance = m.enabled ? Math.max(0, m.balance) : 0;
  let monthsLeft = Math.max(0, Math.round(m.years * 12));
  let monthly = 0;
  let prevRate: number | null = null;

  for (let t = 0; t < years; t++) {
    if (balance <= 0 || monthsLeft <= 0) {
      out.push({ payment: 0, balance: 0, rate: 0, rateChanged: false, paidOff: false });
      continue;
    }
    const rate = Math.max(0, rateAt(m, t));
    const rateChanged = prevRate !== null && rate !== prevRate;
    if (prevRate === null || rateChanged) monthly = pmt(rate / 100 / 12, monthsLeft, balance);
    prevRate = rate;

    let payment = 0;
    for (let k = 0; k < 12 && monthsLeft > 0 && balance > 0; k++) {
      const interest = (balance * rate) / 100 / 12;
      const pay = Math.min(monthly, balance + interest);
      balance = balance + interest - pay;
      payment += pay;
      monthsLeft--;
    }
    if (monthsLeft <= 0 || balance < 1e-6) balance = 0;
    out.push({ payment, balance, rate, rateChanged, paidOff: balance === 0 });
  }
  return out;
}
