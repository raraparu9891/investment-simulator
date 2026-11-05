"use client";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Car,
  Check,
  GraduationCap,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import StepEducationEvents from "./StepEducationEvents";
import StepFamily from "./StepFamily";
import StepHousingCar from "./StepHousingCar";
import StepIncome from "./StepIncome";
import StepInvestment from "./StepInvestment";
import StepLiving from "./StepLiving";
import type { StepProps } from "./shared";

export const STEPS: { short: string; title: string; lead: string; icon: LucideIcon }[] = [
  { short: "家族", title: "家族構成", lead: "まずは、あなたと家族の年齢を教えてください。", icon: Users },
  { short: "収入", title: "収入", lead: "手取り・昇進・退職金・年金など、これからの収入を設定します。", icon: Banknote },
  { short: "生活費", title: "基本生活費", lead: "毎月の生活費を項目ごとに。ボタン1つで相場額が入ります。", icon: Wallet },
  { short: "住宅・車", title: "住宅ローンと自動車", lead: "大きな買い物は、生活費とは別に計算します。", icon: Car },
  { short: "教育・イベント", title: "教育費とライフイベント", lead: "進路・受験と、旅行や特別な支出を設定します。", icon: GraduationCap },
  { short: "資産運用", title: "資産運用と防衛戦略", lead: "いまの資産と、これからの積立・守り方を決めましょう。", icon: TrendingUp },
];

export default function Wizard({ step, setStep, onRun, ...props }: StepProps & {
  step: number;
  setStep: (s: number) => void;
  onRun: () => void;
}) {
  const meta = STEPS[step];
  const last = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div>
      {/* プログレスバー */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-bold tracking-widest text-indigo-600">STEP {step + 1} / {STEPS.length}</span>
          <span className="text-xs tabular-nums text-slate-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-6 gap-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.short}>
                <button type="button" onClick={() => setStep(i)} aria-current={current ? "step" : undefined}
                  className="group flex w-full flex-col items-center gap-1 rounded-lg py-1 hover:bg-slate-50">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    current ? "border-indigo-600 bg-indigo-600 text-white"
                      : done ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}>
                    {done ? <Check size={15} /> : <s.icon size={15} />}
                  </span>
                  <span className={`hidden text-[11px] sm:block ${current ? "font-semibold text-indigo-700" : "text-slate-500"}`}>
                    {s.short}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ステップ見出し */}
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <meta.icon size={22} className="text-indigo-600" /> {meta.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{meta.lead}</p>
      </div>

      {step === 0 && <StepFamily {...props} />}
      {step === 1 && <StepIncome {...props} />}
      {step === 2 && <StepLiving {...props} />}
      {step === 3 && <StepHousingCar {...props} />}
      {step === 4 && <StepEducationEvents {...props} />}
      {step === 5 && <StepInvestment {...props} onRun={onRun} />}

      {/* 戻る / 次へ */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:invisible">
            <ArrowLeft size={16} /> 戻る
          </button>
          <span className="flex-1 text-center text-xs text-slate-400">{step + 1} / {STEPS.length}</span>
          {last ? (
            <button type="button" onClick={onRun}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:opacity-95">
              結果を見る <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700">
              次へ：{STEPS[step + 1].short} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
