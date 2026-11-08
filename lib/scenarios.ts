import { DEFAULT_INPUT } from "./defaults";
import { householdFactor, migrateLivingItems, syncLivingPresets } from "./living";
import type { Asset, Child, ExpenseSettings, InvestmentSettings, Person, SimulationInput, SpotEvent, Weights } from "./types";

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

// 旧バージョン（固定ファンド選択式）の指数定義。古いシナリオの移行にだけ使う
const LEGACY_PRESETS: Record<string, [string, number, number]> = {
  acwi: ["全世界株式", 9, 15],
  sp500: ["S&P500", 12, 17],
  nasdaq100: ["NASDAQ-100", 19, 21],
  qld: ["QLD（NASDAQ-100 2倍）", 29, 42],
  fangplus: ["FANG+", 15, 25],
  gold: ["ゴールド", 5, 15],
  cash: ["現預金（無リスク資産）", 0, 0],
};

type LegacyFund = { presetId: string; ratio: number };
type LegacyInvestment = Partial<InvestmentSettings> & {
  funds?: LegacyFund[];
  currentFunds?: LegacyFund[];
  contributionFunds?: LegacyFund[];
  rebalances?: { id: string; targetAge: number; allocations: Weights | { fundId: string; percentage: number }[] }[];
};

function normalizeInvestment(raw: LegacyInvestment | undefined): InvestmentSettings {
  const d = DEFAULT_INPUT.investment;
  if (!raw) return d;
  if (Array.isArray(raw.assets)) {
    return {
      ...d,
      ...raw,
      // 未設定の古いシナリオは従来どおり（現預金 0 円まで積立）の結果を再現する
      minCashReserve: raw.minCashReserve ?? 0,
      rebalances: (raw.rebalances ?? []) as InvestmentSettings["rebalances"],
    } as InvestmentSettings;
  }
  // 旧形式: 指数 id ごとに投資対象を作り、配分を割合マップへ変換する
  const assets: Asset[] = [];
  const assetOf = (presetId: string) => {
    const id = `legacy-${presetId}`;
    if (!assets.some((a) => a.id === id)) {
      const [name, expectedReturn, risk] = LEGACY_PRESETS[presetId] ?? [presetId, 0, 0];
      assets.push({ id, name, expectedReturn, risk });
    }
    return id;
  };
  const toWeights = (list: { presetId: string; ratio: number }[] | undefined): Weights => {
    const w: Weights = {};
    for (const f of list ?? []) w[assetOf(f.presetId)] = (w[assetOf(f.presetId)] ?? 0) + f.ratio;
    return w;
  };
  const currentWeights = toWeights(raw.currentFunds ?? raw.funds);
  const contributionWeights = toWeights(raw.contributionFunds ?? raw.funds);
  const rebalances = (raw.rebalances ?? []).map((rb) => ({
    id: rb.id,
    targetAge: rb.targetAge,
    allocations: Array.isArray(rb.allocations)
      ? toWeights(rb.allocations.map((a) => ({ presetId: a.fundId, ratio: a.percentage })))
      : rb.allocations,
  }));
  return {
    assets: assets.length ? assets : d.assets,
    currentWeights,
    contributionWeights,
    baseContribution: raw.baseContribution ?? d.baseContribution,
    minCashReserve: raw.minCashReserve ?? 0,
    rules: raw.rules ?? d.rules,
    rebalances,
  };
}

// 退職金は旧バージョンに無いので、既定値ではなく 0 で補う
const mergePerson = (p: Partial<Person> | undefined, d: Person): Person => ({ ...d, severancePay: 0, ...p });

/** 旧形式（年間生活費1項目）は「以前の設定」1行に移す */
function normalizeExpense(raw: (Partial<ExpenseSettings> & { livingCost?: number }) | undefined, factor: number): ExpenseSettings {
  const d = DEFAULT_INPUT.expense;
  if (!raw) return d;
  if (Array.isArray(raw.items)) return { ...d, ...raw, items: migrateLivingItems(raw.items, factor) };
  return {
    inflationRate: raw.inflationRate ?? d.inflationRate,
    items: [{ id: "lv-legacy", key: "custom", label: "生活費（以前の設定）", monthly: (raw.livingCost ?? 0) / 12, preset: null }],
  };
}

/**
 * 古いバージョンで保存したシナリオでも読み込めるよう、欠けている項目を既定値で補う。
 */
export function normalizeInput(raw: Partial<SimulationInput>): SimulationInput {
  const d = DEFAULT_INPUT;
  // 既定値のリバランス例は古いシナリオに混ぜない（normalizeInvestment 内で [] を補う）
  const inv = normalizeInvestment(raw.investment as LegacyInvestment | undefined);
  const spouse = mergePerson(raw.spouse, d.spouse);
  const children = (raw.children ?? d.children).map((c) => ({ ...CHILD_FILL, ...c }));
  // プリセット選択中の生活費は、保存時の金額ではなく現在の世帯構成に基づく目安額に揃える
  return syncLivingPresets({
    basic: { ...d.basic, ...raw.basic },
    self: mergePerson(raw.self, d.self),
    spouse,
    expense: normalizeExpense(raw.expense, householdFactor({ spouse, children })),
    mortgage: { ...d.mortgage, enabled: false, startAge: raw.self?.currentAge ?? d.self.currentAge, ...raw.mortgage },
    // 旧バージョンでは車はスポット支出として入力されているので、既定の車は足さない
    cars: raw.cars ?? [],
    children,
    events: (raw.events ?? d.events).map((e) => {
      const { age, ...rest } = e as SpotEvent & { age?: number };
      const start = rest.startAge ?? age ?? d.self.currentAge;
      const fill: Omit<SpotEvent, "id" | "label" | "amount"> = { isRecurring: false, startAge: start, endAge: start, interval: 1 };
      return { ...fill, ...rest, startAge: start };
    }),
    investment: inv,
  });
}
