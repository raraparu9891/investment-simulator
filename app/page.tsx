"use client";

import { useState } from "react";
import { LineChart, RotateCcw } from "lucide-react";
import InputPanel from "@/components/InputPanel";
import ResultPanel from "@/components/ResultPanel";
import { useSimulation } from "@/hooks/useSimulation";
import { DEFAULT_INPUT } from "@/lib/defaults";
import type { SimulationInput } from "@/lib/types";

export default function Home() {
  const [input, setInput] = useState<SimulationInput>(DEFAULT_INPUT);
  const [seed, setSeed] = useState(20261027);
  const { rows, summary } = useSimulation(input, seed);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <LineChart size={20} />
          </span>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900">ライフプラン＆投資シミュレータ</h1>
            <p className="text-xs text-slate-500">入力はリアルタイムでグラフ・表に反映されます（単位: 万円）</p>
          </div>
          <button
            type="button"
            onClick={() => setInput(DEFAULT_INPUT)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={14} /> 初期値に戻す
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[420px_1fr]">
        <aside className="lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-1">
          <InputPanel input={input} setInput={setInput} />
        </aside>
        <section className="min-w-0">
          <ResultPanel
            rows={rows}
            summary={summary}
            retirementAge={input.self.retirementAge}
            onReroll={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}
          />
        </section>
      </main>
    </div>
  );
}
