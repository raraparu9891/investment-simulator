import type { Fund } from "./types";

export type AssetClass = "equity" | "gold" | "cash";

export interface FundPreset {
  id: string;
  name: string;
  expectedReturn: number; // %/年（算術平均）
  risk: number; // %/年（標準偏差）
  assetClass: AssetClass;
}

export const FUND_PRESETS: FundPreset[] = [
  { id: "sp500", name: "S&P500", expectedReturn: 7, risk: 15, assetClass: "equity" },
  { id: "nasdaq100", name: "NASDAQ100", expectedReturn: 11, risk: 20, assetClass: "equity" },
  { id: "fangplus", name: "FANG+", expectedReturn: 15, risk: 25, assetClass: "equity" },
  { id: "qld", name: "QLD / レバレッジ型", expectedReturn: 20, risk: 40, assetClass: "equity" },
  { id: "gold", name: "ゴールド", expectedReturn: 5, risk: 15, assetClass: "gold" },
  { id: "acwi", name: "オールカントリー", expectedReturn: 6, risk: 13, assetClass: "equity" },
  { id: "cash", name: "現金・無リスク資産", expectedReturn: 0, risk: 0, assetClass: "cash" },
];

export const presetOf = (id: string) => FUND_PRESETS.find((p) => p.id === id) ?? FUND_PRESETS[0];

/** 資産クラス間の相関係数（簡易仮定） */
function correlation(a: AssetClass, b: AssetClass) {
  if (a === "cash" || b === "cash") return 0;
  if (a === b) return a === "equity" ? 0.85 : 1;
  return 0.1; // 株式とゴールド
}

/**
 * ポートフォリオの期待リターンとリスク（%）。
 * 割合は合計で正規化し、毎年リバランスする前提で分散共分散から σ を求める。
 */
export function portfolioStats(funds: Fund[]) {
  const ratioTotal = funds.reduce((s, f) => s + Math.max(0, f.ratio), 0);
  if (ratioTotal <= 0) return { expectedReturn: 0, risk: 0, ratioTotal };

  const items = funds.map((f) => ({ w: Math.max(0, f.ratio) / ratioTotal, p: presetOf(f.presetId) }));
  const expectedReturn = items.reduce((s, x) => s + x.w * x.p.expectedReturn, 0);
  let variance = 0;
  for (const a of items) {
    for (const b of items) {
      const rho = a.p.id === b.p.id ? 1 : correlation(a.p.assetClass, b.p.assetClass);
      variance += a.w * b.w * a.p.risk * b.p.risk * rho;
    }
  }
  return { expectedReturn, risk: Math.sqrt(variance), ratioTotal };
}
