import { DISTRICTS } from "@/data/districts";
import { INDICATOR_NAMES } from "@/data/indicators";
import { CRITICAL_THRESHOLD } from "@/lib/simulation/constants";
import { compareCandidateQuality } from "@/lib/optimizer/optimizer";
import type { StructuredObjective } from "@/lib/optimizer/types";
import type { DistrictId, IndicatorDelta, ScenarioCandidate, SimulationResult, ValidSimulationResult } from "@/types/domain";

export interface IndicatorEvidence extends IndicatorDelta { districtId: DistrictId }

export interface AlternativeComparison {
  alternative: string;
  assessment: "better" | "worse" | "equivalent";
  advantages: string[];
  tradeoffs: string[];
  budgetEfficiency: string;
}

export interface CurrentScenarioAnalysis {
  result: SimulationResult;
  strengths: string[];
  weaknesses: string[];
  remainingCriticalIndicators: IndicatorEvidence[];
  lowImprovementIndicators: IndicatorEvidence[];
  comparisons: AlternativeComparison[];
  summary: string;
}

const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
export const format = (value: number) => numberFormat.format(value);
export const signed = (value: number) => `${value > 0 ? "+" : ""}${format(value)}`;
export const districtName = (id: DistrictId) => DISTRICTS.find((district) => district.id === id)?.name ?? id;

function indicatorEvidence(result: ValidSimulationResult): IndicatorEvidence[] {
  return result.districts.flatMap((district) => district.indicators.map((indicator) => ({
    districtId: district.districtId, ...indicator,
  })));
}

function focusedIndicators(result: ValidSimulationResult, goal: StructuredObjective): IndicatorEvidence[] {
  return indicatorEvidence(result).filter((item) =>
    (!goal.districtId || item.districtId === goal.districtId)
    && (goal.focusIndicators.length === 0 || goal.focusIndicators.includes(item.indicator)));
}

function describeIndicator(item: IndicatorEvidence): string {
  return `${districtName(item.districtId)} — ${INDICATOR_NAMES[item.indicator]} (${item.indicator}): `
    + `${format(item.before)} → ${format(item.after)}, изменение ${signed(item.delta)}`;
}

export function describeResult(result: ValidSimulationResult, goal: StructuredObjective) {
  const focus = focusedIndicators(result, goal);
  const improved = [...focus].filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta);
  const unchanged = focus.filter((item) => item.delta <= 0);
  // "Почти не улучшились" is expressed as the smallest observed positive changes,
  // not a new threshold or an inferred effect formula.
  const lowImprovementIndicators = unchanged.length > 0
    ? unchanged
    : [...focus].sort((a, b) => a.delta - b.delta).slice(0, 3);
  const remainingCriticalIndicators = indicatorEvidence(result).filter((item) => item.after < CRITICAL_THRESHOLD);
  const score = `Общий Score: ${format(result.scoreBefore)} → ${format(result.scoreAfter)} `
    + `(изменение ${signed(result.scoreDelta)}).`;
  const critical = `Критические показатели: ${result.criticalBefore} → ${result.criticalAfter}.`;
  const budget = `Использует ${format(result.cost)} единиц бюджета; остаток — ${format(result.remainingBudget)}.`;
  const weakest = `Самый слабый район: ${districtName(result.weakestDistrict)}.`;
  const improvements = improved.length > 0
    ? `Улучшения по цели: ${improved.slice(0, 3).map(describeIndicator).join("; ")}.`
    : "В выбранном фокусе нет улучшившихся показателей.";
  const low = lowImprovementIndicators.length === 0 ? "Нет районных данных для оценки слабых мест."
    : `${unchanged.length ? "Не улучшились или снизились" : "Наименьшие улучшения по цели"}: `
      + `${lowImprovementIndicators.slice(0, 3).map(describeIndicator).join("; ")}.`;
  const remaining = result.criticalAfter === 0 ? "Оставшиеся критические показатели: отсутствуют."
    : `Оставшиеся критические показатели: ${remainingCriticalIndicators.map(describeIndicator).join("; ") || "см. результат симуляции"}.`;
  const target = goal.districtId ? result.districts.find((district) => district.districtId === goal.districtId) : undefined;
  const fit = goal.reduceCritical || goal.objective === "reduce_critical_indicators"
    ? result.criticalAfter === 0 ? "Цель устранения критических показателей достигнута."
      : "Цель устранения критических показателей пока не достигнута."
    : target ? `Результат выбранного района ${districtName(target.districtId)}: ${signed(target.scoreDelta)}.`
      : goal.objective === "balanced_development"
        ? `Для баланса важен результат слабейшего района. ${weakest}`
        : `Цель — рост общего качества жизни. ${score}`;
  const districtDeltas = `Изменения по районам: ${result.districts.map((district) =>
    `${districtName(district.districtId)} ${signed(district.scoreDelta)}`).join("; ") || "нет данных"}.`;
  return { score, critical, budget, weakest, improvements, low, remaining, fit, districtDeltas,
    remainingCriticalIndicators, lowImprovementIndicators };
}

