import type { Person, SimulationInput } from "./types";

let seq = 0;
export const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

const self: Person = {
  enabled: true,
  currentAge: 35,
  employment: "employee",
  grossIncome: 700,
  raiseRate: 1.5,
  manualNet: false,
  netIncome: 530,
  retirementAge: 65,
  changes: [{ id: "wc-1", age: 60, type: "jobchange", grossIncome: 450 }],
  pensionStartAge: 65,
  pensionAuto: true,
  pension: 200,
};

const spouse: Person = {
  enabled: true,
  currentAge: 33,
  employment: "employee",
  grossIncome: 450,
  raiseRate: 1,
  manualNet: false,
  netIncome: 350,
  retirementAge: 60,
  changes: [{ id: "wc-2", age: 36, type: "parttime", grossIncome: 120 }],
  pensionStartAge: 65,
  pensionAuto: true,
  pension: 80,
};

export const DEFAULT_INPUT: SimulationInput = {
  basic: {
    endAge: 95,
    cashAssets: 300,
    investedAssets: 500,
  },
  self,
  spouse,
  expense: {
    livingCost: 420,
    inflationRate: 2,
  },
  children: [
    {
      id: "ch-1",
      name: "第一子",
      currentAge: 3,
      elementary: "public",
      juniorHigh: "public",
      highSchool: "public",
      university: "private",
      graduate: "none",
    },
  ],
  events: [
    { id: "ev-1", label: "車の買い替え", amount: 300, isRecurring: true, startAge: 40, endAge: 75, interval: 7 },
    { id: "ev-2", label: "家族旅行", amount: 80, isRecurring: false, startAge: 45, endAge: 45, interval: 1 },
    { id: "ev-3", label: "住宅リフォーム", amount: 500, isRecurring: false, startAge: 60, endAge: 60, interval: 1 },
  ],
  investment: {
    funds: [
      { id: "f-1", presetId: "acwi", ratio: 60 },
      { id: "f-2", presetId: "sp500", ratio: 30 },
      { id: "f-3", presetId: "gold", ratio: 10 },
    ],
    baseContribution: 120,
    rules: [
      { id: "r-1", fromAge: 50, toAge: 59, amount: 60 },
      { id: "r-2", fromAge: 65, toAge: 100, amount: 0 },
    ],
  },
};
