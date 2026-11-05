"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Trash2, type LucideIcon } from "lucide-react";

export function formatMan(v: number) {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 10000) return `${sign}${(a / 10000).toFixed(2)}億円`;
  return `${sign}${Math.round(a).toLocaleString()}万円`;
}

export function Section({
  icon: Icon,
  title,
  badge,
  defaultOpen = false,
  fixed = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  fixed?: boolean; // true: 折りたたまない（ウィザードのカード用）
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || fixed);
  const header = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={18} />
      </span>
      <span className="flex-1 font-semibold text-slate-800">{title}</span>
      {badge}
    </>
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {fixed ? (
        <div className="flex w-full items-center gap-3 px-4 py-3">{header}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          aria-expanded={open}
        >
          {header}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {(open || fixed) && <div className="space-y-4 border-t border-slate-100 px-4 py-4">{children}</div>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  // 入力途中の空欄や "-" を許容するため文字列ドラフトを持つ
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (Number(draft) !== value) setDraft(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <input
          type="number"
          inputMode="decimal"
          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-slate-800 outline-none"
          value={draft}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => setDraft(String(value))}
        />
        {unit && <span className="shrink-0 pr-3 text-xs text-slate-400">{unit}</span>}
      </div>
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-indigo-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-5.5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

/** 動的リストの1行分のカード */
export function ItemCard({ onRemove, children }: { onRemove: () => void; children: ReactNode }) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-slate-50/60 p-3 pr-10">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="削除"
        className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
    >
      {children}
    </button>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</h4>;
}
