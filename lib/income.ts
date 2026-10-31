import type { Person } from "./types";

// ---------------------------------------------------------------------------
// 手取り計算（簡易）
// ---------------------------------------------------------------------------

const SOCIAL_INSURANCE_RATE = 0.15;
const SOCIAL_INSURANCE_CAP = 1800; // 標準報酬の上限を年収ベースで概算

/** 給与所得控除（2025年改正後の概算） */
function salaryDeduction(gross: number) {
  if (gross <= 190) return Math.min(gross, 65);
  if (gross <= 360) return gross * 0.3 + 8;
  if (gross <= 660) return gross * 0.2 + 44;
  if (gross <= 850) return gross * 0.1 + 110;
  return 195;
}

/** 所得税（速算表、復興特別所得税 2.1% 込み） */
function incomeTax(taxable: number) {
  const brackets: [number, number, number][] = [
    [195, 0.05, 0],
    [330, 0.1, 9.75],
    [695, 0.2, 42.75],
    [900, 0.23, 63.6],
    [1800, 0.33, 153.6],
    [4000, 0.4, 279.6],
    [Infinity, 0.45, 479.6],
  ];
  if (taxable <= 0) return 0;
  const [, rate, deduction] = brackets.find(([limit]) => taxable <= limit)!;
  return (taxable * rate - deduction) * 1.021;
}

export interface NetIncomeBreakdown {
  gross: number;
  socialInsurance: number;
  incomeTax: number;
  residentTax: number;
  net: number;
}

/**
 * 額面年収（万円）から手取りを概算する。
 * 社会保険料 15%、給与所得控除・基礎控除のみを考慮した所得税＋住民税(10%)。
 * 一般的な年収帯で額面の 70〜80% 程度になる。
 */
export function calculateNetIncomeDetail(gross: number): NetIncomeBreakdown {
  if (gross <= 0) return { gross: 0, socialInsurance: 0, incomeTax: 0, residentTax: 0, net: 0 };
  const socialInsurance = Math.min(gross, SOCIAL_INSURANCE_CAP) * SOCIAL_INSURANCE_RATE;
  const base = gross - salaryDeduction(gross) - socialInsurance;
  const it = incomeTax(Math.max(0, base - 48));
  const rtBase = Math.max(0, base - 43);
  const rt = rtBase > 0 ? rtBase * 0.1 + 0.5 : 0;
  return {
    gross,
    socialInsurance,
    incomeTax: it,
    residentTax: rt,
    net: gross - socialInsurance - it - rt,
  };
}

export function calculateNetIncome(gross: number) {
  return calculateNetIncomeDetail(gross).net;
}

// ---------------------------------------------------------------------------
// 就労収入の推移
// ---------------------------------------------------------------------------

/** 指定年齢における額面年収（働き方の変化・退職を反映） */
export function grossAt(person: Person, age: number) {
  if (age >= person.retirementAge) return 0;
  const active = [...person.changes]
    .sort((a, b) => a.age - b.age)
    .filter((c) => c.age <= age)
    .pop();
  const g = 1 + person.raiseRate / 100;

  if (!active) return person.grossIncome * Math.pow(g, age - person.currentAge);
  switch (active.type) {
    case "retire":
      return 0;
    case "parttime":
      return active.grossIncome;
    case "jobchange":
      // 転職後の年収を起点に昇給を継続
      return active.grossIncome * Math.pow(g, age - active.age);
  }
}

/** 額面→手取り。手動入力時は「現在の手取り率」を将来の額面にも適用する */
export function netOf(person: Person, gross: number) {
  if (gross <= 0) return 0;
  if (person.manualNet && person.grossIncome > 0) {
    return gross * (person.netIncome / person.grossIncome);
  }
  return calculateNetIncome(gross);
}

// ---------------------------------------------------------------------------
// 年金の簡易推計
// ---------------------------------------------------------------------------

export const CAREER_START_AGE = 22;
const NATIONAL_PENSION_FULL = 81; // 老齢基礎年金 満額（概算・年額）
const EMPLOYEE_PENSION_RATE = 5.481 / 1000; // 報酬比例部分の給付乗率
const STD_MONTHLY_CAP = 65; // 標準報酬月額の上限（万円）
const EMPLOYEE_PENSION_THRESHOLD = 106; // これ未満の年収は厚生年金に加入しないとみなす

export interface PensionEstimate {
  national: number;
  employee: number;
  total: number;
  enrolledYears: number;
  averageGross: number;
}

/**
 * 国民年金（満額）＋ 厚生年金（平均年収 ÷ 12 × 5.481/1000 × 加入月数）。
 * 過去の年収は現在の額面を昇給率で割り戻して推計する。
 */
export function estimatePension(person: Person): PensionEstimate {
  if (!person.enabled) return { national: 0, employee: 0, total: 0, enrolledYears: 0, averageGross: 0 };

  const national = NATIONAL_PENSION_FULL;
  if (person.employment !== "employee") {
    return { national, employee: 0, total: national, enrolledYears: 0, averageGross: 0 };
  }

  const g = 1 + person.raiseRate / 100;
  const lastAge = Math.min(person.retirementAge, 70);
  let enrolledYears = 0;
  let sumGross = 0;
  let employee = 0;
  for (let age = CAREER_START_AGE; age < lastAge; age++) {
    const gross =
      age < person.currentAge
        ? person.grossIncome / Math.pow(g, person.currentAge - age)
        : grossAt(person, age);
    if (gross < EMPLOYEE_PENSION_THRESHOLD) continue;
    enrolledYears++;
    sumGross += gross;
    employee += Math.min(gross / 12, STD_MONTHLY_CAP) * EMPLOYEE_PENSION_RATE * 12;
  }

  return {
    national,
    employee,
    total: national + employee,
    enrolledYears,
    averageGross: enrolledYears ? sumGross / enrolledYears : 0,
  };
}

export function pensionOf(person: Person) {
  return person.pensionAuto ? estimatePension(person).total : person.pension;
}
