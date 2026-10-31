import type { Allocation, Fund, PortfolioStats } from "./types";

export type AssetClass = "equity" | "gold" | "cash";

export interface FundPreset {
  id: string;
  name: string;
  expectedReturn: number; // %/年（算術平均）
  risk: number; // %/年（標準偏差）
  assetClass: AssetClass;
}

export const FUND_PRESETS: FundPreset[] = [
  { id: "acwi", name: "オルカン（全世界株式）", expectedReturn: 9, risk: 15, assetClass: "equity" },
  { id: "sp500", name: "S&P500（米国大型株）", expectedReturn: 12, risk: 17, assetClass: "equity" },
  { id: "nasdaq100", name: "NASDAQ-100（米国ハイテク中心）", expectedReturn: 19, risk: 21, assetClass: "equity" },
  { id: "qld", name: "QLD（NASDAQ-100 2倍）", expectedReturn: 29, risk: 42, assetClass: "equity" },
  { id: "fangplus", name: "FANG+", expectedReturn: 15, risk: 25, assetClass: "equity" },
  { id: "gold", name: "ゴールド", expectedReturn: 5, risk: 15, assetClass: "gold" },
  { id: "cash", name: "現金・無リスク資産", expectedReturn: 0, risk: 0, assetClass: "cash" },
];

export const presetOf = (id: string) => FUND_PRESETS.find((p) => p.id === id) ?? FUND_PRESETS[0];

/** 表示用の短い名前（括弧内の説明を除く） */
export const shortName = (id: string) => presetOf(id).name.replace(/（.*）/, "");

export const allocationsToFunds = (a: Allocation[]): Fund[] =>
  a.map((x) => ({ id: x.id, presetId: x.fundId, ratio: x.percentage }));

export const fundsToAllocations = (f: Fund[]): Allocation[] =>
  f.map((x) => ({ id: x.id, fundId: x.presetId, percentage: x.ratio }));

/** 資産クラス間の相関係数（簡易仮定） */
function correlation(a: FundPreset, b: FundPreset) {
  if (a.id === b.id) return 1;
  // NASDAQ-100 とそのレバレッジ型はほぼ同じ値動き
  if ([a.id, b.id].every((id) => id === "nasdaq100" || id === "qld")) return 0.98;
  if (a.assetClass === "cash" || b.assetClass === "cash") return 0;
  if (a.assetClass === b.assetClass) return a.assetClass === "equity" ? 0.85 : 1;
  return 0.1; // 株式とゴールド
}

function weights(funds: Fund[]) {
  const ratioTotal = funds.reduce((s, f) => s + Math.max(0, f.ratio), 0);
  const items = ratioTotal > 0
    ? funds.map((f) => ({ w: Math.max(0, f.ratio) / ratioTotal, p: presetOf(f.presetId) }))
    : [];
  return { ratioTotal, items };
}

/** 2つのポートフォリオのリターンの共分散（%²）。同じものを渡すと分散になる */
export function portfolioCovariance(a: Fund[], b: Fund[]) {
  const wa = weights(a).items;
  const wb = weights(b).items;
  let cov = 0;
  for (const x of wa) {
    for (const y of wb) cov += x.w * y.w * x.p.risk * y.p.risk * correlation(x.p, y.p);
  }
  return cov;
}

/**
 * ポートフォリオの期待リターンとリスク（%）。
 * 割合は合計で正規化し、毎年リバランスする前提で分散共分散から σ を求める。
 */
export function portfolioStats(funds: Fund[]): PortfolioStats {
  const { ratioTotal, items } = weights(funds);
  if (ratioTotal <= 0) return { expectedReturn: 0, risk: 0, ratioTotal };
  const expectedReturn = items.reduce((s, x) => s + x.w * x.p.expectedReturn, 0);
  return { expectedReturn, risk: Math.sqrt(portfolioCovariance(funds, funds)), ratioTotal };
}
