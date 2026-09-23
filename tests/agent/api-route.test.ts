import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdvisorPost, POST } from "@/app/api/advisor/route";

describe("POST /api/advisor", () => {
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

  it("returns a clear temporary status while the simulation stub is active", async () => {
    const response = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({
          message: "Улучши Нуру и убери критические социальные показатели",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Simulation engine is not available yet.",
    });
  });

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
