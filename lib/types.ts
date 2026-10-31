// 金額はすべて「万円」単位、率は「%」単位で保持する

export type SchoolType = "public" | "private";
export type UniversityType = "public" | "private" | "none";

export interface BasicSettings {
  endAge: number;
  cashAssets: number; // 現預金
  investedAssets: number; // 運用中の資産
}

export type Employment = "employee" | "self";
export type WorkChangeType = "jobchange" | "parttime" | "retire";

export interface WorkChange {
  id: string;
  age: number; // その人自身の年齢
  type: WorkChangeType;
  grossIncome: number; // 変更後の額面年収（retire では未使用）
}

/** 本人・配偶者で共通の就労・年金設定 */
export interface Person {
  enabled: boolean;
  currentAge: number;
  employment: Employment;
  grossIncome: number; // 額面年収
  raiseRate: number;
  manualNet: boolean; // 手取りを手動で入力する
  netIncome: number; // manualNet 時の手取り年収
  retirementAge: number;
  changes: WorkChange[];
  pensionStartAge: number;
  pensionAuto: boolean;
  pension: number; // pensionAuto=false 時の年金額（年）
}

export interface ExpenseSettings {
  livingCost: number;
  inflationRate: number;
}

export interface Child {
  id: string;
  name: string;
  currentAge: number;
  elementary: SchoolType;
  juniorHigh: SchoolType;
  highSchool: SchoolType;
  university: UniversityType;
  graduate: UniversityType; // 大学院（大学に進学しない場合は無視）
}

export interface SpotEvent {
  id: string;
  label: string;
  amount: number;
  isRecurring: boolean; // false: 単発 / true: 繰り返し
  startAge: number; // 本人の年齢（単発の場合は発生年齢）
  endAge: number; // 繰り返しの最終年齢（単発では未使用）
  interval: number; // 何年ごとか（単発では未使用）
}

export interface Fund {
  id: string;
  presetId: string;
  ratio: number;
}

export interface ContributionRule {
  id: string;
  fromAge: number;
  toAge: number;
  amount: number;
}

export interface InvestmentSettings {
  funds: Fund[];
  baseContribution: number;
  rules: ContributionRule[];
}

export interface SimulationInput {
  basic: BasicSettings;
  self: Person;
  spouse: Person;
  expense: ExpenseSettings;
  children: Child[];
  events: SpotEvent[];
  investment: InvestmentSettings;
}

export type EventKind = "retire" | "work" | "pension" | "school" | "spot";
export interface LifeEvent {
  kind: EventKind;
  text: string;
}

/** 運用に依存しない、その年の収支スケジュール */
export interface YearCashflow {
  age: number;
  spouseAge: number | null;
  selfIncome: number; // 手取り＋年金
  spouseIncome: number;
  totalIncome: number;
  livingCost: number;
  educationCost: number;
  spotCost: number;
  totalExpense: number;
  netCashflow: number;
  plannedContribution: number;
  events: LifeEvent[];
}

export interface YearResult extends YearCashflow {
  contribution: number; // 実際の積立額（マイナスは取り崩し）
  investmentReturn: number;
  cash: number;
  invested: number;
  totalAssets: number;
  // 固定リターン（期待リターンのみで複利運用）の総資産。totalAssets と同値で、グラフの基準線用
  fixedReturnAssets: number;
  // モンテカルロの総資産（±2σ はパーセンタイル換算: 上位/下位 約2.3%）
  mcMedian: number;
  mcPlus2Sigma: number;
  mcMinus2Sigma: number;
}

export interface SimulationSummary {
  expectedReturn: number;
  portfolioRisk: number;
  ratioTotal: number;
  assetsAtRetirement: number;
  finalAssets: number;
  minAssets: number;
  minAssetsAge: number;
  depletionAge: number | null; // 総資産がマイナスになる最初の年齢（期待値シナリオ）
  trials: number;
  successRate: number; // 最後まで資産が尽きなかった試行の割合 (0-1)
  finalMedian: number;
  finalPlus2Sigma: number;
  finalMinus2Sigma: number;
}
