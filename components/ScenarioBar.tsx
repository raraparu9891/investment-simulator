"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FolderOpen, Save, Trash2, Upload } from "lucide-react";
import { deleteScenario, listScenarios, normalizeInput, saveScenario, type SavedScenario } from "@/lib/scenarios";
import type { SimulationInput } from "@/lib/types";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 入力状態に名前を付けて localStorage に保存・読込・削除する */
export default function ScenarioBar({ input, onLoad }: {
  input: SimulationInput;
  onLoad: (input: SimulationInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SavedScenario[]>([]);
  const [name, setName] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  // localStorage はブラウザでのみ読める（SSR とのズレを避けるためマウント後に読む）
  useEffect(() => setList(listScenarios()), []);

  const flash = (text: string, tone: "ok" | "error" = "ok") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 2500);
  };

  const save = () => {
    const n = name.trim();
    if (!n) return flash("シナリオ名を入力してください", "error");
    if (list.some((s) => s.name === n) && !window.confirm(`「${n}」を上書きしますか？`)) return;
    if (!saveScenario(n, input)) return flash("保存できませんでした（ブラウザの保存領域を確認してください）", "error");
    setList(listScenarios());
    setActive(n);
    flash(`「${n}」を保存しました`);
  };

  const load = (s: SavedScenario) => {
    onLoad(normalizeInput(s.input));
    setActive(s.name);
    setName(s.name);
    flash(`「${s.name}」を読み込みました`);
  };

  const remove = (s: SavedScenario) => {
    if (!window.confirm(`「${s.name}」を削除しますか？`)) return;
    deleteScenario(s.name);
    setList(listScenarios());
    if (active === s.name) setActive(null);
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <FolderOpen size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-800">シナリオ保存・読込</span>
          <span className="block truncate text-[11px] text-slate-500">
            {active ? `現在: ${active}` : `保存済み ${list.length}件`}
          </span>
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-indigo-100 px-4 py-3">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 住宅購入プラン A"
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <button type="button" onClick={save}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Save size={15} /> 保存
            </button>
          </div>
          {message && (
            <p className={`text-xs ${message.tone === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</p>
          )}

          {list.length === 0 ? (
            <p className="text-xs text-slate-400">保存済みのシナリオはありません。名前を付けて現在の入力内容を保存できます。</p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {list.map((s) => (
                <li key={s.name} className={`flex items-center gap-2 px-3 py-2 ${active === s.name ? "bg-indigo-50/70" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-700">{s.name}</span>
                    <span className="block text-[10px] text-slate-400">{fmtDate(s.savedAt)}</span>
                  </span>
                  <button type="button" onClick={() => load(s)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                    <Upload size={13} /> 読込
                  </button>
                  <button type="button" onClick={() => remove(s)} aria-label={`${s.name} を削除`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-slate-400">保存先はこのブラウザ内（localStorage）です。別の端末・ブラウザとは共有されません。</p>
        </div>
      )}
    </div>
  );
}
