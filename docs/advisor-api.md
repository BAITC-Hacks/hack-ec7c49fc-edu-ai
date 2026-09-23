# Advisor API

`POST /api/advisor` converts a natural-language goal into a validated objective, runs deterministic scenario search through the simulation engine, and returns up to three ranked alternatives.

## Request

```ts
interface AdvisorRequest {
  message: string;
  currentScenario?: ScenarioInput;
}
```

`message` is trimmed, must be non-empty, and may contain at most 2,000 characters. When present, `currentScenario` must match the `ScenarioInput` contract. It is accepted for frontend integration; the current optimizer does not use it to alter ranking.

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
}
```

`candidates` contains zero to three valid results. Every numeric field inside a candidate comes directly from `simulateScenario()`.

## Errors

- `400` with `{ "error": string }` for invalid JSON or request input.
- `500` with `{ "error": "Advisor failed." }` for an unexpected advisor failure.

The API has deterministic parsing and explanation fallbacks when `OPENAI_API_KEY` is absent or the OpenAI request fails.
