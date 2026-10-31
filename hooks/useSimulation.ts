"use client";

import { useMemo } from "react";
import { educationCostAt, examCostAt } from "@/lib/education";
import { portfolioCovariance, portfolioStats } from "@/lib/funds";
import { loanSchedule } from "@/lib/loan";
import { grossAt, netOf, pensionOf } from "@/lib/income";
import { occursAt } from "@/lib/spot";
import type {
  LifeEvent,
  Person,
  SimulationInput,
  SimulationSummary,
  YearCashflow,
  YearResult,
} from "@/lib/types";

// ±2σ（裾 約2.3%）を安定して推定するため、試行回数を多めに取る
export const MC_TRIALS = 1000;

/** 正規分布の ±2σ に対応する累積確率 */
const P_MINUS_2SIGMA = 0.02275;
const P_PLUS_2SIGMA = 0.97725;

const SCHOOL_LABEL = { public: "公立", private: "私立", none: "" } as const;
const yen = (v: number) => `${Math.round(v).toLocaleString()}万`;
const CHANGE_LABEL = { jobchange: "転職", parttime: "パート化", retire: "退職" } as const;

// ---------------------------------------------------------------------------
// 1. 収支スケジュール（運用成績に依存しない部分）
// ---------------------------------------------------------------------------

function personYear(person: Person, age: number, who: string, events: LifeEvent[]) {
  if (!person.enabled) return 0;
  const work = netOf(person, grossAt(person, age));
  const pension = age >= person.pensionStartAge ? pensionOf(person) : 0;

  for (const c of person.changes) {
    if (c.age === age && c.age < person.retirementAge) {
      const text =
        c.type === "retire"
          ? `${who} 退職`
          : `${who} ${CHANGE_LABEL[c.type]}（額面${c.grossIncome}万）`;
      events.push({ kind: c.type === "retire" ? "retire" : "work", text });
    }
  }
  for (const p of person.promotions ?? []) {
    if (p.age === age && p.age >= person.currentAge && p.age < person.retirementAge) {
      events.push({ kind: "work", text: `${who} 昇進（額面${yen(grossAt(person, age))}）` });
    }
  }
  if (age === person.retirementAge) events.push({ kind: "retire", text: `${who} 完全リタイア` });
  if (age === person.pensionStartAge) events.push({ kind: "pension", text: `${who} 年金受給開始` });

  return work + pension;
}

