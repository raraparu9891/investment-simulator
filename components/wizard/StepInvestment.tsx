"use client";

import { CalendarClock, Layers, PiggyBank, Play, Plus, ShieldCheck, Shuffle } from "lucide-react";
import { MC_TRIALS } from "@/hooks/useSimulation";
import { uid } from "@/lib/defaults";
import { normalizeWeights, portfolioStats } from "@/lib/funds";
import { livingCostOf } from "@/lib/living";
import type { Asset, RebalanceEvent, Weights } from "@/lib/types";
import { AddButton, ItemCard, NumberField, TextField } from "../ui";
import { Card, patcher, round2, yen, type StepProps } from "./shared";

/** 投資対象マスターの編集 */
function AssetEditor({ assets, onChange, onRemove }: {
  assets: Asset[];
  onChange: (assets: Asset[]) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {assets.map((a) => {
        const update = (v: Partial<Asset>) => onChange(assets.map((x) => (x.id === a.id ? { ...x, ...v } : x)));
        return (
          <ItemCard key={a.id} onRemove={() => onRemove(a.id)}>
            <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2">
              <TextField label="名称" value={a.name} onChange={(v) => update({ name: v })} />
              <NumberField label="想定リターン" unit="%" step={0.5} value={a.expectedReturn}
                onChange={(v) => update({ expectedReturn: v })} />
              <NumberField label="想定リスク" unit="%" step={0.5} min={0} value={a.risk}
                onChange={(v) => update({ risk: Math.max(0, v) })} />
            </div>
          </ItemCard>
        );
      })}
      <AddButton onClick={() => onChange([...assets, { id: uid(), name: "新しい投資対象", expectedReturn: 5, risk: 10 }])}>
        <Plus size={16} /> 投資対象を追加
      </AddButton>
    </div>
  );
}

const BAR_COLORS = ["bg-indigo-500", "bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-violet-400"];

