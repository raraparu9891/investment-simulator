"use client";

import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Baby, ChevronDown, HeartHandshake, LineChart, User } from "lucide-react";
import { usePreviewData, type PreviewRow, type PreviewSummary } from "@/hooks/usePreviewData";
import { householdFactor } from "@/lib/living";
import type { EventKind, SimulationInput } from "@/lib/types";
import { formatMan } from "../ui";
import { round1 } from "./shared";

type Series = { key: keyof PreviewRow; name: string; color: string };

// 系列色（結果画面の支出グラフと同じ色を使う）
const INCOME_SERIES: Series[] = [
  { key: "selfWork", name: "本人の手取り", color: "#2a78d6" },
  { key: "spouseWork", name: "配偶者の手取り", color: "#38bdf8" },
  { key: "pension", name: "年金", color: "#1baf7a" },
  { key: "severance", name: "退職金", color: "#eda100" },
];
const EXPENSE_SERIES: Series[] = [
  { key: "livingCost", name: "基本生活費", color: "#6250d6" },
  { key: "loanPayment", name: "住宅ローン", color: "#64748b" },
  { key: "carCost", name: "自動車", color: "#0e9f9a" },
  { key: "educationCost", name: "教育費", color: "#e87ba4" },
  { key: "spotCost", name: "スポット支出", color: "#eda100" },
];
const INCOME_EVENTS: EventKind[] = ["work", "retire", "pension"];
const EXPENSE_EVENTS: EventKind[] = ["school", "loan", "car", "spot"];

