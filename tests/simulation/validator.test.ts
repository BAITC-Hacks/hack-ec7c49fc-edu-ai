import { describe, expect, it } from "vitest";

import {
  calculateScenarioCost,
  validateScenario,
} from "../../src/lib/simulation";
import type { ScenarioInput } from "../../src/lib/simulation";

const exactBudget: ScenarioInput = {
  selections: [
    { measureId: "M1", districtId: "esil" },
    { measureId: "M2" },
    { measureId: "M4", districtId: "almaty" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

function errors(input: unknown): string {
  return validateScenario(input).errors.join(" ");
}

describe("scenario validation", () => {
  it("accepts a valid scenario costing exactly 100", () => {
    expect(calculateScenarioCost(exactBudget)).toBe(100);
    expect(validateScenario(exactBudget)).toEqual({ valid: true, errors: [] });
  });

  it("rejects budget overflow and reports a diagnostic negative remainder later", () => {
    const input: ScenarioInput = {
      selections: [
        { measureId: "M3", districtId: "esil" },
        { measureId: "M5", districtId: "saryarka" },
        { measureId: "M7", districtId: "nura" },
        { measureId: "M10", districtId: "almaty" },
        { measureId: "M14" },
      ],
    };
    expect(calculateScenarioCost(input)).toBe(107);
    expect(errors(input)).toContain("Бюджет превышен");
  });

  it.each([
    { selections: [] },
    { selections: exactBudget.selections.slice(0, 4) },
    { selections: [...exactBudget.selections, { measureId: "M14" }] },
  ])("requires exactly five selections", (input) => {
    expect(errors(input)).toContain("ровно 5 мер");
  });

  it("rejects duplicate measure IDs even for different districts", () => {
    const input = {
      selections: [
        { measureId: "M1", districtId: "esil" },
        { measureId: "M1", districtId: "nura" },
        { measureId: "M4", districtId: "almaty" },
        { measureId: "M8", districtId: "nura" },
        { measureId: "M12" },
      ],
    };
    expect(errors(input)).toContain("Мера M1 выбрана более одного раза");
  });

  it("rejects unknown measures and cannot guess their cost", () => {
    const input = {
      selections: [
        ...exactBudget.selections.slice(0, 4),
        { measureId: "M404", districtId: "nura" },
      ],
    };
    expect(errors(input)).toContain("Неизвестная мера: M404");
    expect(calculateScenarioCost(input)).toBeNull();
  });

  it("checks district and city targeting", () => {
    expect(errors({ ...exactBudget, selections: [{ measureId: "M1" }, ...exactBudget.selections.slice(1)] })).toContain("нужно указать существующий район");
    expect(errors({ ...exactBudget, selections: [{ measureId: "M1", districtId: "unknown" }, ...exactBudget.selections.slice(1)] })).toContain("нужно указать существующий район");
    expect(errors({ ...exactBudget, selections: [exactBudget.selections[0], { measureId: "M2", districtId: "esil" }, ...exactBudget.selections.slice(2)] })).toContain("район указывать нельзя");
  });

  it("rejects more than two measures from one direction", () => {
    const input = {
      selections: [
        { measureId: "M1", districtId: "esil" },
        { measureId: "M2" },
        { measureId: "M3", districtId: "nura" },
        { measureId: "M9", districtId: "almaty" },
        { measureId: "M12" },
      ],
    };
    expect(errors(input)).toContain("более 2 мер направления transport");
  });

  it("applies the global M1/M3 conflict in any districts", () => {
    for (const districts of [["esil", "esil"], ["esil", "nura"]] as const) {
      const input = {
        selections: [
          { measureId: "M1", districtId: districts[0] },
          { measureId: "M3", districtId: districts[1] },
          { measureId: "M9", districtId: "almaty" },
          { measureId: "M10", districtId: "almaty" },
          { measureId: "M12" },
        ],
      };
      expect(errors(input)).toContain("Меры M1 и M3 несовместимы");
    }
  });

  it.each([
    ["M4", "M7"],
    ["M5", "M13"],
  ])("rejects %s/%s only in the same district", (first, second) => {
    const base = [
      { measureId: "M1", districtId: "almaty" },
      { measureId: "M9", districtId: "almaty" },
      { measureId: "M10", districtId: "almaty" },
    ];
    const same = { selections: [{ measureId: first, districtId: "nura" }, { measureId: second, districtId: "nura" }, ...base] };
    const different = { selections: [{ measureId: first, districtId: "nura" }, { measureId: second, districtId: "esil" }, ...base] };

    expect(errors(same)).toContain("в одном районе");
    expect(validateScenario(different).valid).toBe(true);
  });

  it.each([
    null,
    {},
    { selections: null },
    { selections: "not-an-array" },
    { selections: [null, 1, {}, { measureId: null }, []] },
  ])("returns Russian validation errors instead of throwing for malformed input", (input) => {
    expect(() => validateScenario(input)).not.toThrow();
    const result = validateScenario(input);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
