import type { Asset, PortfolioStats, Weights } from "./types";

/**
 * ポートフォリオの期待リターンとリスク（%）。割合は合計で正規化する。
 * リターン・リスクとも「各投資対象の値 × 割合」の加重平均（リスクは資産間の相関を 1 とみなす簡易計算）。
 * リストにない投資対象 id の割合は無視する。
 */
export function portfolioStats(assets: Asset[], weights: Weights): PortfolioStats {
  const items = assets.map((a) => ({ a, w: Math.max(0, weights[a.id] ?? 0) }));
  const ratioTotal = items.reduce((s, x) => s + x.w, 0);
  if (ratioTotal <= 0) return { expectedReturn: 0, risk: 0, ratioTotal };
  return {
    expectedReturn: items.reduce((s, x) => s + (x.w / ratioTotal) * x.a.expectedReturn, 0),
    risk: items.reduce((s, x) => s + (x.w / ratioTotal) * Math.max(0, x.a.risk), 0),
    ratioTotal,
  };
}

/** 「全世界株式 60%・現預金 40%」形式の配分ラベル */
export function mixLabel(assets: Asset[], weights: Weights) {
  return assets
    .filter((a) => (weights[a.id] ?? 0) > 0)
    .map((a) => `${a.name || "名称未設定"} ${weights[a.id]}%`)
    .join("・");
}

/** 割合の合計を 100% にそろえる（整数に丸め、端数は最大の項目で調整） */
export function normalizeWeights(assets: Asset[], weights: Weights): Weights {
  const ids = assets.map((a) => a.id);
  const total = ids.reduce((s, id) => s + Math.max(0, weights[id] ?? 0), 0);
  if (total <= 0) return ids.length ? { [ids[0]]: 100 } : {};
  const out: Weights = {};
  for (const id of ids) out[id] = Math.round((Math.max(0, weights[id] ?? 0) / total) * 100);
  const diff = 100 - ids.reduce((s, id) => s + out[id], 0);
  const top = ids.reduce((m, id) => (out[id] > out[m] ? id : m), ids[0]);
  out[top] += diff;
  return out;
}