export function compareWithCurrent(
  current: ValidSimulationResult,
  candidate: ScenarioCandidate,
  goal: StructuredObjective,
  index: number,
): AlternativeComparison {
  const next = candidate.result;
  const quality = compareCandidateQuality(candidate, { selections: [], result: current }, goal);
  const advantages: string[] = [];
  const tradeoffs: string[] = [];
  function compare(label: string, before: number, after: number, lowerIsBetter = false) {
    if (before === after) return;
    const text = `${label}: текущий план ${format(before)}, предложение ${format(after)}.`;
    (lowerIsBetter ? after < before : after > before) ? advantages.push(text) : tradeoffs.push(text);
  }
  compare("Общий Score", current.scoreAfter, next.scoreAfter);
  compare("Критические показатели", current.criticalAfter, next.criticalAfter, true);
  compare("Расход бюджета", current.cost, next.cost, true);
  for (const district of current.districts) {
    const proposed = next.districts.find((item) => item.districtId === district.districtId);
    if (proposed) compare(`Оценка района ${districtName(district.districtId)}`, district.scoreAfter, proposed.scoreAfter);
  }
  for (const item of focusedIndicators(current, goal)) {
    if (!goal.focusIndicators.includes(item.indicator)) continue;
    const proposed = next.districts.find((district) => district.districtId === item.districtId)
      ?.indicators.find((indicator) => indicator.indicator === item.indicator);
    if (proposed) compare(`${districtName(item.districtId)} — ${INDICATOR_NAMES[item.indicator]}`, item.after, proposed.after);
  }
  const budgetEfficiency = quality < 0 && next.cost <= current.cost
    ? `Предложение лучше по приоритетам цели и стоит не больше текущего плана: ${format(next.cost)} против ${format(current.cost)}. `
      + "Текущий расход можно использовать результативнее относительно этой цели."
    : quality < 0 && next.cost > current.cost
      ? `Лучший результат по цели требует большего бюджета: ${format(next.cost)} против ${format(current.cost)}.`
      : "Превосходство предложения по результату цели при не большем бюджете не установлено.";
  return { alternative: String.fromCharCode(65 + index), assessment: quality < 0 ? "better" : quality > 0 ? "worse" : "equivalent",
    advantages, tradeoffs, budgetEfficiency };
}

export function analyzeCurrentScenario(
  result: SimulationResult,
  goal: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): CurrentScenarioAnalysis {
  if (!result.valid) {
    return { result, strengths: [], weaknesses: result.validationErrors,
      remainingCriticalIndicators: [], lowImprovementIndicators: [], comparisons: [],
      summary: `Текущий план не прошёл проверку: ${result.validationErrors.join(" ")} Сравнение результатов недоступно.` };
  }
  const facts = describeResult(result, goal);
  const strengths = [facts.improvements];
  if (result.scoreDelta > 0) strengths.unshift(facts.score);
  if (result.criticalAfter < result.criticalBefore) strengths.push(facts.critical);
  const weaknesses = [facts.low];
  if (result.scoreDelta < 0) weaknesses.push(facts.score);
  if (result.criticalAfter > 0) weaknesses.push(facts.remaining);
  const comparisons = candidates.map((candidate, index) => compareWithCurrent(result, candidate, goal, index));
  return {
    result, strengths, weaknesses, comparisons,
    remainingCriticalIndicators: facts.remainingCriticalIndicators,
    lowImprovementIndicators: facts.lowImprovementIndicators,
    summary: ["Текущий план", `Сильные стороны: ${strengths.join(" ")}`, `Риски / слабые места: ${weaknesses.join(" ")}`,
      facts.remaining, facts.weakest, facts.score, facts.budget,
      "Эффективность расходов оценивается сравнением готовых сценариев; вклад каждой отдельной меры не установлен.",
    ].join("\n"),
  };
}
