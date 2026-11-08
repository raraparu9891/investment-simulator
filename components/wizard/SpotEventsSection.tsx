"use client";

import { Plus, Repeat, ShoppingCart } from "lucide-react";
import { uid } from "@/lib/defaults";
import { occurrenceAges } from "@/lib/spot";
import type { SpotEvent } from "@/lib/types";
import { AddButton, ItemCard, NumberField, TextField } from "../ui";
import { Badge, Card, Pills, type StepProps } from "./shared";

function SpotCard({ ev, onChange, onRemove }: {
  ev: SpotEvent; onChange: (v: Partial<SpotEvent>) => void; onRemove: () => void;
}) {
  const ages = occurrenceAges(ev);
  const mode = (recurring: boolean) =>
    onChange(recurring
      ? { isRecurring: true, endAge: Math.max(ev.endAge, ev.startAge + 10), interval: Math.max(1, ev.interval) }
      : { isRecurring: false });
  return (
    <ItemCard onRemove={onRemove}>
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <TextField label="内容" value={ev.label} onChange={(v) => onChange({ label: v })} />
        <NumberField label="金額（1回）" unit="万円" step={10} value={ev.amount} onChange={(v) => onChange({ amount: v })} />
      </div>
      <div className="mt-2">
        <Pills value={ev.isRecurring} onChange={mode}
          items={[[false, "単発"], [true, <><Repeat size={12} /> 繰り返し</>]]} />
      </div>
      {ev.isRecurring ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField label="開始" unit="歳" value={ev.startAge} onChange={(v) => onChange({ startAge: v })} />
            <NumberField label="終了" unit="歳" value={ev.endAge} min={ev.startAge} onChange={(v) => onChange({ endAge: v })} />
            <NumberField label="周期" unit="年ごと" min={1} value={ev.interval} onChange={(v) => onChange({ interval: Math.max(1, v) })} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {ages.length > 0
              ? `${ages.slice(0, 6).join("・")}${ages.length > 6 ? "…" : ""}歳（計${ages.length}回・合計${(ages.length * ev.amount).toLocaleString()}万円）`
              : "期間内に発生しません（開始・終了年齢を確認してください）"}
          </p>
        </>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <NumberField label="年齢（本人）" unit="歳" value={ev.startAge} onChange={(v) => onChange({ startAge: v, endAge: v })} />
        </div>
      )}
    </ItemCard>
  );
}

/** 繰り返しの特別費と単発の特別支出（ステップ4） */
export default function SpotEventsSection({ input, setInput }: StepProps) {
  const { self, events } = input;
  const updateEvent = (id: string, v: Partial<SpotEvent>) =>
    setInput((p) => ({ ...p, events: p.events.map((x) => (x.id === id ? { ...x, ...v } : x)) }));
  const removeEvent = (id: string) => setInput((p) => ({ ...p, events: p.events.filter((x) => x.id !== id) }));
  const addEvent = (recurring: boolean) =>
    setInput((p) => ({
      ...p,
      events: [
        ...p.events,
        recurring
          ? { id: uid(), label: "家電の買い替え", amount: 30, isRecurring: true, startAge: p.self.currentAge, endAge: Math.min(80, p.basic.endAge), interval: 5 }
          : { id: uid(), label: "新しい支出", amount: 100, isRecurring: false, startAge: p.self.currentAge + 5, endAge: p.self.currentAge + 5, interval: 5 },
      ],
    }));
  const recurring = events.filter((e) => e.isRecurring).sort((a, b) => a.startAge - b.startAge);
  const single = events.filter((e) => !e.isRecurring).sort((a, b) => a.startAge - b.startAge);

  return (
    <>
      <Card icon={Repeat} title="繰り返しの特別費" badge={<Badge>{recurring.length}件</Badge>}
        note="「5年ごとに海外旅行 100万円」「8年ごとに家電の買い替え」など、数年ごとに発生する支出。毎年の旅行・帰省はステップ3の「旅行費用」で計上します。">
        {recurring.map((ev) => (
          <SpotCard key={ev.id} ev={ev} onChange={(v) => updateEvent(ev.id, v)} onRemove={() => removeEvent(ev.id)} />
        ))}
        <AddButton onClick={() => addEvent(true)}><Plus size={16} /> 繰り返しの特別費を追加</AddButton>
      </Card>

      <Card icon={ShoppingCart} title="単発の特別支出" badge={<Badge>{single.length}件</Badge>}
        note={`結婚式・リフォーム・援助など、一度きりの大きな支出（年齢は本人。現在 ${self.currentAge}歳）。`}>
        {single.map((ev) => (
          <SpotCard key={ev.id} ev={ev} onChange={(v) => updateEvent(ev.id, v)} onRemove={() => removeEvent(ev.id)} />
        ))}
        <AddButton onClick={() => addEvent(false)}><Plus size={16} /> 特別支出を追加</AddButton>
      </Card>
    </>
  );
}
