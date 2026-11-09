"use client";

import type { ReachMatrix } from "@/hooks/useSimulation";
import { formatMan } from "./ui";

/** 確率帯ごとのセルの色（0-19 / 20-49 / 50-79 / 80-100%） */
const BANDS: { min: number; label: string; cell: string }[] = [
  { min: 80, label: "80%以上", cell: "bg-green-500 text-white font-black shadow-inner shadow-green-700/30" },
  { min: 50, label: "50〜79%", cell: "bg-green-200 text-green-900 font-bold" },
  { min: 20, label: "20〜49%", cell: "bg-orange-200 text-orange-900 font-bold" },
  { min: 0, label: "0〜19%", cell: "bg-gray-100 text-gray-400 font-medium" },
];
const bandOf = (pct: number) => BANDS.find((b) => pct >= b.min) ?? BANDS[BANDS.length - 1];

const assetLabel = (v: number) => (v === 0 ? "0円" : formatMan(v));
// 1億円ちょうどなどは「1.00億円」ではなく「1億円」と表示する
const targetLabel = (v: number) => (v % 10000 === 0 ? `${v / 10000}億円` : formatMan(v));

/** 1億円到達確率のヒートマップ（初期資産 × 年齢） */
export default function ReachHeatmap({ matrix, trials }: { matrix: ReachMatrix; trials: number }) {
  const { ages, rows, currentAge, target, actualAssets } = matrix;
  // いまの資産額に一番近い仮定の行に目印を付ける
  const nearest = rows.reduce((m, r) => (Math.abs(r.assets - actualAssets) < Math.abs(m.assets - actualAssets) ? r : m), rows[0]);

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-lg">
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          🎯 {targetLabel(target)}到達確率シミュレーション
          <span className="ml-2 align-middle text-base font-bold text-slate-500 sm:text-lg">（現在年齢: {currentAge}歳）</span>
        </h3>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          「もし今の金融資産が○○円だったら」と仮定し、入力した収入・支出・積立のまま{trials.toLocaleString()}回のモンテカルロで、
          各年齢の時点で総資産（現預金＋運用資産）が{targetLabel(target)}以上になっている確率です。
        </p>
      </div>

      {ages.length === 0 ? (
        <p className="px-6 py-6 text-sm text-slate-500">計算期間が5年未満のため表示できません（ステップ1の「何歳までシミュレーションするか」を確認してください）。</p>
      ) : (
        <div className="overflow-x-auto px-4 py-4 sm:px-6">
          <table className="w-full min-w-[36rem] border-separate border-spacing-1.5 text-center">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 bg-white/90 px-2 py-2 text-left text-xs font-bold text-slate-500 backdrop-blur sm:text-sm">
                  初期資産 ＼ 年齢
                </th>
                {ages.map((age) => (
                  <th key={age} className="px-2 py-2">
                    <div className="text-lg font-black tabular-nums text-slate-800 sm:text-xl">{age}歳</div>
                    <div className="text-[11px] font-medium text-slate-400">+{age - currentAge}年後</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const mine = row === nearest;
                return (
                  <tr key={row.assets}>
                    <th className={`sticky left-0 z-10 whitespace-nowrap rounded-lg px-3 py-2 text-left backdrop-blur ${
                      mine ? "bg-indigo-600 text-white" : "bg-white/90 text-slate-700"
                    }`}>
                      <div className="text-base font-black tabular-nums sm:text-lg">{assetLabel(row.assets)}</div>
                      {mine && <div className="text-[10px] font-medium text-indigo-100">いまの資産に近い</div>}
                    </th>
                    {row.rates.map((rate, i) => {
                      const pct = Math.round(rate * 100);
                      return (
                        <td key={ages[i]} title={`${assetLabel(row.assets)}スタート → ${ages[i]}歳で${targetLabel(target)}以上: ${pct}%`}
                          className={`rounded-xl px-2 py-3 text-xl tabular-nums transition-colors sm:text-2xl ${bandOf(pct).cell} ${
                            mine ? "ring-2 ring-indigo-400 ring-offset-1" : ""
                          }`}>
                          {pct}<span className="text-sm">%</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-amber-200/70 bg-white/60 px-4 py-3 text-xs text-slate-600 sm:px-6">
        {[...BANDS].reverse().map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1.5">
            <span className={`h-4 w-6 rounded ${b.cell}`} /> {b.label}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">
          現在の入力値: {formatMan(actualAssets)}。仮定の資産は最低維持ラインまでを現預金、残りを運用資産として計算
        </span>
      </div>
    </section>
  );
}
