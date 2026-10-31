"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  Baby,
  CalendarClock,
  Shuffle,
  HeartHandshake,
  PiggyBank,
  PieChart,
  Plus,
  Repeat,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";
import { uid } from "@/lib/defaults";
import { EDUCATION_COST, EXAMS } from "@/lib/education";
import { FUND_PRESETS, allocationsToFunds, fundsToAllocations, portfolioStats, presetOf } from "@/lib/funds";
import { occurrenceAges } from "@/lib/spot";
import type { Child, Fund, Person, RebalanceEvent, SchoolType, SimulationInput, SpotEvent, UniversityType } from "@/lib/types";
import MortgageSection from "./MortgageSection";
import PersonSection from "./PersonSection";
import ScenarioBar from "./ScenarioBar";
import {
  AddButton,
  ItemCard,
  NumberField,
  Section,
  SelectField,
  SubHeading,
  TextField,
  Toggle,
} from "./ui";

type Props = {
  input: SimulationInput;
  setInput: Dispatch<SetStateAction<SimulationInput>>;
};

function SpotCard({ ev, onChange, onRemove }: {
  ev: SpotEvent; onChange: (v: Partial<SpotEvent>) => void; onRemove: () => void;
}) {
  const ages = occurrenceAges(ev);
  const mode = (recurring: boolean) =>
    onChange(recurring
      ? { isRecurring: true, endAge: Math.max(ev.endAge, ev.startAge + 10), interval: Math.max(1, ev.interval) }
      : { isRecurring: false });
  return (
    <ItemCard onRemove={onRemove}>
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <TextField label="内容" value={ev.label} onChange={(v) => onChange({ label: v })} />
        <NumberField label="金額（1回）" unit="万円" step={10} value={ev.amount} onChange={(v) => onChange({ amount: v })} />
      </div>
      <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
        {([[false, "単発"], [true, "繰り返し"]] as const).map(([rec, label]) => (
          <button key={label} type="button" onClick={() => mode(rec)}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors ${
              ev.isRecurring === rec ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}>
            {rec && <Repeat size={12} />} {label}
          </button>
        ))}
      </div>
      {ev.isRecurring ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField label="開始" unit="歳" value={ev.startAge} onChange={(v) => onChange({ startAge: v })} />
            <NumberField label="終了" unit="歳" value={ev.endAge} min={ev.startAge} onChange={(v) => onChange({ endAge: v })} />
            <NumberField label="周期" unit="年ごと" min={1} value={ev.interval} onChange={(v) => onChange({ interval: Math.max(1, v) })} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {ages.length > 0
              ? `${ages.slice(0, 6).join("・")}${ages.length > 6 ? "…" : ""}歳（計${ages.length}回・合計${(ages.length * ev.amount).toLocaleString()}万円）`
              : "期間内に発生しません（開始・終了年齢を確認してください）"}
          </p>
        </>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <NumberField label="年齢" unit="歳" value={ev.startAge} onChange={(v) => onChange({ startAge: v, endAge: v })} />
        </div>
      )}
    </ItemCard>
  );
}

/** ファンド配分リスト（現在のポートフォリオ／積立の両方で使う） */
function FundList({ funds, onChange }: { funds: Fund[]; onChange: (funds: Fund[]) => void }) {
  const { expectedReturn: rate, risk, ratioTotal } = portfolioStats(funds);
  const off = Math.abs(ratioTotal - 100) > 0.01;
  return (
    <>
      {funds.map((f) => {
        const preset = presetOf(f.presetId);
        const update = (v: Partial<Fund>) => onChange(funds.map((x) => (x.id === f.id ? { ...x, ...v } : x)));
        return (
          <ItemCard key={f.id} onRemove={() => onChange(funds.filter((x) => x.id !== f.id))}>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <SelectField label="投資先（指数）" value={f.presetId}
                options={FUND_PRESETS.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(v) => update({ presetId: v })} />
              <NumberField label="割合" unit="%" step={5} min={0} value={f.ratio} onChange={(v) => update({ ratio: v })} />
            </div>
            <div className="mt-2 flex gap-2 text-[11px]">
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">リターン {preset.expectedReturn}%</span>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">リスク σ {preset.risk}%</span>
            </div>
          </ItemCard>
        );
      })}
      <AddButton onClick={() => onChange([...funds, { id: uid(), presetId: "sp500", ratio: Math.max(0, 100 - ratioTotal) }])}>
        <Plus size={16} /> 投資先を追加
      </AddButton>
      <div>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
          {funds.map((f, i) => (
            <div key={f.id} style={{ width: `${(Math.max(0, f.ratio) / Math.max(100, ratioTotal)) * 100}%` }}
              className={["bg-indigo-500", "bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"][i % 5]} />
          ))}
        </div>
        <p className={`mt-1 text-xs ${off ? "text-amber-600" : "text-slate-500"}`}>
          割合合計 {ratioTotal}%
          {off && "（100%以外の場合は比率で正規化して計算します）"}
          ／期待リターン <span className="font-semibold">{rate.toFixed(2)}%</span>
          ／リスク <span className="font-semibold">{risk.toFixed(1)}%</span>
        </p>
      </div>
    </>
  );
}

