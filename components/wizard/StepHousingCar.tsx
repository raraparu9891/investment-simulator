"use client";

import { Car, Plus } from "lucide-react";
import { carLoanTerms, purchaseAges } from "@/lib/car";
import { uid } from "@/lib/defaults";
import type { CarPlan } from "@/lib/types";
import MortgageSection from "../MortgageSection";
import { AddButton, ItemCard, NumberField, TextField } from "../ui";
import { Card, Pills, patcher, yen, type StepProps } from "./shared";

function CarCard({ car, onChange, onRemove }: {
  car: CarPlan;
  onChange: (v: Partial<CarPlan>) => void;
  onRemove: () => void;
}) {
  const ages = purchaseAges(car);
  const terms = carLoanTerms(car);
  const perCar = car.payment === "cash" ? car.price : terms.total;
  return (
    <ItemCard onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_7rem_7rem]">
        <div className="col-span-2 sm:col-span-1">
          <TextField label="名前" value={car.label} onChange={(v) => onChange({ label: v })} />
        </div>
        <NumberField label="車両価格" unit="万円" step={10} min={0} value={car.price} onChange={(v) => onChange({ price: Math.max(0, v) })} />
        <NumberField label="買い替え周期" unit="年ごと" min={1} value={car.interval} onChange={(v) => onChange({ interval: Math.max(1, v) })} />
        <NumberField label="初回購入（本人）" unit="歳" value={car.startAge} onChange={(v) => onChange({ startAge: v })} />
        <NumberField label="最後に購入" unit="歳" min={car.startAge} value={car.endAge} onChange={(v) => onChange({ endAge: v })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Pills value={car.payment} onChange={(v) => onChange({ payment: v })}
          items={[["cash", "一括"], ["loan", "分割（ローン）"]]} />
        {car.payment === "loan" && (
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <NumberField label="支払期間" unit="年" min={1} max={10} value={car.loanYears}
              onChange={(v) => onChange({ loanYears: Math.max(1, v) })} />
            <NumberField label="ローン金利" unit="%" step={0.1} min={0} value={car.loanRate}
              onChange={(v) => onChange({ loanRate: Math.max(0, v) })} />
          </div>
        )}
      </div>

      <div className="mt-2 space-y-0.5 rounded-md bg-white p-2 text-[11px] text-slate-500">
        <div>
          購入: {ages.length ? `${ages.slice(0, 7).join("・")}${ages.length > 7 ? "…" : ""}歳（計${ages.length}台）` : "期間内に購入しません"}
        </div>
        {car.payment === "loan" && (
          <div className="tabular-nums">
            月々 <span className="font-semibold text-slate-700">{terms.monthly.toFixed(2)}万円</span> × {terms.months}回
            （総支払 {yen(terms.total)}・利息 {yen(terms.total - car.price)}）を毎月の支出に計上
            {car.loanYears > car.interval && <span className="block text-amber-600">返済期間が買い替え周期より長いため、前の車のローンと重複して支払う期間があります</span>}
          </div>
        )}
        <div>生涯の自動車購入費: <span className="font-semibold text-slate-700">{yen(perCar * ages.length)}円</span></div>
      </div>
    </ItemCard>
  );
}

export default function StepHousingCar({ input, setInput }: StepProps) {
  const patch = patcher(setInput);
  const { self, mortgage, cars } = input;
  const setCars = (fn: (c: CarPlan[]) => CarPlan[]) => setInput((p) => ({ ...p, cars: fn(p.cars) }));

  return (
    <div className="space-y-4">
      <MortgageSection mortgage={mortgage} currentAge={self.currentAge} onChange={(v) => patch("mortgage", v)} />

      <Card icon={Car} title="自動車の購入"
        note="台数分追加できます。分割払いの場合は元利均等で月々の返済額を計算し、支払期間中の支出に計上します（車両価格・返済額にはインフレ率を適用しません）。">
        {cars.length === 0 && <p className="text-sm text-slate-400">車は持たない設定です。</p>}
        {cars.map((car) => (
          <CarCard key={car.id} car={car}
            onChange={(v) => setCars((cs) => cs.map((x) => (x.id === car.id ? { ...x, ...v } : x)))}
            onRemove={() => setCars((cs) => cs.filter((x) => x.id !== car.id))} />
        ))}
        <AddButton
          onClick={() =>
            setCars((cs) => [
              ...cs,
              {
                id: uid(),
                label: `${cs.length + 1}台目`,
                price: 250,
                interval: 8,
                startAge: self.currentAge + 1,
                endAge: Math.min(75, input.basic.endAge),
                payment: "cash",
                loanYears: 5,
                loanRate: 2.5,
              },
            ])
          }>
          <Plus size={16} /> 車を追加
        </AddButton>
      </Card>
    </div>
  );
}
