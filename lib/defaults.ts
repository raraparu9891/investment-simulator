import { householdFactor, presetItems } from "./living";
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
  promotions: [{ id: "pr-1", age: 42, mode: "increase", value: 100 }],
  severancePay: 0,
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
  promotions: [],
  severancePay: 0,
  pensionStartAge: 65,
  pensionAuto: true,
  pension: 80,
};

const children: SimulationInput["children"] = [
  {
    id: "ch-1",
    name: "第一子",
    currentAge: 3,
    preschool: "public",
    elementary: "public",
    juniorHigh: "public",
    highSchool: "public",
    university: "private",
    graduate: "none",
    examJuniorHigh: false,
    examHighSchool: true,
    examUniversity: true,
  },
];

export const DEFAULT_INPUT: SimulationInput = {
  basic: {
    endAge: 95,
    cashAssets: 300,
    investedAssets: 500,
  },
  self,
  spouse,
  expense: {
    items: presetItems("average", householdFactor({ spouse, children })),
    inflationRate: 2,
  },
  mortgage: {
    enabled: false,
    startAge: 35,
    balance: 3000,
    years: 30,
    rate: 0.6,
    rateChanges: [{ id: "rc-1", afterYears: 5, rate: 1.5 }],
  },
  cars: [
    {
      id: "car-1",
      label: "1台目",
      price: 300,
      interval: 7,
      startAge: 40,
      endAge: 75,
      payment: "cash",
      loanYears: 5,
      loanRate: 2.5,
    },
  ],
  children,
  events: [
    { id: "ev-2", label: "家族旅行", amount: 30, isRecurring: true, startAge: 35, endAge: 70, interval: 1 },
    { id: "ev-3", label: "住宅リフォーム", amount: 500, isRecurring: false, startAge: 60, endAge: 60, interval: 1 },
  ],
  investment: {
    assets: [
      { id: "as-1", name: "全世界株式", expectedReturn: 9, risk: 15 },
      { id: "as-2", name: "現預金（無リスク資産）", expectedReturn: 0, risk: 0 },
    ],
    currentWeights: { "as-1": 100 },
    contributionWeights: { "as-1": 100 },
    baseContribution: 120,
    minCashReserve: 300,
    rules: [
      { id: "r-1", fromAge: 50, toAge: 59, amount: 60 },
      { id: "r-2", fromAge: 65, toAge: 100, amount: 0 },
    ],
    rebalances: [
      {
        id: "rb-1",
        targetAge: 60,
        allocations: { "as-1": 60, "as-2": 40 },
      },
    ],
  },
};
