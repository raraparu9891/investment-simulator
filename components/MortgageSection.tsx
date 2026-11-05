"use client";

import { Home, Plus } from "lucide-react";
import { uid } from "@/lib/defaults";
import { loanSchedule } from "@/lib/loan";
import type { MortgageSettings } from "@/lib/types";
import { AddButton, ItemCard, NumberField, Section, SubHeading, Toggle } from "./ui";

const yen = (v: number) => `${Math.round(v).toLocaleString()}万`;

export default function MortgageSection({ mortgage, currentAge, onChange }: {
  mortgage: MortgageSettings;
  currentAge: number;
  onChange: (v: Partial<MortgageSettings>) => void;
}) {
  const schedule = loanSchedule(mortgage, Math.max(1, Math.ceil(mortgage.years)));
  const total = schedule.reduce((s, y) => s + y.payment, 0);
  // 返済額が変わる年（初年度＋金利変更年）を要約表示
  const steps = schedule
    .map((y, t) => ({ ...y, t }))
    .filter((y) => y.payment > 0 && (y.t === 0 || y.rateChanged));

  const updateChange = (id: string, v: Partial<MortgageSettings["rateChanges"][number]>) =>
    onChange({ rateChanges: mortgage.rateChanges.map((x) => (x.id === id ? { ...x, ...v } : x)) });

  return (
    <Section icon={Home} title="住宅ローン" fixed
      badge={
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {mortgage.enabled ? `年${yen(schedule[0]?.payment ?? 0)}` : "なし"}
        </span>
      }>
      <Toggle label="住宅ローンを支出に含める" checked={mortgage.enabled} onChange={(v) => onChange({ enabled: v })} />
      {mortgage.enabled && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberField label="借入開始年齢" unit="歳" min={18} value={mortgage.startAge}
              onChange={(v) => onChange({ startAge: v })} />
            <NumberField label={mortgage.startAge > currentAge ? "借入総額" : "現在の残高"} unit="万円" step={100} min={0} value={mortgage.balance}
              onChange={(v) => onChange({ balance: v })} />
            <NumberField label={mortgage.startAge > currentAge ? "返済期間" : "残り期間"} unit="年" min={1} max={50} value={mortgage.years}
              onChange={(v) => onChange({ years: v })} />
            <NumberField label="当初の金利" unit="%" step={0.05} min={0} value={mortgage.rate}
              onChange={(v) => onChange({ rate: v })} />
          </div>

          <p className="-mt-2 text-[11px] text-slate-400">
            {mortgage.startAge > currentAge
              ? `${mortgage.startAge}歳から返済を開始します。`
              : "現在返済中のローンとして、今年から残り期間で返済します（借入開始年齢が現在の年齢以下の場合）。"}
          </p>
          <SubHeading>変動金利シナリオ</SubHeading>
          {[...mortgage.rateChanges].sort((a, b) => a.afterYears - b.afterYears).map((c) => (
            <ItemCard key={c.id} onRemove={() => onChange({ rateChanges: mortgage.rateChanges.filter((x) => x.id !== c.id) })}>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <NumberField label={`返済開始から何年後（本人 ${Math.max(currentAge, mortgage.startAge) + c.afterYears}歳）`} unit="年後" min={1} value={c.afterYears}
                  onChange={(v) => updateChange(c.id, { afterYears: Math.max(1, v) })} />
                <NumberField label="変更後の金利" unit="%" step={0.05} min={0} value={c.rate}
                  onChange={(v) => updateChange(c.id, { rate: v })} />
              </div>
            </ItemCard>
          ))}
          <AddButton
            onClick={() => {
              const last = [...mortgage.rateChanges].sort((a, b) => a.afterYears - b.afterYears).pop();
              onChange({
                rateChanges: [
                  ...mortgage.rateChanges,
                  { id: uid(), afterYears: (last?.afterYears ?? 0) + 5, rate: (last?.rate ?? mortgage.rate) + 0.5 },
                ],
              });
            }}>
            <Plus size={16} /> 金利の変化を追加
          </AddButton>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <ul className="space-y-0.5">
              {steps.map((y) => (
                <li key={y.t} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-slate-500">{y.t === 0 ? "返済開始" : `${y.t}年後〜`}（金利 {y.rate}%）</span>
                  <span>年 {yen(y.payment)}（月 {(y.payment / 12).toFixed(1)}万）</span>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
              <span>総返済額</span>
              <span className="tabular-nums">{yen(total)}（利息 {yen(Math.max(0, total - mortgage.balance))}）</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            元利均等・毎月返済の簡易計算。金利が変わる年に、その時点の残高と残り期間で返済額を再計算します（5年ルール・125%ルールは考慮しません）。ローン返済額にはインフレ率を適用しません。
          </p>
        </>
      )}
    </Section>
  );
}
