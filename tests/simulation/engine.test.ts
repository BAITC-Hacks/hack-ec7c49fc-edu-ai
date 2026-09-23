import { describe, expect, it } from "vitest";

import {
  applyIndicatorDeltas,
  applyMeasures,
  applySynergies,
  createBaselineState,
  createZeroState,
  DISTRICTS,
  simulateScenario,
} from "../../src/lib/simulation";
import type { ScenarioInput } from "../../src/lib/simulation";

const referenceScenario: ScenarioInput = {
  selections: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

describe("simulation engine", () => {
  it("matches the full reference scenario", () => {
    const result = simulateScenario(referenceScenario);
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.cost).toBe(95);
    expect(result.remainingBudget).toBe(5);
    expect(result.scoreBefore).toBeCloseTo(52.55768, 8);
    expect(result.scoreAfter).toBeCloseTo(56.54307, 8);
    expect(result.scoreDelta).toBeCloseTo(3.98539, 8);
    expect(result.criticalBefore).toBe(2);
    expect(result.criticalAfter).toBe(0);
    expect(result.weakestDistrict).toBe("nura");

    const districtScores = Object.fromEntries(
      result.districts.map((district) => [district.districtId, district.scoreAfter]),
    );
    expect(districtScores.esil).toBeCloseTo(63.4275, 8);
    expect(districtScores.almaty).toBeCloseTo(57.4975, 8);
    expect(districtScores.saryarka).toBeCloseTo(56.3, 8);
    expect(districtScores.baikonur).toBeCloseTo(57.0675, 8);
    expect(districtScores.nura).toBeCloseTo(52.9625, 8);

    const nura = result.districts.find((district) => district.districtId === "nura");
    const values = Object.fromEntries(
      nura?.indicators.map((indicator) => [indicator.indicator, indicator.after]) ?? [],
    );
    expect(values.S1).toBeCloseTo(48, 8);
    expect(values.S2).toBeCloseTo(43.75, 8);
    expect(values.B1).toBeCloseTo(67.5, 8);
    expect(values.B2).toBeCloseTo(51.75, 8);
    expect(values.C2).toBeCloseTo(54.375, 8);
  });

  it("scales positive and negative effects by lag", () => {
    const deltas = applyMeasures(createZeroState(), [
      { measureId: "M7", districtId: "nura" },
      { measureId: "M11", districtId: "nura" },
    ]);
    expect(deltas.nura.S1).toBe(10);
    expect(deltas.nura.T1).toBe(-1.75);
  });

  it("limits district effects to one district and applies city effects to all five", () => {
    const deltas = applyMeasures(createZeroState(), [
      { measureId: "M7", districtId: "nura" },
      { measureId: "M12" },
    ]);

    expect(deltas.nura.S1).toBe(10);
    expect(deltas.esil.S1).toBe(0);
    for (const districtId of ["esil", "almaty", "saryarka", "baikonur", "nura"] as const) {
      expect(deltas[districtId].C2).toBe(4.375);
    }
  });

  it("applies all synergies once without lag scaling", () => {
    const selections = [
      { measureId: "M1", districtId: "esil" as const },
      { measureId: "M2" },
      { measureId: "M10", districtId: "nura" as const },
      { measureId: "M12" },
      { measureId: "M5", districtId: "saryarka" as const },
      { measureId: "M6" },
      { measureId: "M10", districtId: "nura" as const },
    ];
    const deltas = applySynergies(createZeroState(), selections);

    expect(deltas.esil.T1).toBe(2);
    expect(deltas.nura.B1).toBe(2);
    expect(deltas.saryarka.E2).toBe(2);
  });

  it("clips once after all positive and negative deltas are summed", () => {
    const initial = createZeroState();
    initial.esil.T1 = 99;
    const deltas = applyMeasures(createZeroState(), [
      { measureId: "M1", districtId: "esil" },
      { measureId: "M11", districtId: "esil" },
    ]);
    const result = applyIndicatorDeltas(initial, deltas);

    expect(deltas.esil.T1).toBe(2.75);
    expect(result.esil.T1).toBe(100);

    deltas.esil.T2 = -200;
    expect(applyIndicatorDeltas(initial, deltas).esil.T2).toBe(0);
  });

  it("is deterministic, order-independent and does not mutate inputs or data", () => {
    const inputSnapshot = structuredClone(referenceScenario);
    const dataSnapshot = structuredClone(DISTRICTS);
    const first = simulateScenario(referenceScenario);
    const second = simulateScenario({
      selections: [...referenceScenario.selections].reverse(),
    });
    const third = simulateScenario(referenceScenario);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(referenceScenario).toEqual(inputSnapshot);
    expect(DISTRICTS).toEqual(dataSnapshot);
    expect(createBaselineState()).toEqual(createBaselineState());
  });

  it("does not apply effects for invalid scenarios", () => {
    const result = simulateScenario({ selections: [] });
    expect(result.valid).toBe(false);
    if (result.valid) return;

    expect(result.cost).toBe(0);
    expect(result.remainingBudget).toBe(100);
    expect(result.scoreBefore).toBeCloseTo(52.55768, 8);
    expect(result.scoreAfter).toBeNull();
    expect(result.scoreDelta).toBeNull();
    expect(result.criticalAfter).toBeNull();
    expect(result.districts).toEqual([]);
  });

  it("returns null cost when an unknown ID makes it indeterminable", () => {
    const result = simulateScenario({
      selections: [
        { measureId: "M7", districtId: "nura" },
        { measureId: "M8", districtId: "nura" },
        { measureId: "M10", districtId: "nura" },
        { measureId: "M12" },
        { measureId: "M404" },
      ],
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.cost).toBeNull();
    expect(result.remainingBudget).toBeNull();
  });

  it("keeps a negative remaining budget as a diagnostic value", () => {
    const result = simulateScenario({
      selections: [
        { measureId: "M3", districtId: "esil" },
        { measureId: "M5", districtId: "saryarka" },
        { measureId: "M7", districtId: "nura" },
        { measureId: "M10", districtId: "almaty" },
        { measureId: "M14" },
      ],
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.cost).toBe(107);
    expect(result.remainingBudget).toBe(-7);
  });
});
