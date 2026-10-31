"use client";

import { useState, type ReactNode } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Dices,
  Flag,
  GraduationCap,
  HandCoins,
  Landmark,
  Layers,
  LogOut,
  Repeat,
  ShoppingBag,
  Table2,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { EventKind, SimulationSummary, YearResult } from "@/lib/types";
import { formatMan } from "./ui";

// 系列色（dataviz リファレンスパレットの固定順スロット）
const C = {
  fixed: "#eb6834", // 固定リターン
  mcMedian: "#2a78d6", // モンテカルロ中央値
  mcPlus: "#38bdf8", // +2σ（楽観）
  mcMinus: "#ef4444", // −2σ（悲観）
  invested: "#2a78d6",
  cash: "#eb6834",
  income: "#1baf7a",
  living: "#6250d6",
  education: "#e87ba4",
  spot: "#eda100",
};

const SYNC = "lifeplan";
const axisTick = { fontSize: 11, fill: "#64748b" };
const yTick = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}億` : `${v.toLocaleString()}`);

const EVENT_ICON: Record<EventKind, { icon: LucideIcon; cls: string }> = {
  retire: { icon: LogOut, cls: "bg-slate-100 text-slate-600" },
  work: { icon: Repeat, cls: "bg-sky-50 text-sky-700" },
  pension: { icon: Landmark, cls: "bg-emerald-50 text-emerald-700" },
  school: { icon: GraduationCap, cls: "bg-pink-50 text-pink-700" },
  spot: { icon: ShoppingBag, cls: "bg-amber-50 text-amber-700" },
};

type AssetMode = "total" | "breakdown";
type ChartTab = "basic" | "mc";

// ---------------------------------------------------------------------------
// ツールチップ
// ---------------------------------------------------------------------------

function TooltipShell({ row, children }: { row: YearResult; children: ReactNode }) {
  return (
    <div className="min-w-52 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="mb-1.5 font-semibold text-slate-800">
        {row.age}歳
        {row.spouseAge !== null && <span className="ml-1 font-normal text-slate-400">（配偶者 {row.spouseAge}歳）</span>}
      </div>
      {children}
      {row.events.length > 0 && (
        <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5 text-indigo-600">
          {row.events.map((e) => (
            <div key={e.text}>{e.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function TipRow({ color, label, value, bold, dashed }: { color?: string; label: string; value: number; bold?: boolean; dashed?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-0.5 ${bold ? "font-semibold text-slate-800" : ""}`}>
      <span className="flex items-center gap-1.5 text-slate-500">
        {color && (
          <span className="h-0.5 w-3" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)` : color, height: dashed ? 2 : 8, borderRadius: 2 }} />
        )}
        {label}
      </span>
      <span className={`tabular-nums ${value < 0 ? "text-rose-600" : "text-slate-800"}`}>{formatMan(value)}</span>
    </div>
  );
}

function AssetTooltip({ active, payload, mode }: TooltipProps<number, string> & { mode: AssetMode }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as YearResult;
  return (
    <TooltipShell row={r}>
      {mode === "total" ? (
        <TipRow color={C.fixed} label="総資産（固定リターン）" value={r.fixedReturnAssets} bold />
      ) : (
        <>
          <TipRow color={C.invested} label="運用資産" value={r.invested} />
          <TipRow color={C.cash} label="現預金" value={r.cash} />
          <TipRow label="総資産" value={r.totalAssets} bold />
        </>
      )}
    </TooltipShell>
  );
}

function McTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as YearResult;
  return (
    <TooltipShell row={r}>
      <TipRow color={C.mcPlus} dashed label="+2σ（上位 約2.3%）" value={r.mcPlus2Sigma} />
      <TipRow color={C.mcMedian} label="中央値" value={r.mcMedian} bold />
      <TipRow color={C.mcMinus} dashed label="−2σ（下位 約2.3%）" value={r.mcMinus2Sigma} />
    </TooltipShell>
  );
}

function ChartTabs({ value, onChange }: { value: ChartTab; onChange: (v: ChartTab) => void }) {
  const items: [ChartTab, LucideIcon, string, string][] = [
    ["basic", TrendingUp, "基本シミュレーション", "期待リターン固定"],
    ["mc", Dices, "モンテカルロ（リスク考慮）", "±2σ の幅"],
  ];
  return (
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {items.map(([key, Icon, label, sub]) => {
        const on = value === key;
        return (
          <button key={key} type="button" role="tab" aria-selected={on} onClick={() => onChange(key)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
              on ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200" : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
            }`}>
            <Icon size={16} className={on ? "text-indigo-600" : ""} />
            <span>{label}</span>
            <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline ${on ? "bg-indigo-50 text-indigo-600" : "bg-slate-200/70 text-slate-500"}`}>
              {sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CashflowTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as YearResult;
  return (
    <TooltipShell row={r}>
      <TipRow color={C.income} label="世帯収入（手取り）" value={r.totalIncome} />
      <TipRow color={C.living} label="生活費" value={r.livingCost} />
      {r.educationCost > 0 && <TipRow color={C.education} label="教育費" value={r.educationCost} />}
      {r.spotCost > 0 && <TipRow color={C.spot} label="スポット支出" value={r.spotCost} />}
      <div className="mt-1 border-t border-slate-100 pt-1">
        <TipRow label="年間収支" value={r.netCashflow} bold />
      </div>
    </TooltipShell>
  );
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

function Kpi({ label, value, sub, tone = "default", icon: Icon }: {
  label: string; value: string; sub?: string; tone?: "default" | "bad" | "good" | "warn"; icon: LucideIcon;
}) {
  const toneCls = {
    default: "text-slate-900",
    bad: "text-rose-600",
    good: "text-emerald-600",
    warn: "text-amber-600",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon size={14} /> {label}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, items }: {
  value: T; onChange: (v: T) => void; items: [T, LucideIcon, string][];
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {items.map(([key, Icon, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}>
          <Icon size={16} /> {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------

export default function ResultPanel({
  rows,
  summary,
  retirementAge,
  onReroll,
}: {
  rows: YearResult[];
  summary: SimulationSummary;
  retirementAge: number;
  onReroll: () => void;
}) {
  const [tab, setTab] = useState<"chart" | "table">("chart");
  const [chartTab, setChartTab] = useState<ChartTab>("basic");
  const [assetMode, setAssetMode] = useState<AssetMode>("total");
  const spotAges = rows.filter((r) => r.spotCost > 0).map((r) => r.age);
  // 毎年の繰り返し支出などで多すぎる場合は目印線を省く
  const eventAges = spotAges.length <= 12 ? spotAges : [];
  const lastAge = rows[rows.length - 1]?.age ?? "-";
  const success = summary.successRate * 100;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={Landmark} label="退職直前の総資産" value={formatMan(summary.assetsAtRetirement)}
          sub={`${retirementAge - 1}歳時点・固定リターン`} />
        <Kpi icon={Flag} label={`${lastAge}歳時点の総資産（中央値）`} value={formatMan(summary.finalMedian)}
          sub={`−2σ ${formatMan(summary.finalMinus2Sigma)} 〜 +2σ ${formatMan(summary.finalPlus2Sigma)}`}
          tone={summary.finalMedian < 0 ? "bad" : "default"} />
        <Kpi icon={TrendingUp} label="ポートフォリオ" value={`${summary.expectedReturn.toFixed(1)}% / σ${summary.portfolioRisk.toFixed(1)}%`}
          sub="期待リターン / リスク（年率）" />
        <Kpi icon={success >= 80 ? CheckCircle2 : AlertTriangle} label="資産が最後まで持つ確率"
          value={`${success.toFixed(0)}%`}
          tone={success >= 80 ? "good" : success >= 50 ? "warn" : "bad"}
          sub={summary.depletionAge !== null ? `固定リターンでは ${summary.depletionAge}歳で枯渇` : `${summary.trials}回の試行`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={tab} onChange={setTab}
          items={[["chart", BarChart3, "グラフ"], ["table", Table2, "データテーブル"]]} />
        <button type="button" onClick={onReroll}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50">
          <Dices size={16} /> 乱数を引き直す
        </button>
      </div>

      {tab === "chart" ? (
        <div className="space-y-4">
          <ChartTabs value={chartTab} onChange={setChartTab} />
          {chartTab === "basic" ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">資産残高の推移（固定リターン）</h3>
                    <p className="text-xs text-slate-400">
                      期待リターン {summary.expectedReturn.toFixed(1)}% が毎年続くと仮定した複利計算（万円）。破線は退職年齢。
                    </p>
                  </div>
                  <Segmented value={assetMode} onChange={setAssetMode}
                    items={[["total", TrendingUp, "総資産"], ["breakdown", Layers, "資産内訳"]]} />
                </div>
                {/* ResponsiveContainer が潰れないよう親に明示的な高さを与える */}
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rows} syncId={SYNC} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="age" tick={axisTick} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} unit="歳" minTickGap={16} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yTick} width={56} />
                      <Tooltip content={<AssetTooltip mode={assetMode} />} cursor={{ stroke: "#94a3b8", strokeWidth: 1 }} />
                      <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={0} stroke="#94a3b8" />
                      <ReferenceLine x={retirementAge} stroke="#64748b" strokeDasharray="6 4"
                        label={{ value: "退職", position: "insideTopRight", fontSize: 11, fill: "#475569" }} />
                      {eventAges.map((a) => (
                        <ReferenceLine key={a} x={a} stroke="#cbd5e1" strokeDasharray="2 3" />
                      ))}
                      {assetMode === "total" ? (
                        <Line dataKey="fixedReturnAssets" name="総資産（固定リターン）" type="monotone"
                          stroke={C.fixed} strokeWidth={3} dot={false} isAnimationActive={false}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                      ) : (
                        <>
                          <Area type="monotone" dataKey="invested" name="運用資産" stackId="a" stroke={C.invested} strokeWidth={2}
                            fill={C.invested} fillOpacity={0.25} legendType="square" isAnimationActive={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
                          <Area type="monotone" dataKey="cash" name="現預金" stackId="a" stroke={C.cash} strokeWidth={2}
                            fill={C.cash} fillOpacity={0.2} legendType="square" isAnimationActive={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-1 font-semibold text-slate-800">年間の収入と支出</h3>
                <p className="mb-3 text-xs text-slate-400">左: 世帯の手取り収入（年金含む） ／ 右: 支出の内訳（積み上げ）。上のグラフとホバーが連動します。</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rows} syncId={SYNC} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={2} barCategoryGap="15%">
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="age" tick={axisTick} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} unit="歳" minTickGap={16} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yTick} width={56} />
                      <Tooltip content={<CashflowTooltip />} cursor={{ fill: "#f1f5f9" }} />
                      <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine x={retirementAge} stroke="#64748b" strokeDasharray="6 4" />
                      <Bar dataKey="totalIncome" name="世帯収入" fill={C.income} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="livingCost" name="生活費" stackId="exp" fill={C.living} stroke="#fff" strokeWidth={0.5} />
                      <Bar dataKey="educationCost" name="教育費" stackId="exp" fill={C.education} stroke="#fff" strokeWidth={0.5} />
                      <Bar dataKey="spotCost" name="スポット支出" stackId="exp" fill={C.spot} stroke="#fff" strokeWidth={0.5} radius={[3, 3, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-800">資産残高の推移（モンテカルロ {summary.trials.toLocaleString()}回）</h3>
                <p className="text-xs text-slate-400">
                  リスク σ{summary.portfolioRisk.toFixed(1)}% で毎年のリターンをランダムに発生。
                  実線＝中央値、破線＝+2σ（上位 約2.3%）／−2σ（下位 約2.3%）。2本の破線の間に約95%の結果が収まります。
                </p>
              </div>
              <div className="h-[440px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {/* 3系列とも数値の独立 dataKey を持つ単純な Line で描く（Area の [min, max] は使わない） */}
                  <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="age" tick={axisTick} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} unit="歳" minTickGap={16} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yTick} width={56} />
                    <Tooltip content={<McTooltip />} cursor={{ stroke: "#94a3b8", strokeWidth: 1 }} />
                    <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <ReferenceLine x={retirementAge} stroke="#64748b" strokeDasharray="6 4"
                      label={{ value: "退職", position: "insideTopRight", fontSize: 11, fill: "#475569" }} />
                    <Line dataKey="mcPlus2Sigma" name="+2σ（上位 約2.3%）" type="monotone" stroke={C.mcPlus}
                      strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}
                      activeDot={{ r: 3.5, stroke: "#fff", strokeWidth: 2 }} />
                    <Line dataKey="mcMedian" name="中央値" type="monotone" stroke={C.mcMedian}
                      strokeWidth={2} dot={false} isAnimationActive={false}
                      activeDot={{ r: 4.5, stroke: "#fff", strokeWidth: 2 }} />
                    <Line dataKey="mcMinus2Sigma" name="−2σ（下位 約2.3%）" type="monotone" stroke={C.mcMinus}
                      strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}
                      activeDot={{ r: 3.5, stroke: "#fff", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <DataTable rows={rows} retirementAge={retirementAge} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// データテーブル
// ---------------------------------------------------------------------------

function Num({ v, bold, dashZero, trend }: { v: number; bold?: boolean; dashZero?: boolean; trend?: boolean }) {
  const r = Math.round(v);
  if (dashZero && r === 0) return <span className="text-slate-300">–</span>;
  const neg = r < 0;
  return (
    <span className={`inline-flex items-center justify-end gap-0.5 ${neg ? "text-rose-600" : ""} ${bold ? "font-bold" : ""}`}>
      {trend && (neg ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} className="text-emerald-500" />)}
      {neg ? "−" : ""}
      {Math.abs(r).toLocaleString()}
    </span>
  );
}

type Col = {
  key: string;
  label: string;
  render: (r: YearResult) => ReactNode;
  total?: boolean; // 合計系カラム
  sum?: (rows: YearResult[]) => number; // フッターの生涯合計
};
type Group = { label: string; icon: LucideIcon; tone: string; cols: Col[] };

const sumOf = (k: keyof YearResult) => (rows: YearResult[]) => rows.reduce((s, r) => s + (r[k] as number), 0);

const GROUPS: Group[] = [
  {
    label: "収入（手取り）", icon: Briefcase, tone: "bg-emerald-50 text-emerald-700",
    cols: [
      { key: "self", label: "本人", render: (r) => <Num v={r.selfIncome} dashZero />, sum: sumOf("selfIncome") },
      { key: "spouse", label: "配偶者", render: (r) => <Num v={r.spouseIncome} dashZero />, sum: sumOf("spouseIncome") },
      { key: "income", label: "収入計", total: true, render: (r) => <Num v={r.totalIncome} bold />, sum: sumOf("totalIncome") },
    ],
  },
  {
    label: "支出", icon: Wallet, tone: "bg-violet-50 text-violet-700",
    cols: [
      { key: "living", label: "生活費", render: (r) => <Num v={r.livingCost} />, sum: sumOf("livingCost") },
      { key: "edu", label: "教育費", render: (r) => <Num v={r.educationCost} dashZero />, sum: sumOf("educationCost") },
      { key: "spot", label: "スポット", render: (r) => <Num v={r.spotCost} dashZero />, sum: sumOf("spotCost") },
      { key: "expense", label: "支出計", total: true, render: (r) => <Num v={r.totalExpense} bold />, sum: sumOf("totalExpense") },
    ],
  },
  {
    label: "収支・投資", icon: HandCoins, tone: "bg-sky-50 text-sky-700",
    cols: [
      { key: "net", label: "年間収支", total: true, render: (r) => <Num v={r.netCashflow} bold trend />, sum: sumOf("netCashflow") },
      {
        key: "contrib", label: "積立/取崩",
        render: (r) => (
          <span className="inline-flex items-center gap-1">
            {r.contribution >= 0 && r.contribution < r.plannedContribution - 0.5 && (
              <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-700" title={`予定 ${Math.round(r.plannedContribution)}万円`}>減</span>
            )}
            <Num v={r.contribution} dashZero />
          </span>
        ),
        sum: sumOf("contribution"),
      },
      { key: "ret", label: "運用益", render: (r) => <Num v={r.investmentReturn} dashZero />, sum: sumOf("investmentReturn") },
    ],
  },
  {
    label: "資産残高", icon: Landmark, tone: "bg-blue-50 text-blue-700",
    cols: [
      { key: "cash", label: "現預金", render: (r) => <Num v={r.cash} /> },
      { key: "inv", label: "運用資産", render: (r) => <Num v={r.invested} /> },
      { key: "total", label: "総資産(固定)", total: true, render: (r) => <Num v={r.fixedReturnAssets} bold /> },
    ],
  },
  {
    label: "モンテカルロ（総資産）", icon: Dices, tone: "bg-indigo-50 text-indigo-700",
    cols: [
      { key: "mcMedian", label: "中央値", total: true, render: (r) => <Num v={r.mcMedian} bold /> },
      { key: "mcPlus2", label: "+2σ", render: (r) => <span className="text-sky-700"><Num v={r.mcPlus2Sigma} /></span> },
      { key: "mcMinus2", label: "−2σ", render: (r) => <span className="text-orange-700"><Num v={r.mcMinus2Sigma} /></span> },
    ],
  },
];

function DataTable({ rows, retirementAge }: { rows: YearResult[]; retirementAge: number }) {
  const cols = GROUPS.flatMap((g) => g.cols);
  const th = "whitespace-nowrap px-3 py-2 font-medium";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-right text-xs tabular-nums">
          <thead className="sticky top-0 z-20">
            <tr>
              <th rowSpan={2} className={`${th} sticky left-0 z-30 border-b border-r border-slate-200 bg-slate-100 text-left text-slate-600`}>
                年齢
              </th>
              {GROUPS.map((g) => (
                <th key={g.label} colSpan={g.cols.length} className={`${th} border-b border-l border-slate-200 text-center ${g.tone}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <g.icon size={14} /> {g.label}
                  </span>
                </th>
              ))}
              <th rowSpan={2} className={`${th} border-b border-l border-slate-200 bg-slate-100 text-left text-slate-600`}>
                ライフイベント
              </th>
            </tr>
            <tr>
              {GROUPS.map((g) =>
                g.cols.map((c, i) => (
                  <th key={c.key}
                    className={`${th} border-b border-slate-200 bg-slate-50 ${i === 0 ? "border-l" : ""} ${c.total ? "font-bold text-slate-800" : "text-slate-500"}`}>
                    {c.label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {rows.map((r) => {
              const isRetire = r.age === retirementAge;
              const depleted = r.totalAssets < 0;
              return (
                <tr key={r.age}
                  className={`${depleted ? "bg-rose-50 even:bg-rose-100/60" : "bg-white even:bg-slate-50"} transition-colors hover:bg-indigo-50`}>
                  <td className={`sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-100 bg-inherit px-3 py-1.5 text-left font-semibold text-slate-800 ${isRetire ? "shadow-[inset_3px_0_0_#4f46e5]" : ""}`}>
                    {r.age}
                    {r.spouseAge !== null && <span className="ml-1 text-[10px] font-normal text-slate-400">({r.spouseAge})</span>}
                  </td>
                  {GROUPS.map((g) =>
                    g.cols.map((c, i) => (
                      <td key={c.key}
                        className={`whitespace-nowrap border-b border-slate-100 px-3 py-1.5 ${i === 0 ? "border-l" : ""} ${c.total ? "bg-slate-900/[0.025]" : ""}`}>
                        {c.render(r)}
                      </td>
                    )),
                  )}
                  <td className="min-w-56 border-b border-l border-slate-100 px-3 py-1.5 text-left">
                    <div className="flex flex-wrap gap-1">
                      {r.events.map((e) => {
                        const { icon: Icon, cls } = EVENT_ICON[e.kind];
                        return (
                          <span key={e.text} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${cls}`}>
                            <Icon size={11} /> {e.text}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-slate-800 text-white">
              <td className="sticky left-0 z-30 whitespace-nowrap bg-slate-800 px-3 py-2 text-left font-semibold">生涯合計</td>
              {cols.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-3 py-2 font-bold">
                  {c.sum ? (
                    <span className={c.sum(rows) < 0 ? "text-rose-300" : ""}>
                      {c.sum(rows) < 0 ? "−" : ""}
                      {Math.abs(Math.round(c.sum(rows))).toLocaleString()}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
        <span>単位: 万円　年齢欄の（ ）は配偶者の年齢</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-indigo-600" />退職年</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-100" />資産マイナス</span>
        <span className="inline-flex items-center gap-1"><span className="rounded bg-amber-100 px-1 text-amber-700">減</span>現預金不足で積立を減額</span>
      </div>
    </div>
  );
}
