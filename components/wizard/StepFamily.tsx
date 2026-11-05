"use client";

import { Baby, HeartHandshake, Minus, Plus, User } from "lucide-react";
import { uid } from "@/lib/defaults";
import type { Child } from "@/lib/types";
import { NumberField, TextField, Toggle } from "../ui";
import { Card, patcher, type StepProps } from "./shared";

export const NEW_CHILD: Omit<Child, "id" | "name"> = {
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

export default function StepFamily({ input, setInput }: StepProps) {
  const patch = patcher(setInput);
  const { basic, self, spouse, children } = input;

  const setCount = (n: number) =>
    setInput((p) => {
      const next = Math.max(0, Math.min(8, n));
      if (next <= p.children.length) return { ...p, children: p.children.slice(0, next) };
      const added = Array.from({ length: next - p.children.length }, (_, i) => ({
        ...NEW_CHILD,
        id: uid(),
        name: `第${p.children.length + i + 1}子`,
      }));
      return { ...p, children: [...p.children, ...added] };
    });

  return (
    <div className="space-y-4">
      <Card icon={User} title="あなた（本人）">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="現在の年齢" unit="歳" min={18} max={90} value={self.currentAge}
            onChange={(v) => patch("self", { currentAge: v })} />
          <NumberField label="何歳までシミュレーションするか" unit="歳" min={self.currentAge} max={110} value={basic.endAge}
            onChange={(v) => patch("basic", { endAge: v })} />
        </div>
      </Card>

      <Card icon={HeartHandshake} title="配偶者">
        <Toggle label="配偶者がいる" checked={spouse.enabled} onChange={(v) => patch("spouse", { enabled: v })} />
        {spouse.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="配偶者の年齢" unit="歳" min={18} max={90} value={spouse.currentAge}
              onChange={(v) => patch("spouse", { currentAge: v })} />
          </div>
        )}
      </Card>

      <Card icon={Baby} title="子供" note="まだ生まれていない予定の子は、年齢をマイナス（例: 2年後なら −2）で入力できます。">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">人数</span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
            <button type="button" aria-label="減らす" onClick={() => setCount(children.length - 1)}
              className="rounded-l-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={children.length === 0}>
              <Minus size={16} />
            </button>
            <span className="w-10 text-center text-lg font-bold tabular-nums text-slate-800">{children.length}</span>
            <button type="button" aria-label="増やす" onClick={() => setCount(children.length + 1)}
              className="rounded-r-lg p-2 text-indigo-600 hover:bg-indigo-50">
              <Plus size={16} />
            </button>
          </div>
          <span className="text-sm text-slate-600">人</span>
        </div>
        {children.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {children.map((ch) => {
              const update = (v: Partial<Child>) =>
                setInput((p) => ({ ...p, children: p.children.map((x) => (x.id === ch.id ? { ...x, ...v } : x)) }));
              return (
                <div key={ch.id} className="grid grid-cols-[1fr_6rem] gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                  <TextField label="呼び名" value={ch.name} onChange={(v) => update({ name: v })} />
                  <NumberField label="年齢" unit="歳" min={-10} max={30} value={ch.currentAge} onChange={(v) => update({ currentAge: v })} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
