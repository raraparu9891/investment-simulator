"use client";

import { Plus, Trash2, Wallet } from "lucide-react";
import { uid } from "@/lib/defaults";
import { LIVING_GROUPS, PRESET_LABEL, PRESET_ORDER, categoryOf, householdFactor, livingCostOf, presetAmount } from "@/lib/living";
import type { LivingItem, LivingPreset } from "@/lib/types";
import { AddButton, NumberField, TextField } from "../ui";
import { Card, patcher, round1, round2, yen, type StepProps } from "./shared";

const PRESET_TONE: Record<LivingPreset, string> = {
  luxury: "border-amber-300 bg-amber-500 text-white",
  average: "border-indigo-300 bg-indigo-600 text-white",
  saving: "border-emerald-300 bg-emerald-600 text-white",
};

function LivingRow({ item, factor, onChange, onRemove }: {
  item: LivingItem;
  factor: number;
  onChange: (v: Partial<LivingItem>) => void;
  onRemove: () => void;
}) {
  const cat = categoryOf(item.key);
  return (
    <div className="grid gap-2 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[minmax(8rem,1fr)_auto_14rem] sm:items-end">
      <div className="min-w-0">
        {cat ? (
          <>
            <div className="text-sm font-semibold text-slate-700">{item.label}</div>
            <div className="text-[11px] text-slate-400">{cat.hint}</div>
          </>
        ) : (
          <TextField label="項目名" value={item.label} onChange={(v) => onChange({ label: v })} />
        )}
      </div>
      <div className="flex items-center gap-1">
        {cat ? (
          PRESET_ORDER.map((p) => {
            const on = item.preset === p;
            const amount = presetAmount(cat.base, p, factor);
            return (
              <button key={p} type="button" onClick={() => onChange({ monthly: amount, preset: p })}
                title={`月${amount}万円`}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  on ? PRESET_TONE[p] : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}>
                {PRESET_LABEL[p]}
                <span className={`ml-1 tabular-nums ${on ? "text-white/80" : "text-slate-400"}`}>{amount}</span>
              </button>
            );
          })
        ) : (
          <button type="button" onClick={onRemove} aria-label="削除"
            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
            <Trash2 size={16} />
          </button>
        )}
        {cat && item.preset === null && (
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">手入力</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* 月額・年額のどちらで入力してもよい。手入力するとプリセットのハイライトが外れる */}
        <NumberField label="月額" unit="万円" step={0.1} min={0} value={round2(item.monthly)}
          onChange={(v) => onChange({ monthly: Math.max(0, v), preset: null })} />
        <NumberField label="年額" unit="万円" step={1} min={0} value={round1(item.monthly * 12)}
          onChange={(v) => onChange({ monthly: Math.max(0, v) / 12, preset: null })} />
      </div>
    </div>
  );
}

export default function StepLiving({ input, setInput }: StepProps) {
  const patch = patcher(setInput);
  const { expense } = input;
  const annual = livingCostOf(expense);
  const factor = householdFactor(input);
  const household = ["本人", input.spouse.enabled && "配偶者", input.children.length > 0 && `子供${input.children.length}人`]
    .filter(Boolean)
    .join("＋");
  const sections = [
    ...LIVING_GROUPS.map((g) => ({ ...g, items: expense.items.filter((x) => categoryOf(x.key)?.group === g.key) })),
    { label: "追加した項目", note: "自由に追加した支出", items: expense.items.filter((x) => !categoryOf(x.key)) },
  ];
  const setItems = (fn: (items: LivingItem[]) => LivingItem[]) =>
    setInput((p) => ({ ...p, expense: { ...p.expense, items: fn(p.expense.items) } }));

  const applyAll = (preset: LivingPreset) =>
    setItems((items) =>
      items.map((x) => {
        const cat = categoryOf(x.key);
        return cat ? { ...x, monthly: presetAmount(cat.base, preset, factor), preset } : x;
      }),
    );

  return (
    <div className="space-y-4">
      <Card icon={Wallet} title="毎月の基本生活費"
        note="項目ごとに「贅沢・平均・節約」を押すと相場額（月額、万円）が入ります。金額は直接書き換えてもOKです。住宅ローン・車・教育費は次以降のステップで入力します。">
        <p className="text-xs text-slate-500">
          現在の世帯構成（{household}、係数 {round1(factor)}）に基づく目安額を表示しています。
          ステップ1で家族構成を変えると、手入力していない項目の金額も自動で変わります。
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5">
          <span className="text-xs font-medium text-slate-500">全項目をまとめて：</span>
          {PRESET_ORDER.map((p) => (
            <button key={p} type="button" onClick={() => applyAll(p)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
              {PRESET_LABEL[p]}
            </button>
          ))}
        </div>
        {sections.map((sec) => sec.items.length > 0 && (
          <div key={sec.label}>
            <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1">
              <h4 className="text-sm font-bold text-slate-800">{sec.label}</h4>
              <span className="text-[11px] text-slate-400">{sec.note}</span>
              <span className="ml-auto text-xs tabular-nums text-slate-500">
                月 {round1(sec.items.reduce((s, x) => s + x.monthly, 0))}万円
              </span>
            </div>
            {sec.items.map((item) => (
              <LivingRow key={item.id} item={item} factor={factor}
                onChange={(v) => setItems((items) => items.map((x) => (x.id === item.id ? { ...x, ...v } : x)))}
                onRemove={() => setItems((items) => items.filter((x) => x.id !== item.id))} />
            ))}
          </div>
        ))}
        <AddButton onClick={() => setItems((items) => [...items, { id: uid(), key: "custom", label: "その他の項目", monthly: 1, preset: null }])}>
          <Plus size={16} /> 項目を追加
        </AddButton>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg">
        <span className="text-xs text-slate-300">基本生活費の合計</span>
        <span className="text-lg font-bold tabular-nums">月 {round1(annual / 12)}万円</span>
        <span className="text-sm tabular-nums text-slate-300">年 {yen(annual)}円</span>
      </div>

      <Card title="物価上昇（インフレ率）" note="生活費・教育費は毎年この率で増えていきます。">
        <div className="w-40">
          <NumberField label="インフレ率" unit="%/年" step={0.1} value={expense.inflationRate}
            onChange={(v) => patch("expense", { inflationRate: v })} />
        </div>
      </Card>
    </div>
  );
}
