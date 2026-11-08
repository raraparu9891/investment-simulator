"use client";

import { GraduationCap } from "lucide-react";
import { EDUCATION_COST, EXAMS } from "@/lib/education";
import type { Child, SchoolType, UniversityType } from "@/lib/types";
import { SelectField, Toggle } from "../ui";
import { Badge, Card, type StepProps } from "./shared";

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

export default function StepEducation({ input, setInput }: StepProps) {
  const { children } = input;
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
    </div>
  );
}