function FundGroup({ title, note, children }: { title: string; note: string; children: ReactNode }) {
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

const schoolOptions = (stage: "preschool" | "elementary" | "juniorHigh" | "highSchool") =>
  (["public", "private"] as SchoolType[]).map((v) => ({
    value: v,
    label: `${v === "public" ? "公立" : "私立"}（${EDUCATION_COST[stage][v]}万/年）`,
  }));

const universityOptions: { value: UniversityType; label: string }[] = [
  { value: "public", label: `国公立（${EDUCATION_COST.university.public}万/年）` },
  { value: "private", label: `私立（${EDUCATION_COST.university.private}万/年）` },
  { value: "none", label: "進学しない" },
];

const graduateOptions: { value: UniversityType; label: string }[] = [
  { value: "none", label: "進学しない" },
  { value: "public", label: `国立（${EDUCATION_COST.graduate.public}万/年）` },
  { value: "private", label: `私立（${EDUCATION_COST.graduate.private}万/年）` },
];

const NEW_CHILD: Omit<Child, "id" | "name"> = {
  currentAge: 0,
  preschool: "public",
  elementary: "public",
  juniorHigh: "public",
  highSchool: "public",
  university: "public",
  graduate: "none",
  examJuniorHigh: false,
  examHighSchool: true,
  examUniversity: true,
};

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "amber" }) {
  const cls = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

export default function InputPanel({ input, setInput }: Props) {
  // セクション単位の部分更新ヘルパー
  const patch = <K extends keyof SimulationInput>(key: K, value: Partial<SimulationInput[K]>) =>
    setInput((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }));

  const { basic, self, spouse, expense, mortgage, children, events, investment } = input;
  const cur = portfolioStats(investment.currentFunds);
  const con = portfolioStats(investment.contributionFunds);
  const ratioOff = [cur, con].some((s) => Math.abs(s.ratioTotal - 100) > 0.01);
  const patchPerson = (key: "self" | "spouse") => (v: Partial<Person>) =>
    setInput((prev) => ({ ...prev, [key]: { ...prev[key], ...v } }));

  return (
    <div className="space-y-3">
      <ScenarioBar input={input} onLoad={setInput} />

      {/* 基本・資産 */}
      <Section icon={PiggyBank} title="基本・資産" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="現預金" unit="万円" step={10} value={basic.cashAssets}
            onChange={(v) => patch("basic", { cashAssets: v })} />
          <NumberField label="運用中の資産" unit="万円" step={10} value={basic.investedAssets}
            onChange={(v) => patch("basic", { investedAssets: v })} hint="投資設定の「現在のポートフォリオ」で運用" />
          <NumberField label="シミュレーション終了（本人）" unit="歳" value={basic.endAge} min={self.currentAge} max={110}
            onChange={(v) => patch("basic", { endAge: v })} />
        </div>
        <p className="text-xs text-slate-500">
          現在の総資産: <span className="font-semibold text-slate-700">{(basic.cashAssets + basic.investedAssets).toLocaleString()}万円</span>
        </p>
      </Section>

      <PersonSection icon={User} title="本人の収入・年金" person={self} onChange={patchPerson("self")} defaultOpen />
      <PersonSection icon={HeartHandshake} title="配偶者の収入・年金" person={spouse} onChange={patchPerson("spouse")} optional />

      {/* 支出 */}
      <Section icon={Wallet} title="支出設定">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="年間生活費（現在）" unit="万円" step={10} value={expense.livingCost}
            onChange={(v) => patch("expense", { livingCost: v })} />
          <NumberField label="インフレ率" unit="%/年" step={0.1} value={expense.inflationRate}
            onChange={(v) => patch("expense", { inflationRate: v })} />
        </div>
        <p className="text-[11px] text-slate-400">生活費・教育費は毎年インフレ率で増加します。住宅ローンは下の「住宅ローン」で設定します（生活費には含めないでください）。</p>
      </Section>

      <MortgageSection mortgage={mortgage} currentAge={self.currentAge} onChange={(v) => patch("mortgage", v)} />

      {/* 子供 */}
      <Section icon={Baby} title="子供の教育費" badge={<Badge>{children.length}人</Badge>}>
        {children.map((ch) => {
          const update = (v: Partial<Child>) =>
            setInput((p) => ({ ...p, children: p.children.map((x) => (x.id === ch.id ? { ...x, ...v } : x)) }));
          return (
            <ItemCard key={ch.id}
              onRemove={() => setInput((p) => ({ ...p, children: p.children.filter((x) => x.id !== ch.id) }))}>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="名前" value={ch.name} onChange={(v) => update({ name: v })} />
                <NumberField label="現在の年齢" unit="歳" min={0} value={ch.currentAge} onChange={(v) => update({ currentAge: v })} />
                <SelectField label="幼稚園・保育園" value={ch.preschool} options={schoolOptions("preschool")} onChange={(v) => update({ preschool: v })} />
                <SelectField label="小学校" value={ch.elementary} options={schoolOptions("elementary")} onChange={(v) => update({ elementary: v })} />
                <SelectField label="中学校" value={ch.juniorHigh} options={schoolOptions("juniorHigh")} onChange={(v) => update({ juniorHigh: v })} />
                <SelectField label="高校" value={ch.highSchool} options={schoolOptions("highSchool")} onChange={(v) => update({ highSchool: v })} />
                <SelectField label="大学" value={ch.university} options={universityOptions} onChange={(v) => update({ university: v })} />
                {ch.university !== "none" && (
                  <SelectField label="大学院（修士2年）" value={ch.graduate} options={graduateOptions} onChange={(v) => update({ graduate: v })} />
                )}
              </div>
              <div className="mt-3 space-y-2 rounded-md bg-white p-2.5">
                <div className="text-[11px] font-semibold text-slate-500">受験（直前3年間の塾・予備校代＋最終年の受験料を自動加算）</div>
                {EXAMS.map((ex) => {
                  const disabled = ex.key === "examUniversity" && ch.university === "none";
                  return (
                    <div key={ex.key} className={disabled ? "opacity-40" : ""}>
                      <Toggle label={`${ex.label}をする`} checked={ch[ex.key] && !disabled}
                        onChange={(v) => !disabled && update({ [ex.key]: v } as Partial<Child>)} />
                      <p className="text-[10px] text-slate-400">
                        {ex.fromAge}〜{ex.fromAge + 2}歳: 塾 {ex.cram.join("→")}万/年 ＋ 受験料 {ex.examFee}万
                      </p>
                    </div>
                  );
                })}
              </div>
            </ItemCard>
          );
        })}
        <AddButton
          onClick={() =>
            setInput((p) => ({
              ...p,
              children: [...p.children, { ...NEW_CHILD, id: uid(), name: `第${p.children.length + 1}子` }],
            }))
          }>
          <Plus size={16} /> 子供を追加
        </AddButton>
        <p className="text-[11px] text-slate-400">文科省「子供の学習費調査」等をもとにした概算額。幼3-5歳／小6-11歳／中12-14歳／高15-17歳／大18-21歳／大学院22-23歳。塾・受験料は一般的な相場の概算です。</p>
      </Section>

      {/* スポット支出 */}
      <Section icon={ShoppingCart} title="スポット支出" badge={<Badge>{events.length}件</Badge>}>
        {[...events].sort((a, b) => a.startAge - b.startAge).map((ev) => (
          <SpotCard key={ev.id} ev={ev}
            onChange={(v) => setInput((p) => ({ ...p, events: p.events.map((x) => (x.id === ev.id ? { ...x, ...v } : x)) }))}
            onRemove={() => setInput((p) => ({ ...p, events: p.events.filter((x) => x.id !== ev.id) }))} />
        ))}
        <AddButton
          onClick={() =>
            setInput((p) => ({
              ...p,
              events: [...p.events, {
                id: uid(), label: "新しい支出", amount: 100, isRecurring: false,
                startAge: p.self.currentAge + 5, endAge: p.self.currentAge + 5, interval: 5,
              }],
            }))
          }>
          <Plus size={16} /> スポット支出を追加
        </AddButton>
      </Section>

      {/* 投資 */}
      <Section icon={PieChart} title="投資設定"
        badge={
          <Badge tone={ratioOff ? "amber" : "slate"}>
            {cur.expectedReturn.toFixed(1)}% / 積立 {con.expectedReturn.toFixed(1)}%
          </Badge>
        }>
        <FundGroup title="① 現在のポートフォリオ"
          note={`すでに運用中の資産 ${basic.investedAssets.toLocaleString()}万円の配分。この利回りで複利運用します。`}>
          <FundList funds={investment.currentFunds} onChange={(f) => patch("investment", { currentFunds: f })} />
        </FundGroup>

        <FundGroup title="② これからの積立投資"
          note="毎年の積立額をこの配分で購入し、①とは別に複利運用します。">
          <FundList funds={investment.contributionFunds} onChange={(f) => patch("investment", { contributionFunds: f })} />
        </FundGroup>

        <SubHeading>積立額</SubHeading>
        <NumberField label="基本の年間積立額" unit="万円/年" step={6} value={investment.baseContribution}
          onChange={(v) => patch("investment", { baseContribution: v })}
          hint="その年の現預金が不足する場合は、積み立て可能な範囲に自動で抑えます" />
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <CalendarClock size={14} /> 年齢区間ごとの積立額（下にあるほど優先）
        </div>
        {investment.rules.map((ru) => {
          const update = (v: Partial<typeof ru>) =>
            patch("investment", { rules: investment.rules.map((x) => (x.id === ru.id ? { ...x, ...v } : x)) });
          return (
            <ItemCard key={ru.id}
              onRemove={() => patch("investment", { rules: investment.rules.filter((x) => x.id !== ru.id) })}>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="開始" unit="歳" value={ru.fromAge} onChange={(v) => update({ fromAge: v })} />
                <NumberField label="終了" unit="歳" value={ru.toAge} onChange={(v) => update({ toAge: v })} />
                <NumberField label="積立額" unit="万円" step={6} value={ru.amount} onChange={(v) => update({ amount: v })} />
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
        <p className="text-[11px] text-slate-400">現預金が不足して取り崩す場合は、①②の残高の比率で按分して取り崩します。</p>

        {/* リバランス */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Shuffle size={14} className="text-violet-500" /> 年齢に応じたリバランス（ターゲット・イヤー設定）
        </div>
        <p className="-mt-2 text-[11px] text-slate-400">
          実行年齢の期首に①②の運用資産をすべて合算し、新しい割合で再配分します（非課税スイッチングとして計算）。以後の積立もこの割合で行います。
        </p>
        {[...(investment.rebalances ?? [])].sort((a, b) => a.targetAge - b.targetAge).map((rb) => {
          const update = (v: Partial<RebalanceEvent>) =>
            patch("investment", { rebalances: investment.rebalances.map((x) => (x.id === rb.id ? { ...x, ...v } : x)) });
          const stats = portfolioStats(allocationsToFunds(rb.allocations));
          return (
            <div key={rb.id} className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
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
              <FundList funds={allocationsToFunds(rb.allocations)}
                onChange={(f) => update({ allocations: fundsToAllocations(f) })} />
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
                  allocations: (last?.allocations ?? fundsToAllocations(investment.contributionFunds)).map((a) => ({ ...a, id: uid() })),
                },
              ],
            });
          }}>
          <Plus size={16} /> リバランスを追加
        </AddButton>
      </Section>
    </div>
  );
}
