"use client";

import { GraduationCap, Plus, Repeat, ShoppingCart } from "lucide-react";
import { uid } from "@/lib/defaults";
import { EDUCATION_COST, EXAMS } from "@/lib/education";
import { occurrenceAges } from "@/lib/spot";
import type { Child, SchoolType, SpotEvent, UniversityType } from "@/lib/types";
import { AddButton, ItemCard, NumberField, SelectField, TextField, Toggle } from "../ui";
import { Badge, Card, Pills, type StepProps } from "./shared";

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
      <div className="mt-2">
        <Pills value={ev.isRecurring} onChange={mode}
          items={[[false, "単発"], [true, <><Repeat size={12} /> 繰り返し</>]]} />
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
          <NumberField label="年齢（本人）" unit="歳" value={ev.startAge} onChange={(v) => onChange({ startAge: v, endAge: v })} />
        </div>
      )}
    </ItemCard>
  );
}

export default function StepEducationEvents({ input, setInput }: StepProps) {
  const { self, children, events } = input;
  const updateEvent = (id: string, v: Partial<SpotEvent>) =>
    setInput((p) => ({ ...p, events: p.events.map((x) => (x.id === id ? { ...x, ...v } : x)) }));
  const removeEvent = (id: string) => setInput((p) => ({ ...p, events: p.events.filter((x) => x.id !== id) }));
  const addEvent = (recurring: boolean) =>
    setInput((p) => ({
      ...p,
      events: [
        ...p.events,
        recurring
          ? { id: uid(), label: "家族旅行", amount: 30, isRecurring: true, startAge: p.self.currentAge, endAge: Math.min(70, p.basic.endAge), interval: 1 }
          : { id: uid(), label: "新しい支出", amount: 100, isRecurring: false, startAge: p.self.currentAge + 5, endAge: p.self.currentAge + 5, interval: 5 },
      ],
    }));
  const recurring = events.filter((e) => e.isRecurring).sort((a, b) => a.startAge - b.startAge);
  const single = events.filter((e) => !e.isRecurring).sort((a, b) => a.startAge - b.startAge);

  return (
    <div className="space-y-4">
      <Card icon={GraduationCap} title="子供の教育費" badge={<Badge>{children.length}人</Badge>}
        note="進路を選ぶと学費が自動で入ります。受験を「する」にすると、直前3年間の塾・予備校代と最終年の受験料を上乗せします。">
        {children.length === 0 && <p className="text-sm text-slate-400">子供なしで計算します（ステップ1で変更できます）。</p>}
        {children.map((ch) => {
          const update = (v: Partial<Child>) =>
            setInput((p) => ({ ...p, children: p.children.map((x) => (x.id === ch.id ? { ...x, ...v } : x)) }));
          return (
            <div key={ch.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-700">{ch.name}（現在 {ch.currentAge}歳）</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SelectField label="幼稚園・保育園" value={ch.preschool} options={schoolOptions("preschool")} onChange={(v) => update({ preschool: v })} />
                <SelectField label="小学校" value={ch.elementary} options={schoolOptions("elementary")} onChange={(v) => update({ elementary: v })} />
                <SelectField label="中学校" value={ch.juniorHigh} options={schoolOptions("juniorHigh")} onChange={(v) => update({ juniorHigh: v })} />
                <SelectField label="高校" value={ch.highSchool} options={schoolOptions("highSchool")} onChange={(v) => update({ highSchool: v })} />
                <SelectField label="大学" value={ch.university} options={universityOptions} onChange={(v) => update({ university: v })} />
                {ch.university !== "none" && (
                  <SelectField label="大学院（修士2年）" value={ch.graduate} options={graduateOptions} onChange={(v) => update({ graduate: v })} />
                )}
              </div>
              <div className="mt-3 grid gap-2 rounded-md bg-white p-2.5 sm:grid-cols-3">
                {EXAMS.map((ex) => {
                  const disabled = ex.key === "examUniversity" && ch.university === "none";
                  return (
                    <div key={ex.key} className={disabled ? "opacity-40" : ""}>
                      <Toggle label={ex.label} checked={ch[ex.key] && !disabled}
                        onChange={(v) => !disabled && update({ [ex.key]: v } as Partial<Child>)} />
                      <p className="text-[10px] text-slate-400">
                        {ex.fromAge}〜{ex.fromAge + 2}歳: 塾 {ex.cram.join("→")}万/年 ＋ 受験料 {ex.examFee}万
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-slate-400">文科省「子供の学習費調査」等をもとにした概算額。幼3-5歳／小6-11歳／中12-14歳／高15-17歳／大18-21歳／大学院22-23歳。</p>
      </Card>

      <Card icon={Repeat} title="繰り返し発生する支出" badge={<Badge>{recurring.length}件</Badge>}
        note="家族旅行・家電の買い替え・帰省など、毎年や数年ごとに発生する支出。">
        {recurring.map((ev) => (
          <SpotCard key={ev.id} ev={ev} onChange={(v) => updateEvent(ev.id, v)} onRemove={() => removeEvent(ev.id)} />
        ))}
        <AddButton onClick={() => addEvent(true)}><Plus size={16} /> 繰り返し支出を追加</AddButton>
      </Card>

      <Card icon={ShoppingCart} title="単発の特別支出" badge={<Badge>{single.length}件</Badge>}
        note={`結婚式・リフォーム・援助など、一度きりの大きな支出（年齢は本人。現在 ${self.currentAge}歳）。`}>
        {single.map((ev) => (
          <SpotCard key={ev.id} ev={ev} onChange={(v) => updateEvent(ev.id, v)} onRemove={() => removeEvent(ev.id)} />
        ))}
        <AddButton onClick={() => addEvent(false)}><Plus size={16} /> 特別支出を追加</AddButton>
      </Card>
    </div>
  );
}
