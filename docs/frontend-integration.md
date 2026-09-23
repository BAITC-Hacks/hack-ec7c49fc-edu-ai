# Frontend integration

The frontend is a presentation layer. It sends user input and renders engine/API results; it must not calculate scores, costs, effects, synergies, critical indicators, or optimizer ranking.

## Direct simulation

Import the public simulator and domain contracts:

```ts
import { simulateScenario } from "@/lib/simulation";
import type { ScenarioInput, SimulationResult } from "@/types/domain";
```

```ts
const input: ScenarioInput = {
  selections: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

const result: SimulationResult = simulateScenario(input);
```

A valid result has this shape (district indicators abbreviated here only):

```ts
{
  valid: true,
  validationErrors: [],
  cost: 95,
  remainingBudget: 5,
  scoreBefore: 52.55768,
  scoreAfter: 56.54307,
  scoreDelta: 3.98539,
  weakestDistrict: "nura",
  criticalBefore: 2,
  criticalAfter: 0,
  districts: [
    {
      districtId: "nura",
      scoreBefore: 49.18,
      scoreAfter: 52.9625,
      scoreDelta: 3.7825,
      indicators: [
        { indicator: "S1", before: 38, after: 48, delta: 10 }
      ]
    }
  ]
}
```

Always narrow on `result.valid`. An invalid result contains `validationErrors`; its after-state fields are `null`, `weakestDistrict` is `null`, and `districts` is empty.

## Advisor API

```ts
import type { AdvisorRequest, AdvisorResponse } from "@/lib/agent/advisor";

const payload: AdvisorRequest = {
  message: "Улучши Нуру и убери критические социальные показатели",
  currentScenario: input, // optional
};

const response = await fetch("/api/advisor", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const body = await response.json();
if (!response.ok) throw new Error(body.error ?? "Advisor request failed");
const advisor: AdvisorResponse = body;
```

The actual success contract is:

```ts
{
  interpretedGoal: StructuredObjective;
  trace: string[];
  candidates: ScenarioCandidate[];
  explanation: string;
}
```

The route returns `400` for invalid JSON/input and `500` for an unexpected advisor failure.

## UI states and field mapping

- Loading: disable duplicate submission and show that alternatives are being evaluated.
- Error: render the API `error` string for non-2xx responses; preserve the user's input for retry.
- Success: render `interpretedGoal`, `trace`, `candidates`, and `explanation`. An empty `candidates` array is a valid empty state.
- Score before/after: `result.scoreBefore`, `result.scoreAfter`.
- Score delta: `result.scoreDelta`.
- Budget: `result.cost`, `result.remainingBudget`.
- Weakest district: `result.weakestDistrict`.
- Critical indicators: `result.criticalBefore`, `result.criticalAfter`.
- District comparison: `result.districts[].scoreBefore`, `scoreAfter`, `scoreDelta`, and `indicators`.
- Top-3 AI scenarios: `advisor.candidates` in returned order; use each candidate's `selections`, `result`, and optional `reason`.
- System trace: `advisor.trace` (system actions only, not chain-of-thought).
- Grounded narrative: `advisor.explanation`.

Do not re-sort candidates or recompute any displayed number in the frontend. Formatting and rounding for display are safe; retain the returned raw values for comparisons.
