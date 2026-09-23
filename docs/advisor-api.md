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

The simulation branch must export:

```ts
simulateScenario(input: ScenarioInput): SimulationResult
```

from `src/lib/simulation/engine.ts`.

The frontend should send the natural-language goal to `/api/advisor` and render the
returned `ScenarioCandidate[]`. It must not reproduce optimizer or simulation logic.
