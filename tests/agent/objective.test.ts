import { describe, expect, it } from "vitest";
import { interpretObjectiveDeterministically, validateStructuredObjective } from "@/lib/agent/objective";

describe("objective interpretation", () => {
  it("extracts a district, social focus, and critical constraint", () => {
    expect(
      interpretObjectiveDeterministically(
        "Improve Nura and eliminate critical schools and clinics indicators",
      ),
    ).toEqual({
      objective: "improve_district",
      districtId: "nura",
      focusIndicators: ["S1", "S2"],
      reduceCritical: true,
    });
  });

  it("supports Russian district and objective wording", () => {
    expect(
      interpretObjectiveDeterministically("Улучшить район Нура и убрать критические школы"),
    ).toMatchObject({
      objective: "improve_district",
      districtId: "nura",
      focusIndicators: ["S1"],
      reduceCritical: true,
    });
  });

  it("rejects malformed or incomplete model output", () => {
    expect(
      validateStructuredObjective({
        objective: "improve_district",
        districtId: null,
        focusIndicators: [],
        reduceCritical: false,
      }),
    ).toBeNull();
    expect(validateStructuredObjective({ objective: "invented" })).toBeNull();
  });
});