export function buildCashflows(input: SimulationInput): YearCashflow[] {
  const { basic, self, spouse, expense, mortgage, children, events, investment } = input;
  const rows: YearCashflow[] = [];
  const years = Math.min(120, Math.max(0, Math.round(basic.endAge - self.currentAge)));
  const loan = loanSchedule(mortgage, years + 1);

  for (let t = 0; t <= years; t++) {
    const age = self.currentAge + t;
    const spouseAge = spouse.currentAge + t;
    const inflation = Math.pow(1 + expense.inflationRate / 100, t);
    const yearEvents: LifeEvent[] = [];

    const selfIncome = personYear(self, age, "本人", yearEvents);
    const spouseIncome = personYear(spouse, spouseAge, "配偶者", yearEvents);
    const totalIncome = selfIncome + spouseIncome;

    const livingCost = expense.livingCost * inflation;
    let educationCost = 0;
    for (const child of children) {
      const childAge = child.currentAge + t;
      const { cost, stage } = educationCostAt(child, childAge);
      educationCost += cost * inflation;
      if (stage && childAge === stage.from) {
        yearEvents.push({
          kind: "school",
          text: `${child.name} ${stage.label}入学(${
            stage.key === "graduate" && child.graduate === "public" ? "国立" : SCHOOL_LABEL[child[stage.key]]
          })`,
        });
      }
      const exam = examCostAt(child, childAge);
      educationCost += exam.cost * inflation;
      if (exam.exam && exam.isFirstYear) {
        yearEvents.push({ kind: "school", text: `${child.name} ${exam.exam.label}対策（塾）開始` });
      }
      if (exam.exam && exam.isExamYear) {
        yearEvents.push({ kind: "school", text: `${child.name} ${exam.exam.label}` });
      }
    }

    const { payment: loanPayment, balance: loanBalance, rate, rateChanged, paidOff } = loan[t];
    if (rateChanged) {
      yearEvents.push({ kind: "loan", text: `ローン金利 ${rate}%に変更（年${yen(loanPayment)}）` });
    }
    if (paidOff) yearEvents.push({ kind: "loan", text: "住宅ローン完済" });
    const spots = events.filter((e) => occursAt(e, age));
    const spotCost = spots.reduce((s, e) => s + e.amount, 0);
    spots.forEach((e) => yearEvents.push({ kind: "spot", text: e.label || "スポット支出" }));

    const totalExpense = livingCost + educationCost + loanPayment + spotCost;

    const rule = [...investment.rules]
      .reverse()
      .find((ru) => age >= ru.fromAge && age <= ru.toAge);

    rows.push({
      age,
      spouseAge: spouse.enabled ? spouseAge : null,
      selfIncome,
      spouseIncome,
      totalIncome,
      livingCost,
      educationCost,
      loanPayment,
      loanBalance,
      spotCost,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      plannedContribution: rule ? rule.amount : investment.baseContribution,
      events: yearEvents,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 2. 資産推移（毎年のリターン列を与えて計算）
// ---------------------------------------------------------------------------

interface AssetYear {
  contribution: number;
  investmentReturn: number;
  cash: number;
  investedCurrent: number;
  investedNew: number;
  invested: number;
}

/**
 * returnAt(t) は [現在のポートフォリオの利回り, 積立ポートフォリオの利回り] を返す。
 * 2つの口座は別々に複利運用し、取り崩しは残高の比率で按分する。
 */
function projectAssets(
  cashflows: YearCashflow[],
  initialCash: number,
  initialInvested: number,
  returnAt: (t: number) => [number, number],
): AssetYear[] {
  let cash = initialCash;
  let cur = Math.max(0, initialInvested);
  let neu = 0;

  return cashflows.map((cf, t) => {
    const [rCur, rNew] = returnAt(t);
    cash += cf.netCashflow;

    // 現預金の範囲でのみ積み立てる（積立は期中なので半年分の運用とみなす）
    const deposit = Math.min(cf.plannedContribution, Math.max(0, cash));
    cash -= deposit;

    // 現預金が不足したら運用資産から取り崩す
    let withdrawal = 0;
    const pool = cur + neu;
    if (cash < 0 && pool > 0) {
      withdrawal = Math.min(pool, -cash);
      cash += withdrawal;
    }
    const wCur = pool > 0 ? withdrawal * (cur / pool) : 0;
    const wNew = withdrawal - wCur;

    const retCur = Math.max(0, cur - wCur) * rCur;
    const retNew = Math.max(0, neu - wNew) * rNew + deposit * (rNew / 2);
    cur = Math.max(0, cur - wCur + retCur);
    neu = Math.max(0, neu - wNew + deposit + retNew);

    return {
      contribution: deposit - withdrawal,
      investmentReturn: retCur + retNew,
      cash,
      investedCurrent: cur,
      investedNew: neu,
      invested: cur + neu,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. モンテカルロ（幾何ブラウン運動による年次リターン）
// ---------------------------------------------------------------------------

/** 再現性のある疑似乱数（mulberry32） */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 標準正規乱数の行列 [trial][year]（Box-Muller） */
export function generateNormals(trials: number, years: number, seed: number) {
  const rand = mulberry32(seed);
  const out: Float64Array[] = [];
  for (let i = 0; i < trials; i++) {
    const row = new Float64Array(years);
    for (let j = 0; j < years; j++) {
      const u = 1 - rand();
      const v = rand();
      row[j] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    out.push(row);
  }
  return out;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ---------------------------------------------------------------------------
// 4. 出力フォーマットの検証
// ---------------------------------------------------------------------------

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/**
 * グラフ・表に渡す行から null / undefined / NaN / ±Infinity を排除する。
 * 異常値が出た場合は開発時に警告し、0 に置き換える（Recharts の描画崩れ防止）。
 */
function sanitizeRow(row: YearResult): YearResult {
  const bad: string[] = [];
  const out = { ...row } as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(row)) {
    if (k === "spouseAge" && v === null) continue;
    if (typeof v === "number" && !Number.isFinite(v)) {
      bad.push(k);
      out[k] = 0;
    } else if (v === null || v === undefined) {
      bad.push(k);
      out[k] = 0;
    }
  }
  const r = out as unknown as YearResult;
  if (bad.length && process.env.NODE_ENV !== "production") {
    console.warn(`[useSimulation] ${row.age}歳の行に非有限値: ${bad.join(", ")}`);
  }
  return r;
}

// ---------------------------------------------------------------------------
// 5. 統合
// ---------------------------------------------------------------------------

export function runSimulation(
  input: SimulationInput,
  cashflows: YearCashflow[],
  normals: Float64Array[],
): { rows: YearResult[]; summary: SimulationSummary } {
  const { basic, self, investment } = input;
  const current = portfolioStats(investment.currentFunds);
  const contribution = portfolioStats(investment.contributionFunds);
  const muA = Math.max(finite(current.expectedReturn) / 100, -0.99);
  const muB = Math.max(finite(contribution.expectedReturn) / 100, -0.99);
  const sA = Math.max(finite(current.risk) / 100, 0);
  const sB = Math.max(finite(contribution.risk) / 100, 0);
  // 2つのポートフォリオは同じ市場で動くので相関を持たせる
  const cov = portfolioCovariance(investment.currentFunds, investment.contributionFunds) / 10000;
  const rho = sA > 0 && sB > 0 ? Math.max(-1, Math.min(1, cov / (sA * sB))) : 0;
  const rhoC = Math.sqrt(Math.max(0, 1 - rho * rho));

  // 期待リターン一定のシナリオ
  const base = projectAssets(cashflows, basic.cashAssets, basic.investedAssets, () => [muA, muB]);

  // GBM: 1年の価格比 = exp(ln(1+μ) − σ²/2 + σZ)  → 期待値が 1+μ になる
  const driftA = Math.log(1 + muA) - (sA * sA) / 2;
  const driftB = Math.log(1 + muB) - (sB * sB) / 2;
  const years = cashflows.length;
  const totalsByYear: number[][] = cashflows.map(() => []);
  let successes = 0;
  for (const z of normals) {
    const path = projectAssets(cashflows, basic.cashAssets, basic.investedAssets, (t) => {
      const z1 = z[t] ?? 0;
      const z2 = rho * z1 + rhoC * (z[years + t] ?? 0);
      return [Math.exp(driftA + sA * z1) - 1, Math.exp(driftB + sB * z2) - 1];
    });
    let ok = true;
    path.forEach((p, t) => {
      const total = p.cash + p.invested;
      totalsByYear[t].push(total);
      if (total < 0) ok = false;
    });
    if (ok) successes++;
  }
  const bands = totalsByYear.map((vals) => {
    const s = [...vals].sort((a, b) => a - b);
    return {
      minus2: percentile(s, P_MINUS_2SIGMA),
      median: percentile(s, 0.5),
      plus2: percentile(s, P_PLUS_2SIGMA),
    };
  });

  const rows: YearResult[] = cashflows.map((cf, t) => {
    const total = base[t].cash + base[t].invested;
    return sanitizeRow({
      ...cf,
      ...base[t],
      totalAssets: total,
      fixedReturnAssets: total,
      mcMedian: bands[t].median,
      mcPlus2Sigma: bands[t].plus2,
      mcMinus2Sigma: bands[t].minus2,
    });
  });

  const retireRow = rows.find((x) => x.age === self.retirementAge - 1) ?? rows[rows.length - 1];
  const minRow = rows.reduce((m, x) => (x.totalAssets < m.totalAssets ? x : m), rows[0]);
  const last = rows[rows.length - 1];

  return {
    rows,
    summary: {
      current,
      contribution,
      assetsAtRetirement: retireRow?.totalAssets ?? 0,
      finalAssets: last?.totalAssets ?? 0,
      minAssets: minRow?.totalAssets ?? 0,
      minAssetsAge: minRow?.age ?? self.currentAge,
      depletionAge: rows.find((x) => x.totalAssets < 0)?.age ?? null,
      trials: normals.length,
      successRate: normals.length ? successes / normals.length : 0,
      finalMedian: last?.mcMedian ?? 0,
      finalPlus2Sigma: last?.mcPlus2Sigma ?? 0,
      finalMinus2Sigma: last?.mcMinus2Sigma ?? 0,
    },
  };
}

/** seed を変えると乱数列を引き直す。入力変更時は同じ乱数列で再計算するのでグラフがちらつかない */
export function useSimulation(input: SimulationInput, seed: number) {
  const cashflows = useMemo(() => buildCashflows(input), [input]);
  const normals = useMemo(
    // 1試行あたり [現在ポートフォリオ用 | 積立用] の2系列ぶんの乱数を持つ
    () => generateNormals(MC_TRIALS, cashflows.length * 2, seed),
    [cashflows.length, seed],
  );
  return useMemo(() => runSimulation(input, cashflows, normals), [input, cashflows, normals]);
}
