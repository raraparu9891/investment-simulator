// 金額はすべて「万円」単位、率は「%」単位で保持する

export type SchoolType = "public" | "private";
export type UniversityType = "public" | "private" | "none";

export interface BasicSettings {
  endAge: number;
  cashAssets: number; // 現預金
  investedAssets: number; // 運用中の資産（現在のポートフォリオで運用）
}

export type Employment = "employee" | "self";
export type WorkChangeType = "jobchange" | "parttime" | "retire";

export interface WorkChange {
  id: string;
  age: number; // その人自身の年齢
  type: WorkChangeType;
  grossIncome: number; // 変更後の額面年収（retire では未使用）
}

/** 昇進: その年齢で額面年収がジャンプし、以後は昇給率で伸びる */
export interface Promotion {
  id: string;
  age: number;
  mode: "amount" | "increase"; // 昇進後の額面年収を指定 / 増加額を指定
  value: number;
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
  promotions: Promotion[];
  pensionStartAge: number;
  pensionAuto: boolean;
  pension: number; // pensionAuto=false 時の年金額（年）
}

export interface ExpenseSettings {
  livingCost: number;
  inflationRate: number;
}

/** 変動金利: 現在から afterYears 年後に金利が rate% になる */
export interface RateChange {
  id: string;
  afterYears: number;
  rate: number;
}

export interface MortgageSettings {
  enabled: boolean;
  balance: number; // 借入残高
  years: number; // 残り返済期間
  rate: number; // 現在の金利（%/年）
  rateChanges: RateChange[];
}

export interface Child {
  id: string;
  name: string;
  currentAge: number;
  preschool: SchoolType; // 幼稚園・保育園（3〜5歳）
  elementary: SchoolType;
  juniorHigh: SchoolType;
  highSchool: SchoolType;
  university: UniversityType;
  graduate: UniversityType; // 大学院（大学に進学しない場合は無視）
  examJuniorHigh: boolean; // 中学受験する
  examHighSchool: boolean; // 高校受験する
  examUniversity: boolean; // 大学受験する
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

export interface Allocation {
  id: string;
  fundId: string; // FUND_PRESETS の id
  percentage: number;
}

/** targetAge（本人）に全運用資産を allocations の割合へ再配分し、以後の積立もこの配分にする */
export interface RebalanceEvent {
  id: string;
  targetAge: number;
  allocations: Allocation[];
}

export interface InvestmentSettings {
  currentFunds: Fund[]; // 現在のポートフォリオ（運用中の資産の配分）
  contributionFunds: Fund[]; // これからの積立の配分
  baseContribution: number;
  rules: ContributionRule[];
  rebalances: RebalanceEvent[];
}

export interface SimulationInput {
  basic: BasicSettings;
  self: Person;
  spouse: Person;
  expense: ExpenseSettings;
  mortgage: MortgageSettings;
  children: Child[];
  events: SpotEvent[];
  investment: InvestmentSettings;
}

export type EventKind = "retire" | "work" | "pension" | "school" | "spot" | "loan" | "rebalance";
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
  educationCost: number; // 学費＋塾・予備校・受験料
  loanPayment: number; // 住宅ローン年間返済額
  loanBalance: number; // 年末のローン残高
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
  investedCurrent: number; // 現在のポートフォリオ分
  investedNew: number; // 新規積立分
  invested: number;
  totalAssets: number;
  // その年に適用しているポートフォリオ（リバランスで切り替わる）
  portfolioLabel: string; // "初期設定" / "60歳〜" など
  rebalanced: boolean; // この年の期首にリバランスを実行した
  returnCurrent: number; // 期待リターン（%）: 既存資産
  returnNew: number; // 期待リターン（%）: 積立分
  riskCurrent: number; // リスク σ（%）
  riskNew: number;
  // 固定リターン（期待リターンのみで複利運用）の総資産。totalAssets と同値で、グラフの基準線用
  fixedReturnAssets: number;
  // モンテカルロの総資産（±2σ はパーセンタイル換算: 上位/下位 約2.3%）
  mcMedian: number;
  mcPlus2Sigma: number;
  mcMinus2Sigma: number;
}

export interface PortfolioStats {
  expectedReturn: number;
  risk: number;
  ratioTotal: number;
}

export interface SimulationSummary {
  current: PortfolioStats;
  contribution: PortfolioStats;
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
