"use client";

import { useMemo } from "react";
import { educationCostAt, examCostAt } from "@/lib/education";
import { mixLabel, portfolioStats } from "@/lib/funds";
import { carCostAt, carLoanTerms, purchaseAges } from "@/lib/car";
import { livingCostOf } from "@/lib/living";
import { loanSchedule } from "@/lib/loan";
import { grossAt, incomePartsAt } from "@/lib/income";
import { occursAt } from "@/lib/spot";
import type {
  Asset,
  LifeEvent,
  Person,
  SimulationInput,
  SimulationSummary,
  Weights,
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
  const { work, pension, severance } = incomePartsAt(person, age);

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
  if (severance > 0) events.push({ kind: "retire", text: `${who} 退職金 ${yen(severance)}` });
  if (age === person.pensionStartAge) events.push({ kind: "pension", text: `${who} 年金受給開始` });

  return work + pension + severance;
}

export function buildCashflows(input: SimulationInput): YearCashflow[] {
  const { basic, self, spouse, expense, mortgage, cars, children, events, investment } = input;
  const rows: YearCashflow[] = [];
  const years = Math.min(120, Math.max(0, Math.round(basic.endAge - self.currentAge)));
  const loan = loanSchedule(mortgage, years + 1, self.currentAge);
  const baseLiving = livingCostOf(expense);

  for (let t = 0; t <= years; t++) {
    const age = self.currentAge + t;
    const spouseAge = spouse.currentAge + t;
    const inflation = Math.pow(1 + expense.inflationRate / 100, t);
    const yearEvents: LifeEvent[] = [];

    const selfIncome = personYear(self, age, "本人", yearEvents);
    const spouseIncome = personYear(spouse, spouseAge, "配偶者", yearEvents);
    const totalIncome = selfIncome + spouseIncome;

    const livingCost = baseLiving * inflation;
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

    const { payment: loanPayment, balance: loanBalance, rate, rateChanged, paidOff, started } = loan[t];
    if (started) yearEvents.push({ kind: "loan", text: `住宅ローン借入（${yen(mortgage.balance)}・${rate}%）` });
    if (rateChanged) {
      yearEvents.push({ kind: "loan", text: `ローン金利 ${rate}%に変更（年${yen(loanPayment)}）` });
    }
    if (paidOff) yearEvents.push({ kind: "loan", text: "住宅ローン完済" });
    // 自動車（一括 or ローン）。車両価格・ローン返済額にはインフレ率を適用しない
    let carCost = 0;
    for (const car of cars ?? []) {
      carCost += carCostAt(car, age);
      if (purchaseAges(car).includes(age)) {
        yearEvents.push({
          kind: "car",
          text: car.payment === "cash"
            ? `${car.label || "自動車"} 購入（一括${yen(car.price)}）`
            : `${car.label || "自動車"} 購入（ローン${car.loanYears}年・月${carLoanTerms(car).monthly.toFixed(1)}万）`,
        });
      }
    }

    const spots = events.filter((e) => occursAt(e, age));
    const spotCost = spots.reduce((s, e) => s + e.amount, 0);
    spots.forEach((e) => yearEvents.push({ kind: "spot", text: e.label || "スポット支出" }));

    // 開始時点で既に過ぎている targetAge は初年度に実行する
    for (const rb of investment.rebalances ?? []) {
      if (rb.targetAge === age || (t === 0 && rb.targetAge < age)) {
        const mix = mixLabel(investment.assets, rb.allocations);
        yearEvents.push({ kind: "rebalance", text: `リバランス実行（${mix || "配分なし"}）` });
      }
    }

    const totalExpense = livingCost + educationCost + loanPayment + carCost + spotCost;

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
      carCost,
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
 * phases[t].rebalance の年は期首に2口座を合算して新しい配分へ移す（非課税スイッチング）。
 * 積立は現預金が minCash を下回らない範囲でのみ行う。
 */
function projectAssets(
  cashflows: YearCashflow[],
  phases: Phase[],
  minCash: number,
  initialCash: number,
  initialInvested: number,
  returnAt: (t: number) => [number, number],
): AssetYear[] {
  let cash = initialCash;
  let cur = Math.max(0, initialInvested);
  let neu = 0;

  return cashflows.map((cf, t) => {
    if (phases[t]?.rebalance) {
      // 新しい配分で運用する口座へ全額を移す。以後の積立も同じ配分なので口座を分ける意味はない
      cur += neu;
      neu = 0;
    }
    const [rCur, rNew] = returnAt(t);
    cash += cf.netCashflow;

    // A. cash = 年間収支を反映した積立前の現預金
    // B. 投資へ回せる最大許容額 = cash − 最低維持ライン
    // C. 目標積立額と比べて小さいほうを拠出（マイナスなら 0）。赤字の年でも余剰があれば貯金から積み立てる
    // 積立は期中なので半年分の運用とみなす
    const allowance = cash - minCash;
    const deposit = Math.max(0, Math.min(cf.plannedContribution, allowance));
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
// 2.5 ポートフォリオのフェーズ（リバランスで切り替わる）
// ---------------------------------------------------------------------------

interface PhaseStats {
  label: string;
  current: ReturnType<typeof portfolioStats>;
  contribution: ReturnType<typeof portfolioStats>;
  muA: number;
  muB: number;
  sA: number;
  sB: number;
  driftA: number;
  driftB: number;
}

interface Phase extends PhaseStats {
  rebalance: boolean;
}

function phaseStats(label: string, assets: Asset[], curWeights: Weights, newWeights: Weights): PhaseStats {
  const current = portfolioStats(assets, curWeights);
  const contribution = portfolioStats(assets, newWeights);
  const muA = Math.max(finite(current.expectedReturn) / 100, -0.99);
  const muB = Math.max(finite(contribution.expectedReturn) / 100, -0.99);
  const sA = Math.max(finite(current.risk) / 100, 0);
  const sB = Math.max(finite(contribution.risk) / 100, 0);
  return {
    label,
    current,
    contribution,
    muA,
    muB,
    sA,
    sB,
    // GBM: 1年の価格比 = exp(ln(1+μ) − σ²/2 + σZ)  → 期待値が 1+μ になる
    driftA: Math.log(1 + muA) - (sA * sA) / 2,
    driftB: Math.log(1 + muB) - (sB * sB) / 2,
  };
}

/** 各年に適用するポートフォリオ。targetAge に達した年にリバランスし、既存資産・積立とも新配分になる */
function buildPhases(input: SimulationInput, cashflows: YearCashflow[]): Phase[] {
  const { investment } = input;
  const queue = [...(investment.rebalances ?? [])].sort((a, b) => a.targetAge - b.targetAge);
  let stats = phaseStats("初期設定", investment.assets, investment.currentWeights, investment.contributionWeights);
  let next = 0;
  return cashflows.map((cf) => {
    let rebalance = false;
    while (next < queue.length && queue[next].targetAge <= cf.age) {
      const rb = queue[next++];
      stats = phaseStats(`${Math.max(rb.targetAge, cashflows[0].age)}歳〜`, investment.assets, rb.allocations, rb.allocations);
      rebalance = true;
    }
    return { ...stats, rebalance };
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

/**
 * モンテカルロの各試行・各年の総資産（現預金＋運用資産、万円）。totals[trial][t]
 * 初期資産を引数で受け取るので、「もし今の資産が X 万円だったら」の仮定でも回せる。
 */
function monteCarloTotals(
  cashflows: YearCashflow[],
  phases: Phase[],
  minCash: number,
  initialCash: number,
  initialInvested: number,
  normals: Float64Array[],
): Float64Array[] {
  return normals.map((z) => {
    const path = projectAssets(cashflows, phases, minCash, initialCash, initialInvested, (t) => {
      // リスクを加重平均で求める＝資産間の相関を 1 とみなす前提なので、2口座とも同じ乱数で動かす
      const p = phases[t];
      const zt = z[t] ?? 0;
      return [Math.exp(p.driftA + p.sA * zt) - 1, Math.exp(p.driftB + p.sB * zt) - 1];
    });
    return Float64Array.from(path, (p) => p.cash + p.invested);
  });
}

/** 仮定の金融資産を、現預金（最低維持ラインまで）と運用資産に振り分ける */
function splitAssets(currentAssets: number, minCash: number) {
  const cash = Math.min(Math.max(0, currentAssets), minCash);
  return { cash, invested: Math.max(0, currentAssets - cash) };
}

/** 指定した時点（t 年後）で総資産が target 以上になっている試行の割合 (0-1) */
function reachRate(totals: Float64Array[], t: number, target: number) {
  if (totals.length === 0) return 0;
  return totals.filter((row) => (row[t] ?? -Infinity) >= target).length / totals.length;
}

/**
 * 初期資産を currentAssets 万円と仮定したとき、targetAge 歳の時点で総資産が target 万円に届く確率 (0-1)。
 * 収入・支出・積立などのキャッシュフローは入力どおり。
 */
export function reachProbability(
  input: SimulationInput,
  cashflows: YearCashflow[],
  normals: Float64Array[],
  { currentAssets, targetAge, target }: { currentAssets: number; targetAge: number; target: number },
) {
  const t = targetAge - input.self.currentAge;
  if (t < 0 || t >= cashflows.length) return 0;
  const minCash = Math.max(0, finite(input.investment.minCashReserve ?? 0));
  const { cash, invested } = splitAssets(currentAssets, minCash);
  const totals = monteCarloTotals(cashflows, buildPhases(input, cashflows), minCash, cash, invested, normals);
  return reachRate(totals, t, target);
}

export const REACH_TARGET = 10000; // 1億円（万円）
export const REACH_ASSETS = [0, 500, 1000, 2000, 3000, 5000];
export const REACH_YEARS = [5, 10, 15, 20, 25, 30];

export interface ReachMatrix {
  target: number;
  currentAge: number;
  actualAssets: number; // 入力した現在の金融資産（現預金＋運用資産）
  ages: number[]; // 列: 対象年齢（計算期間内のものだけ）
  rows: { assets: number; rates: number[] }[]; // 行: 仮定の初期資産。rates[i] は ages[i] での到達確率 (0-1)
}

/** 初期資産 × 年齢 の目標到達確率の表。初期資産ごとにモンテカルロを1回ずつ回す */
export function buildReachMatrix(
  input: SimulationInput,
  cashflows: YearCashflow[],
  normals: Float64Array[],
  target = REACH_TARGET,
): ReachMatrix {
  const currentAge = input.self.currentAge;
  const years = REACH_YEARS.filter((y) => y < cashflows.length);
  const minCash = Math.max(0, finite(input.investment.minCashReserve ?? 0));
  const phases = buildPhases(input, cashflows);
  return {
    target,
    currentAge,
    actualAssets: input.basic.cashAssets + input.basic.investedAssets,
    ages: years.map((y) => currentAge + y),
    rows: REACH_ASSETS.map((assets) => {
      const { cash, invested } = splitAssets(assets, minCash);
      const totals = monteCarloTotals(cashflows, phases, minCash, cash, invested, normals);
      return { assets, rates: years.map((y) => reachRate(totals, y, target)) };
    }),
  };
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
  const phases = buildPhases(input, cashflows);
  const initial = phases[0] ?? phaseStats("初期設定", investment.assets, investment.currentWeights, investment.contributionWeights);

  // 期待リターン一定のシナリオ（フェーズごとの期待リターン）
  const minCash = Math.max(0, finite(investment.minCashReserve ?? 0));
  const base = projectAssets(cashflows, phases, minCash, basic.cashAssets, basic.investedAssets, (t) => [phases[t].muA, phases[t].muB]);

  const totals = monteCarloTotals(cashflows, phases, minCash, basic.cashAssets, basic.investedAssets, normals);
  const successes = totals.filter((row) => row.every((v) => v >= 0)).length;
  const bands = cashflows.map((_, t) => {
    const s = totals.map((row) => row[t]).sort((a, b) => a - b);
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
      portfolioLabel: phases[t].label,
      rebalanced: phases[t].rebalance,
      returnCurrent: phases[t].current.expectedReturn,
      returnNew: phases[t].contribution.expectedReturn,
      riskCurrent: phases[t].current.risk,
      riskNew: phases[t].contribution.risk,
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
      current: initial.current,
      contribution: initial.contribution,
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
    () => generateNormals(MC_TRIALS, cashflows.length, seed),
    [cashflows.length, seed],
  );
  const result = useMemo(() => runSimulation(input, cashflows, normals), [input, cashflows, normals]);
  const reach = useMemo(() => buildReachMatrix(input, cashflows, normals), [input, cashflows, normals]);
  return { ...result, reach };
}
