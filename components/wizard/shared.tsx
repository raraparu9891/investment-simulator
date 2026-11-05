"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import type { SimulationInput } from "@/lib/types";

export type StepProps = {
  input: SimulationInput;
  setInput: Dispatch<SetStateAction<SimulationInput>>;
};

/** セクション単位の部分更新ヘルパー */
export function patcher(setInput: StepProps["setInput"]) {
  return <K extends keyof SimulationInput>(key: K, value: Partial<SimulationInput[K]>) =>
    setInput((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }));
}

/** ステップ内のカード（折りたたまない） */
export function Card({ icon: Icon, title, note, badge, tone = "default", children }: {
  icon?: LucideIcon;
  title: string;
  note?: ReactNode;
  badge?: ReactNode;
  tone?: "default" | "violet";
  children: ReactNode;
}) {
  const toneCls = tone === "violet" ? "border-violet-200 bg-violet-50/30" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border shadow-sm ${toneCls}`}>
      <div className="flex items-start gap-3 px-4 pt-4">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-800">{title}</div>
          {note && <div className="mt-0.5 text-[11px] text-slate-500">{note}</div>}
        </div>
        {badge}
      </div>
      <div className="space-y-3 px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "amber" }) {
  const cls = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

/** 2択以上のピル型トグル */
export function Pills<T extends string | boolean>({ value, onChange, items, size = "sm" }: {
  value: T;
  onChange: (v: T) => void;
  items: [T, ReactNode][];
  size?: "sm" | "md";
}) {
  const pad = size === "md" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {items.map(([v, label]) => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          className={`flex items-center gap-1 rounded-md font-medium transition-colors ${pad} ${
            value === v ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export const yen = (v: number) => `${Math.round(v).toLocaleString()}万`;
export const round1 = (v: number) => Math.round(v * 10) / 10;
export const round2 = (v: number) => Math.round(v * 100) / 100;
