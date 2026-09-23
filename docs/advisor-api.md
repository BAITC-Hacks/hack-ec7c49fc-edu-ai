# Advisor API

`POST /api/advisor` converts a natural-language goal into a validated objective, runs deterministic scenario search through the simulation engine, and returns up to three ranked alternatives.

## Request

```ts
interface AdvisorRequest {
  message: string;
  currentScenario?: ScenarioInput;
}
```

`message` is trimmed, must be non-empty, and may contain at most 2,000 characters. When present, `currentScenario` must match the `ScenarioInput` contract. The server runs it through `simulateScenario()` and compares its calculated result with the alternatives. The objective determines ranking; the current plan provides the comparison context.

```json
{
  "message": "Улучши Нуру и убери критические социальные показатели",
  "currentScenario": {
    "selections": []
  }
}
```

## Success response

```ts
interface AdvisorResponse {
  interpretedGoal: StructuredObjective;
  trace: string[];
  candidates: ScenarioCandidate[];
  explanation: string;
  currentScenarioAnalysis?: CurrentScenarioAnalysis;
}
```

`candidates` contains zero to three valid results. Every numeric field inside a candidate comes directly from `simulateScenario()`.

`currentScenarioAnalysis` is present only when `currentScenario` is supplied. Its type is exported from `src/lib/agent/analysis.ts`:

- `result`: the exact current `SimulationResult` from the engine, including validation diagnostics for an invalid plan.
- `strengths`, `weaknesses`: deterministic Russian statements grounded in that result.
- `remainingCriticalIndicators`, `lowImprovementIndicators`: district IDs with original `IndicatorDelta` values.
- `comparisons`: one per alternative, with `alternative`, `assessment` (`better`, `worse`, `equivalent`), `advantages`, `tradeoffs`, and `budgetEfficiency`.
- `summary`: readable current-plan analysis. It is also included in the existing `explanation` string, so older clients still display it.

Invalid current plans have no outcome comparisons; candidates can still be returned. No per-measure causal budget efficiency is inferred. Explicit critical-reduction goals rank before district/focus/Score/cost. All model explanation output is validated as evidence keys; only server-computed Russian facts are rendered.

## Errors

- `400` with `{ "error": string }` for invalid JSON or request input.
- `500` with `{ "error": "Advisor failed." }` for an unexpected advisor failure.

The API has deterministic parsing and explanation fallbacks when `OPENAI_API_KEY` is absent or the OpenAI request fails.
