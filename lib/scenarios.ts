import { DEFAULT_INPUT } from "./defaults";
import type { Child, Person, SimulationInput, SpotEvent } from "./types";

const STORAGE_KEY = "lifeplan-simulator.scenarios.v1";

export interface SavedScenario {
  name: string;
  savedAt: string; // ISO 8601
  input: SimulationInput;
}

export function listScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => s && typeof s.name === "string" && s.input) : [];
  } catch {
    return [];
  }
}

function write(list: SavedScenario[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** 同名のシナリオは上書きする。保存できなかった場合は false */
export function saveScenario(name: string, input: SimulationInput) {
  const list = listScenarios().filter((s) => s.name !== name);
  return write([{ name, savedAt: new Date().toISOString(), input }, ...list]);
}

export function deleteScenario(name: string) {
  return write(listScenarios().filter((s) => s.name !== name));
}

const CHILD_FILL: Pick<Child, "preschool" | "examJuniorHigh" | "examHighSchool" | "examUniversity"> = {
  preschool: "public",
  examJuniorHigh: false,
  examHighSchool: false,
  examUniversity: false,
};

const mergePerson = (p: Partial<Person> | undefined, d: Person): Person => ({ ...d, ...p });

/**
 * 古いバージョンで保存したシナリオでも読み込めるよう、欠けている項目を既定値で補う。
 */
export function normalizeInput(raw: Partial<SimulationInput>): SimulationInput {
  const d = DEFAULT_INPUT;
  const inv = { ...d.investment, ...raw.investment } as SimulationInput["investment"] & { funds?: SimulationInput["investment"]["currentFunds"] };
  // 旧形式（funds 1本）は現在・積立の両方に同じ配分を使う
  if (inv.funds && !raw.investment?.currentFunds) inv.currentFunds = inv.funds;
  if (inv.funds && !raw.investment?.contributionFunds) inv.contributionFunds = inv.funds;
  delete inv.funds;
  return {
    basic: { ...d.basic, ...raw.basic },
    self: mergePerson(raw.self, d.self),
    spouse: mergePerson(raw.spouse, d.spouse),
    expense: { ...d.expense, ...raw.expense },
    mortgage: { ...d.mortgage, enabled: false, ...raw.mortgage },
    children: (raw.children ?? d.children).map((c) => ({ ...CHILD_FILL, ...c })),
    events: (raw.events ?? d.events).map((e) => {
      const { age, ...rest } = e as SpotEvent & { age?: number };
      const start = rest.startAge ?? age ?? d.self.currentAge;
      const fill: Omit<SpotEvent, "id" | "label" | "amount"> = { isRecurring: false, startAge: start, endAge: start, interval: 1 };
      return { ...fill, ...rest, startAge: start };
    }),
    investment: inv,
  };
}
