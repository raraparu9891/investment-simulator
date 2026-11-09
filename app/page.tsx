"use client";

import { useState } from "react";
import { ArrowLeft, LineChart, Pencil, RotateCcw } from "lucide-react";
import ResultPanel from "@/components/ResultPanel";
import ScenarioBar from "@/components/ScenarioBar";
import PreviewPanel from "@/components/wizard/PreviewPanel";
import Wizard, { STEPS } from "@/components/wizard/Wizard";
import { useSimulation } from "@/hooks/useSimulation";
import { DEFAULT_INPUT } from "@/lib/defaults";
import type { SimulationInput } from "@/lib/types";

/** 結果画面。マウントされている間だけシミュレーションを計算する */
function ResultView({ input, onEdit }: { input: SimulationInput; onEdit: (step: number) => void }) {
  const [seed, setSeed] = useState(20261027);
  const { rows, summary, reach } = useSimulation(input, seed);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
        <button type="button" onClick={() => onEdit(STEPS.length - 1)}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50">
          <ArrowLeft size={16} /> 条件を修正する
        </button>
        <span className="ml-1 text-xs text-slate-500">ステップを選んで修正:</span>
        {STEPS.map((s, i) => (
          <button key={s.short} type="button" onClick={() => onEdit(i)}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
            <Pencil size={11} /> {i + 1}. {s.short}
          </button>
        ))}
      </div>
      <ResultPanel
        rows={rows}
        summary={summary}
        reach={reach}
        retirementAge={input.self.retirementAge}
        onReroll={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}
      />
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState<SimulationInput>(DEFAULT_INPUT);
  const [view, setView] = useState<"wizard" | "result">("wizard");
  const [step, setStep] = useState(0);

  const go = (v: "wizard" | "result", s = step) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, s)));
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <LineChart size={20} />
          </span>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900">ライフプラン＆投資シミュレータ</h1>
            <p className="text-xs text-slate-500">
              {view === "wizard" ? "6つのステップで入力すると、将来の資産推移がわかります（単位: 万円）" : "シミュレーション結果（単位: 万円）"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("入力内容を初期値に戻しますか？")) {
                setInput(DEFAULT_INPUT);
                go("wizard", 0);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={14} /> <span className="hidden sm:inline">初期値に戻す</span>
          </button>
        </div>
      </header>

      {view === "wizard" ? (
        <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-5">
          <ScenarioBar input={input} onLoad={setInput} />
          {/* PC: 左に入力、右にプレビュー（スクロールしても追従）／スマホ: プレビューを入力の上に折りたたんで置く */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6">
            <div className="min-w-0">
              <Wizard input={input} setInput={setInput} step={step} setStep={(s) => go("wizard", s)} onRun={() => go("result")} />
            </div>
            <aside className="order-first lg:order-none">
              <div className="lg:sticky lg:top-20">
                <PreviewPanel input={input} step={step} />
              </div>
            </aside>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-[1400px] px-4 py-5">
          <ResultView input={input} onEdit={(s) => go("wizard", s)} />
        </main>
      )}
    </div>
  );
}