const axisTick = { fontSize: 11, fill: "#64748b" };
const yTick = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}億` : `${v.toLocaleString()}`);
// 入力のたびに積み上げが伸び縮みして見えるよう、アニメーションを有効にする
const ANIM = { isAnimationActive: true, animationDuration: 600, animationEasing: "ease-out" } as const;

function PreviewTooltip({ active, payload, series, events, total }: TooltipProps<number, string> & {
  series: Series[];
  events: EventKind[];
  total: { key: keyof PreviewRow; label: string };
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as PreviewRow;
  const evs = r.events.filter((e) => events.includes(e.kind));
  return (
    <div className="min-w-48 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="mb-1.5 font-semibold text-slate-800">
        {r.age}歳
        {r.spouseAge !== null && <span className="ml-1 font-normal text-slate-400">（配偶者 {r.spouseAge}歳）</span>}
      </div>
      {series.filter((s) => (r[s.key] as number) > 0).map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-3 rounded-sm" style={{ background: s.color }} /> {s.name}
          </span>
          <span className="tabular-nums text-slate-800">{formatMan(r[s.key] as number)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-slate-100 pt-1 font-semibold text-slate-800">
        <span>{total.label}</span>
        <span className="tabular-nums">{formatMan(r[total.key] as number)}</span>
      </div>
      {evs.length > 0 && (
        <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5 text-indigo-600">
          {evs.map((e) => <div key={e.text}>{e.text}</div>)}
        </div>
      )}
    </div>
  );
}

function StackedChart({ rows, series, events, total, retirementAge }: {
  rows: PreviewRow[];
  series: Series[];
  events: EventKind[];
  total: { key: keyof PreviewRow; label: string };
  retirementAge: number;
}) {
  // 値がずっと 0 の系列は凡例ごと出さない
  const visible = series.filter((s) => rows.some((r) => (r[s.key] as number) > 0));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="12%">
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="age" tick={axisTick} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} unit="歳" minTickGap={16} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yTick} width={48} />
          <Tooltip content={<PreviewTooltip series={visible} events={events} total={total} />} cursor={{ fill: "#f1f5f9" }} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine x={retirementAge} stroke="#64748b" strokeDasharray="6 4" />
          {visible.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} stroke="#fff" strokeWidth={0.5}
              radius={i === visible.length - 1 ? [3, 3, 0, 0] : undefined} {...ANIM} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NetChart({ rows, retirementAge }: { rows: PreviewRow[]; retirementAge: number }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="12%">
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="age" tick={axisTick} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} unit="歳" minTickGap={16} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yTick} width={48} />
          <Tooltip formatter={(v: number) => [formatMan(v), "年間収支"]} labelFormatter={(a) => `${a}歳`} cursor={{ fill: "#f1f5f9" }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <ReferenceLine x={retirementAge} stroke="#64748b" strokeDasharray="6 4" />
          <Bar dataKey="netCashflow" name="年間収支" {...ANIM}>
            {rows.map((r) => <Cell key={r.age} fill={r.netCashflow >= 0 ? "#1baf7a" : "#ef4444"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function FamilySummary({ input }: { input: SimulationInput }) {
  const { self, spouse, children, basic } = input;
  const members = 1 + (spouse.enabled ? 1 : 0) + children.length;
  const Member = ({ icon: Icon, name, age }: { icon: typeof User; name: string; age: number }) => (
    <li className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
      <Icon size={15} className="text-indigo-500" />
      <span className="flex-1 text-slate-700">{name}</span>
      <span className="tabular-nums text-slate-500">{age < 0 ? `${-age}年後に誕生` : `${age}歳`}</span>
    </li>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="世帯人数" value={`${members}人`} />
        <Stat label="計算期間" value={`${Math.max(0, basic.endAge - self.currentAge)}年`} />
        <Stat label="生活費の係数" value={round1(householdFactor(input))} />
      </div>
      <ul className="space-y-1.5">
        <Member icon={User} name="あなた（本人）" age={self.currentAge} />
        {spouse.enabled && <Member icon={HeartHandshake} name="配偶者" age={spouse.currentAge} />}
        {children.map((c) => <Member key={c.id} icon={Baby} name={c.name} age={c.currentAge} />)}
      </ul>
      <p className="text-xs text-slate-400">
        {self.currentAge}歳から{basic.endAge}歳までを1年ごとに計算します。次のステップから、収入・支出の推移がここにグラフで表示されます。
      </p>
    </div>
  );
}

function Totals({ summary, kind }: { summary: PreviewSummary; kind: "income" | "expense" | "net" }) {
  const net = summary.lifetimeIncome - summary.lifetimeExpense;
  const income = <Stat label="生涯の収入（手取り）" value={formatMan(summary.lifetimeIncome)} />;
  const expense = <Stat label="生涯の支出" value={formatMan(summary.lifetimeExpense)} />;
  const middle = {
    income: <Stat label="年平均の収入" value={formatMan(summary.lifetimeIncome / Math.max(1, summary.years))} />,
    expense: summary.peakExpense && (
      <Stat label={`支出のピーク（${summary.peakExpense.age}歳）`} value={formatMan(summary.peakExpense.amount)} />
    ),
    net: expense,
  }[kind];
  return (
    <div className="grid grid-cols-3 gap-2">
      {kind === "expense" ? expense : income}
      {middle}
      <Stat label="収支の累計（運用なし）" value={formatMan(net)} tone={net >= 0 ? "good" : "bad"} />
    </div>
  );
}

const VIEW: Record<number, { title: string; note: string }> = {
  0: { title: "家族のサマリー", note: "入力した家族構成の確認です。" },
  1: { title: "収入の推移", note: "世帯の手取り収入（年金・退職金を含む）の積み上げです。" },
  2: { title: "支出の推移", note: "支出の内訳の積み上げです。生活費はインフレ率で毎年増えます。" },
  5: { title: "年間の収支", note: "収入 − 支出（運用前）。赤い年は貯蓄や運用資産の取り崩しが必要です。" },
};
const viewOf = (step: number) => VIEW[step >= 2 && step <= 4 ? 2 : step];

/** ウィザード横のプレビュー。PC では常に表示、スマホでは折りたためる */
export default function PreviewPanel({ input, step }: { input: SimulationInput; step: number }) {
  const [open, setOpen] = useState(false);
  const { rows, summary } = usePreviewData(input);
  const view = viewOf(step);
  const retirementAge = input.self.retirementAge;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left lg:pointer-events-none">
        <LineChart size={18} className="text-indigo-600" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-800">プレビュー：{view.title}</span>
          <span className="block text-[11px] text-slate-400">{view.note}</span>
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform lg:hidden ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`${open ? "block" : "hidden"} space-y-3 border-t border-slate-100 p-4 lg:block`}>
        {step === 0 && <FamilySummary input={input} />}
        {step === 1 && (
          <>
            <StackedChart rows={rows} series={INCOME_SERIES} events={INCOME_EVENTS}
              total={{ key: "totalIncome", label: "世帯収入" }} retirementAge={retirementAge} />
            <Totals summary={summary} kind="income" />
          </>
        )}
        {step >= 2 && step <= 4 && (
          <>
            <StackedChart rows={rows} series={EXPENSE_SERIES} events={EXPENSE_EVENTS}
              total={{ key: "totalExpense", label: "支出合計" }} retirementAge={retirementAge} />
            <Totals summary={summary} kind="expense" />
          </>
        )}
        {step === 5 && (
          <>
            <NetChart rows={rows} retirementAge={retirementAge} />
            <Totals summary={summary} kind="net" />
            {summary.deficitYears > 0 && (
              <p className="text-xs text-slate-500">
                収支がマイナスになる年が {summary.deficitYears}年 あります。資産運用でどこまで補えるかを「結果を見る」で確認しましょう。
              </p>
            )}
          </>
        )}
        {step > 0 && <p className="text-[11px] text-slate-400">破線は本人のリタイア年齢（{retirementAge}歳）です。単位: 万円</p>}
      </div>
    </section>
  );
}
