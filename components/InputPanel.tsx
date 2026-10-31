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
import { normalizeWeights, portfolioStats } from "@/lib/funds";
import { occurrenceAges } from "@/lib/spot";
import type { Asset, Child, Person, RebalanceEvent, SchoolType, SimulationInput, SpotEvent, UniversityType, Weights } from "@/lib/types";
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
  const cur = portfolioStats(investment.assets, investment.currentWeights);
  const con = portfolioStats(investment.assets, investment.contributionWeights);
  // 投資対象を削除したら、すべての配分からその割合も取り除く
  const drop = (w: Weights, id: string) => Object.fromEntries(Object.entries(w).filter(([k]) => k !== id));
  const removeAsset = (id: string) =>
    patch("investment", {
      assets: investment.assets.filter((a) => a.id !== id),
      currentWeights: drop(investment.currentWeights, id),
      contributionWeights: drop(investment.contributionWeights, id),
      rebalances: investment.rebalances.map((rb) => ({ ...rb, allocations: drop(rb.allocations, id) })),
    });
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
        <FundGroup title="投資対象（アセット）の追加・編集"
          note="名称・想定リターン・想定リスク（標準偏差）を自由に設定できます。下の①②・リバランスの割合入力に自動で展開されます。">
          <AssetEditor assets={investment.assets} onChange={(a) => patch("investment", { assets: a })} onRemove={removeAsset} />
        </FundGroup>

        <FundGroup title="① 現在のポートフォリオ"
          note={`すでに運用中の資産 ${basic.investedAssets.toLocaleString()}万円の配分。この利回りで複利運用します。`}>
          <WeightEditor assets={investment.assets} weights={investment.currentWeights}
            onChange={(w) => patch("investment", { currentWeights: w })} />
        </FundGroup>

        <FundGroup title="② これからの積立投資"
          note="毎年の積立額をこの配分で購入し、①とは別に複利運用します。">
          <WeightEditor assets={investment.assets} weights={investment.contributionWeights}
            onChange={(w) => patch("investment", { contributionWeights: w })} />
        </FundGroup>

        <SubHeading>積立額</SubHeading>
        <NumberField label="基本の年間積立額" unit="万円/年" step={6} value={investment.baseContribution}
          onChange={(v) => patch("investment", { baseContribution: v })}
          hint="下の「最低維持ライン」を割り込む年は、積立額を自動で減額・停止します" />
        <NumberField label="現預金の最低維持ライン" unit="万円" step={50} min={0} value={investment.minCashReserve}
          onChange={(v) => patch("investment", { minCashReserve: Math.max(0, v) })}
          hint={`積立後の現預金がこの額を下回らない範囲で積み立てます（生活費の半年分 ≒ ${Math.round(expense.livingCost / 2).toLocaleString()}万円）。赤字の年でも、この額を超える貯金があればその範囲で積立を続けます`} />
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
          const stats = portfolioStats(investment.assets, rb.allocations);
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
      </Section>
    </div>
  );
}
