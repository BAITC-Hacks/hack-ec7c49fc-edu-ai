# Advisor API

`POST /api/advisor`

```json
{
  "message": "Improve Nura and eliminate critical social indicators",
  "currentScenario": { "selections": [] }
}
```

The response contains `interpretedGoal`, a concise `trace`, up to three deterministic
`candidates`, and an evidence-grounded `explanation`. OpenAI is used only to extract
structured intent and explain calculated results. Scenario numbers always come from
`simulateScenario()`; without `OPENAI_API_KEY`, deterministic interpretation and
explanation fallbacks remain available.

```json
{
  "interpretedGoal": {
    "objective": "improve_district",
    "districtId": "nura",
    "focusIndicators": ["S1", "S2"],
    "reduceCritical": true
  },
  "trace": [
    "Analyzed Nura baseline",
    "Identified S1 and S2 as critical",
    "Evaluated 420 valid scenarios",
    "Selected 3 alternatives"
  ],
  "candidates": [],
  "explanation": "..."
}
```

Status codes:

- `200` — optimization completed;
- `400` — malformed JSON, message, or `currentScenario`;
- `503` — temporary simulation stub is still active;
- `500` — unexpected advisor failure.

The simulation branch must export:

```ts
simulateScenario(input: ScenarioInput): SimulationResult
```

from `src/lib/simulation/engine.ts`.

The frontend should send the natural-language goal to `/api/advisor` and render the
returned `ScenarioCandidate[]`. It may import `AdvisorRequest` and `AdvisorResponse` as
types from `src/lib/agent/advisor.ts`, but it must not reproduce optimizer or simulation
logic. Loading, `400`, `500`, and `503` states should be handled explicitly.
