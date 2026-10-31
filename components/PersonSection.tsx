"use client";

import { Calculator, Landmark, Plus, type LucideIcon } from "lucide-react";
import { uid } from "@/lib/defaults";
import { calculateNetIncomeDetail, estimatePension } from "@/lib/income";
import type { Employment, Person, WorkChangeType } from "@/lib/types";
import { AddButton, ItemCard, NumberField, Section, SelectField, SubHeading, Toggle } from "./ui";

const changeOptions: { value: WorkChangeType; label: string }[] = [
  { value: "jobchange", label: "転職（年収変更）" },
  { value: "parttime", label: "パート化（固定）" },
  { value: "retire", label: "退職" },
];

const employmentOptions: { value: Employment; label: string }[] = [
  { value: "employee", label: "会社員・公務員" },
  { value: "self", label: "自営業・フリーランス" },
];

const yen = (v: number) => `${Math.round(v).toLocaleString()}万`;

export default function PersonSection({
  icon,
  title,
  person,
  onChange,
  optional = false,
  defaultOpen = false,
}: {
  icon: LucideIcon;
  title: string;
  person: Person;
  onChange: (v: Partial<Person>) => void;
  optional?: boolean;
  defaultOpen?: boolean;
}) {
  const tax = calculateNetIncomeDetail(person.grossIncome);
  const pension = estimatePension(person);
  const netRate = person.grossIncome > 0
    ? ((person.manualNet ? person.netIncome : tax.net) / person.grossIncome) * 100
    : 0;

  const updateChange = (id: string, v: Partial<Person["changes"][number]>) =>
    onChange({ changes: person.changes.map((x) => (x.id === id ? { ...x, ...v } : x)) });

  return (
    <Section
      icon={icon}
      title={title}
      defaultOpen={defaultOpen}
      badge={
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {person.enabled ? `額面${yen(person.grossIncome)}` : "なし"}
        </span>
      }
    >
      {optional && (
        <Toggle label="収入に含める" checked={person.enabled} onChange={(v) => onChange({ enabled: v })} />
      )}
      {person.enabled && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="現在の年齢" unit="歳" min={18} max={90} value={person.currentAge}
              onChange={(v) => onChange({ currentAge: v })} />
            <SelectField label="働き方" value={person.employment} options={employmentOptions}
              onChange={(v) => onChange({ employment: v })} />
            <NumberField label="額面年収" unit="万円" step={10} value={person.grossIncome}
              onChange={(v) => onChange({ grossIncome: v })} />
            <NumberField label="昇給率" unit="%/年" step={0.1} value={person.raiseRate}
              onChange={(v) => onChange({ raiseRate: v })} />
          </div>

          {/* 手取り */}
          <div className="rounded-lg bg-indigo-50/60 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Calculator size={14} /> 手取り年収
              <span className="ml-auto rounded bg-white px-1.5 py-0.5 font-medium tabular-nums text-indigo-600">
                手取り率 {netRate.toFixed(1)}%
              </span>
            </div>
            <Toggle label="手取りを手動で入力する" checked={person.manualNet}
              onChange={(v) => onChange({ manualNet: v, netIncome: v ? Math.round(tax.net) : person.netIncome })} />
            {person.manualNet ? (
              <div className="mt-2">
                <NumberField label="手取り年収" unit="万円" step={10} value={person.netIncome}
                  onChange={(v) => onChange({ netIncome: v })}
                  hint="この手取り率を将来の額面（昇給・転職後）にも適用します" />
              </div>
            ) : (
              <dl className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
                {[
                  ["社会保険", tax.socialInsurance],
                  ["所得税", tax.incomeTax],
                  ["住民税", tax.residentTax],
                  ["手取り", tax.net],
                ].map(([k, v], i) => (
                  <div key={k as string} className={`rounded-md bg-white py-1.5 ${i === 3 ? "ring-1 ring-indigo-200" : ""}`}>
                    <dt className="text-slate-400">{k}</dt>
                    <dd className={`tabular-nums ${i === 3 ? "font-bold text-indigo-700" : "text-slate-700"}`}>
                      {i < 3 ? "−" : ""}{yen(v as number)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <NumberField label="完全リタイア年齢" unit="歳" value={person.retirementAge}
            onChange={(v) => onChange({ retirementAge: v })} hint="この年齢以降は就労収入 0" />

          {/* 働き方の変化 */}
          <SubHeading>働き方の変化（{title.replace(/の.*$/, "")}の年齢）</SubHeading>
          {[...person.changes].sort((a, b) => a.age - b.age).map((c) => (
            <ItemCard key={c.id} onRemove={() => onChange({ changes: person.changes.filter((x) => x.id !== c.id) })}>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="年齢" unit="歳" value={c.age} onChange={(v) => updateChange(c.id, { age: v })} />
                <SelectField label="内容" value={c.type} options={changeOptions}
                  onChange={(v) => updateChange(c.id, { type: v })} />
                {c.type === "retire" ? (
                  <div className="flex items-end pb-2 text-xs text-slate-400">収入 0円</div>
                ) : (
                  <NumberField label="変更後の額面" unit="万円" step={10} value={c.grossIncome}
                    onChange={(v) => updateChange(c.id, { grossIncome: v })} />
                )}
              </div>
            </ItemCard>
          ))}
          <AddButton
            onClick={() =>
              onChange({
                changes: [
                  ...person.changes,
                  { id: uid(), age: person.currentAge + 5, type: "jobchange", grossIncome: person.grossIncome },
                ],
              })
            }
          >
            <Plus size={16} /> 働き方の変化を追加
          </AddButton>

          {/* 年金 */}
          <SubHeading>年金</SubHeading>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="受給開始年齢" unit="歳" value={person.pensionStartAge}
              onChange={(v) => onChange({ pensionStartAge: v })} />
            {person.pensionAuto ? (
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-500">推計年金額（年）</span>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-700">
                  {yen(pension.total)}円
                </div>
              </div>
            ) : (
              <NumberField label="年金額（年）" unit="万円" step={5} value={person.pension}
                onChange={(v) => onChange({ pension: v })} />
            )}
          </div>
          <Toggle label="年金額を自動で推計する" checked={person.pensionAuto}
            onChange={(v) => onChange({ pensionAuto: v, pension: v ? person.pension : Math.round(pension.total) })} />
          {person.pensionAuto && (
            <div className="flex gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500">
              <Landmark size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <p>
                国民年金 {yen(pension.national)}
                {person.employment === "employee" ? (
                  <> ＋ 厚生年金 {yen(pension.employee)}（平均額面 {yen(pension.averageGross)} × 加入{pension.enrolledYears}年）</>
                ) : (
                  <>（自営業のため厚生年金なし）</>
                )}
                。22歳から就労、過去の年収は昇給率で割り戻した概算です。
              </p>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