/** 投資対象リストを展開し、割合（%）だけを入力する */
function WeightEditor({ assets, weights, onChange }: {
  assets: Asset[];
  weights: Weights;
  onChange: (w: Weights) => void;
}) {
  const { expectedReturn: rate, risk, ratioTotal } = portfolioStats(assets, weights);
  const off = Math.abs(ratioTotal - 100) > 0.01;
  if (assets.length === 0) {
    return <p className="text-xs text-amber-600">先に「投資対象」を1つ以上追加してください。</p>;
  }
  return (
    <div className="space-y-2">
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {assets.map((a, i) => (
          <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-slate-700">{a.name || "名称未設定"}</span>
              <span className="block text-[10px] text-slate-400">リターン {a.expectedReturn}% ／ リスク {a.risk}%</span>
            </span>
            <div className="w-24">
              <NumberField label="" unit="%" step={5} min={0} max={100} value={weights[a.id] ?? 0}
                onChange={(v) => onChange({ ...weights, [a.id]: Math.max(0, v) })} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {assets.map((a, i) => (
          <div key={a.id} style={{ width: `${(Math.max(0, weights[a.id] ?? 0) / Math.max(100, ratioTotal)) * 100}%` }}
            className={BAR_COLORS[i % BAR_COLORS.length]} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={off ? "font-semibold text-amber-600" : "text-slate-500"}>合計 {Math.round(ratioTotal * 10) / 10}%</span>
        {off && (
          <button type="button" onClick={() => onChange(normalizeWeights(assets, weights))}
            className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 hover:bg-amber-100">
            100%にそろえる
          </button>
        )}
        <span className="text-slate-500">
          ／期待リターン <span className="font-semibold">{rate.toFixed(2)}%</span>
          ／リスク <span className="font-semibold">{risk.toFixed(1)}%</span>
        </span>
      </div>
      {off && <p className="text-[11px] text-amber-600">合計が100%でない場合は、比率で正規化して計算します。</p>}
    </div>
  );
}

function SubCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div>
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <div className="text-[11px] text-slate-400">{note}</div>
      </div>
      {children}
    </div>
  );
}

export default function StepInvestment({ input, setInput, onRun }: StepProps & { onRun: () => void }) {
  const patch = patcher(setInput);
  const { basic, self, expense, investment } = input;
  // 投資対象を削除したら、すべての配分からその割合も取り除く
  const drop = (w: Weights, id: string) => Object.fromEntries(Object.entries(w).filter(([k]) => k !== id));
  const removeAsset = (id: string) =>
    patch("investment", {
      assets: investment.assets.filter((a) => a.id !== id),
      currentWeights: drop(investment.currentWeights, id),
      contributionWeights: drop(investment.contributionWeights, id),
      rebalances: investment.rebalances.map((rb) => ({ ...rb, allocations: drop(rb.allocations, id) })),
    });
  const halfYear = Math.round(livingCostOf(expense) / 2);

  return (
    <div className="space-y-4">
      <Card icon={PiggyBank} title="いまの資産">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="現預金" unit="万円" step={10} value={basic.cashAssets}
            onChange={(v) => patch("basic", { cashAssets: v })} />
          <NumberField label="運用中の資産" unit="万円" step={10} value={basic.investedAssets}
            onChange={(v) => patch("basic", { investedAssets: v })} hint="下の「① 現在のポートフォリオ」で運用" />
        </div>
        <p className="text-xs text-slate-500">
          現在の総資産: <span className="font-semibold text-slate-700">{(basic.cashAssets + basic.investedAssets).toLocaleString()}万円</span>
        </p>
      </Card>

      <Card icon={Layers} title="運用の配分"
        note="投資対象（名称・想定リターン・想定リスク）を自由に設定し、①②に割合を入力します。">
        <SubCard title="投資対象（アセット）" note="ここで追加した対象が、①②・リバランスの割合入力に自動で並びます。">
          <AssetEditor assets={investment.assets} onChange={(a) => patch("investment", { assets: a })} onRemove={removeAsset} />
        </SubCard>
        <SubCard title="① 現在のポートフォリオ" note={`運用中の資産 ${basic.investedAssets.toLocaleString()}万円の配分`}>
          <WeightEditor assets={investment.assets} weights={investment.currentWeights}
            onChange={(w) => patch("investment", { currentWeights: w })} />
        </SubCard>
        <SubCard title="② これからの積立投資" note="毎月の積立をこの配分で購入し、①とは別に複利運用します。">
          <WeightEditor assets={investment.assets} weights={investment.contributionWeights}
            onChange={(w) => patch("investment", { contributionWeights: w })} />
        </SubCard>
      </Card>

      <Card icon={CalendarClock} title="毎月の積立額">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="毎月の積立額" unit="万円/月" step={0.5} min={0} value={round2(investment.baseContribution / 12)}
            onChange={(v) => patch("investment", { baseContribution: Math.max(0, v) * 12 })}
            hint={`年 ${yen(investment.baseContribution)}円`} />
        </div>
        <div className="text-xs font-medium text-slate-500">年齢区間ごとの積立額（下にあるほど優先）</div>
        {investment.rules.map((ru) => {
          const update = (v: Partial<typeof ru>) =>
            patch("investment", { rules: investment.rules.map((x) => (x.id === ru.id ? { ...x, ...v } : x)) });
          return (
            <ItemCard key={ru.id}
              onRemove={() => patch("investment", { rules: investment.rules.filter((x) => x.id !== ru.id) })}>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="開始" unit="歳" value={ru.fromAge} onChange={(v) => update({ fromAge: v })} />
                <NumberField label="終了" unit="歳" value={ru.toAge} onChange={(v) => update({ toAge: v })} />
                <NumberField label="毎月の積立額" unit="万円" step={0.5} min={0} value={round2(ru.amount / 12)}
                  onChange={(v) => update({ amount: Math.max(0, v) * 12 })} />
              </div>
            </ItemCard>
          );
        })}
        <AddButton
          onClick={() =>
            patch("investment", {
              rules: [...investment.rules, { id: uid(), fromAge: self.currentAge + 10, toAge: self.currentAge + 20, amount: investment.baseContribution }],
            })
          }>
          <Plus size={16} /> 区間を追加
        </AddButton>
      </Card>

      <Card icon={ShieldCheck} title="防衛ライン（現預金の最低維持ライン）"
        note="積立後の現預金がこの額を下回らない範囲で積み立てます。赤字の年でも、この額を超える貯金があればその範囲で積立を続けます。">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="最低維持ライン" unit="万円" step={50} min={0} value={investment.minCashReserve}
            onChange={(v) => patch("investment", { minCashReserve: Math.max(0, v) })}
            hint={`目安: 生活費の半年分 ≒ ${halfYear.toLocaleString()}万円`} />
        </div>
      </Card>

      <Card icon={Shuffle} title="年齢に応じたリバランス（ターゲット・イヤー）" tone="violet"
        note="実行年齢の期首に①②の運用資産をすべて合算して新しい割合で再配分し、以後の積立もこの割合で行います（非課税スイッチングとして計算）。">
        {[...(investment.rebalances ?? [])].sort((a, b) => a.targetAge - b.targetAge).map((rb) => {
          const update = (v: Partial<RebalanceEvent>) =>
            patch("investment", { rebalances: investment.rebalances.map((x) => (x.id === rb.id ? { ...x, ...v } : x)) });
          const stats = portfolioStats(investment.assets, rb.allocations);
          return (
            <div key={rb.id} className="space-y-3 rounded-lg border border-violet-200 bg-white p-3">
              <div className="flex items-end gap-2">
                <div className="w-28">
                  <NumberField label="実行年齢" unit="歳" min={self.currentAge} value={rb.targetAge}
                    onChange={(v) => update({ targetAge: v })} />
                </div>
                <div className="flex-1 pb-2 text-[11px] text-violet-700">
                  {rb.targetAge}歳以降: 期待リターン {stats.expectedReturn.toFixed(1)}% ／ σ{stats.risk.toFixed(1)}%
                  {rb.targetAge <= self.currentAge && <span className="block text-amber-600">現在の年齢以下のため、初年度に実行します</span>}
                </div>
                <button type="button"
                  onClick={() => patch("investment", { rebalances: investment.rebalances.filter((x) => x.id !== rb.id) })}
                  className="mb-1 rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                  削除
                </button>
              </div>
              <WeightEditor assets={investment.assets} weights={rb.allocations}
                onChange={(w) => update({ allocations: w })} />
            </div>
          );
        })}
        <AddButton
          onClick={() => {
            const last = [...(investment.rebalances ?? [])].sort((a, b) => a.targetAge - b.targetAge).pop();
            patch("investment", {
              rebalances: [
                ...(investment.rebalances ?? []),
                {
                  id: uid(),
                  targetAge: last ? last.targetAge + 5 : Math.max(self.currentAge + 1, 55),
                  // 直前の配分（なければ積立の配分）を複製して編集してもらう
                  allocations: { ...(last?.allocations ?? investment.contributionWeights) },
                },
              ],
            });
          }}>
          <Plus size={16} /> リバランスを追加
        </AddButton>
      </Card>

      <button type="button" onClick={onRun}
        className="group flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-6 text-white shadow-xl shadow-indigo-200 transition-transform hover:scale-[1.01] active:scale-[0.99]">
        <span className="flex items-center gap-3 text-2xl font-extrabold tracking-wide sm:text-3xl">
          <Play size={30} className="fill-white" /> シミュレーションを実行する
        </span>
        <span className="text-sm text-white/80">あなたの資産が何歳まで持つか、{MC_TRIALS.toLocaleString()}通りの未来で計算します</span>
      </button>
    </div>
  );
}
