import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdvisorPost, POST } from "@/app/api/advisor/route";

describe("POST /api/advisor", () => {
  it("returns JSON 400 for invalid JSON", async () => {
    const response = await POST(new Request("http://localhost/api/advisor", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toEqual(expect.any(String));
  });

  it("returns a safe 500 without leaking exception details", async () => {
    const handler = createAdvisorPost(async () => { throw new Error("private provider details"); });
    const response = await handler(new Request("http://localhost/api/advisor", { method: "POST", body: JSON.stringify({ message: "Улучши Нуру" }) }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Advisor failed." });
  });
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects malformed currentScenario", async () => {
    const response = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({
          message: "Improve Nura",
          currentScenario: { selections: [{ measureId: 7, districtId: "unknown" }] },
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("uses the integrated simulation engine", async () => {
    const response = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({
          message: "Улучши Нуру и убери критические социальные показатели",
          currentScenario: { selections: [
            { measureId: "M7", districtId: "nura" }, { measureId: "M8", districtId: "nura" },
            { measureId: "M10", districtId: "nura" }, { measureId: "M12" }, { measureId: "M5", districtId: "saryarka" },
          ] },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      interpretedGoal: {
        objective: "improve_district",
        districtId: "nura",
        focusIndicators: ["S1", "S2"],
        reduceCritical: true,
      },
      candidates: expect.any(Array),
      currentScenarioAnalysis: {
        result: { valid: true, cost: 95, remainingBudget: 5, criticalAfter: 0 },
        comparisons: expect.any(Array),
        summary: expect.stringContaining("Сильные стороны"),
      },
      explanation: expect.any(String),
    });
  }, 30_000);

  it("preserves the frontend response contract", async () => {
    const expected = {
      interpretedGoal: {
        objective: "maximize_city_score" as const,
        focusIndicators: [],
        reduceCritical: false,
      },
      trace: ["Analyzed city baseline", "Selected 0 alternatives"],
      candidates: [],
      explanation: "No valid scenario was found.",
    };
    const handler = createAdvisorPost(async () => expected);
    const response = await handler(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({ message: "Maximize the city score" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expected);
  });
});
