"use client";

import { HeartHandshake, User } from "lucide-react";
import type { Person } from "@/lib/types";
import PersonSection from "../PersonSection";
import type { StepProps } from "./shared";

export default function StepIncome({ input, setInput }: StepProps) {
  const patchPerson = (key: "self" | "spouse") => (v: Partial<Person>) =>
    setInput((prev) => ({ ...prev, [key]: { ...prev[key], ...v } }));

  return (
    <div className="space-y-4">
      <PersonSection icon={User} title="本人の収入・年金" person={input.self} onChange={patchPerson("self")} />
      {input.spouse.enabled ? (
        <PersonSection icon={HeartHandshake} title="配偶者の収入・年金" person={input.spouse} onChange={patchPerson("spouse")} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
          配偶者なしで計算します（ステップ1で変更できます）
        </p>
      )}
    </div>
  );
}
