"use client";

import { useMemo } from "react";
import { incomePartsAt } from "@/lib/income";
import type { LifeEvent, SimulationInput } from "@/lib/types";
import { buildCashflows } from "./useSimulation";

/** ウィザードのプレビューグラフ用の1年分（万円/年） */
export interface PreviewRow {
  age: number;
  spouseAge: number | null;
  // 収入の内訳
  selfWork: number;
  spouseWork: number;
  pension: number; // 本人＋配偶者
  severance: number; // 本人＋配偶者
  totalIncome: number;
  // 支出の内訳
  livingCost: number;
  loanPayment: number;
  carCost: number;
  educationCost: number;
  spotCost: number;
  totalExpense: number;
  netCashflow: number;
  events: LifeEvent[];
}

export interface PreviewSummary {
  years: number;
  lifetimeIncome: number;
  lifetimeExpense: number;
  peakExpense: { age: number; amount: number } | null;
  deficitYears: number; // 収支がマイナスになる年の数
}

/**
 * 運用（モンテカルロ）を含まない、収入と支出の推移だけの簡易計算。
 * 入力が変わるたびに再計算する。
 */
export function usePreviewData(input: SimulationInput) {
  return useMemo(() => {
    const rows: PreviewRow[] = buildCashflows(input).map((r) => {
      const self = incomePartsAt(input.self, r.age);
      const spouse = r.spouseAge === null ? null : incomePartsAt(input.spouse, r.spouseAge);
      return {
        age: r.age,
        spouseAge: r.spouseAge,
        selfWork: self.work,
        spouseWork: spouse?.work ?? 0,
        pension: self.pension + (spouse?.pension ?? 0),
        severance: self.severance + (spouse?.severance ?? 0),
        totalIncome: r.totalIncome,
        livingCost: r.livingCost,
        loanPayment: r.loanPayment,
        carCost: r.carCost,
        educationCost: r.educationCost,
        spotCost: r.spotCost,
        totalExpense: r.totalExpense,
        netCashflow: r.netCashflow,
        events: r.events,
      };
    });

    const peak = rows.reduce<PreviewRow | null>((m, r) => (!m || r.totalExpense > m.totalExpense ? r : m), null);
    const summary: PreviewSummary = {
      years: rows.length,
      lifetimeIncome: rows.reduce((s, r) => s + r.totalIncome, 0),
      lifetimeExpense: rows.reduce((s, r) => s + r.totalExpense, 0),
      peakExpense: peak ? { age: peak.age, amount: peak.totalExpense } : null,
      deficitYears: rows.filter((r) => r.netCashflow < 0).length,
    };
    return { rows, summary };
  }, [input]);
}
