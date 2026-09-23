# Astana AI — Urban Decision Intelligence

## Problem

City decision-makers must distribute a limited budget across transport, ecology, social infrastructure, safety, and public services while understanding how each combination affects districts and the city as a whole.

## Solution

Astana AI combines an implemented deterministic simulation engine, a deterministic scenario optimizer, and an AI advisor. The simulator validates and calculates scenarios, the optimizer searches valid alternatives and ranks the Top 3 for the requested objective, and the advisor translates a natural-language goal into a structured objective and explains calculated results. A frontend dashboard is the presentation layer and is maintained separately.

## Core principle

The LLM never calculates the Score, budget, indicator effects, synergies, or district results. Every number shown by the advisor comes from `SimulationResult`, produced by the deterministic `simulateScenario()` function. OpenAI is used only to interpret intent and add qualitative explanations; deterministic fallbacks cover both operations.

## Architecture

```text
Frontend
  → Advisor API / Scenario Builder
  → Optimizer
  → Simulation Engine
  → Static Track Dataset
```

The public contracts live in `src/types/domain.ts`. Frontend integration details are in [`docs/frontend-integration.md`](docs/frontend-integration.md).

## Dataset

- 5 Astana districts
- 10 quality-of-life indicators
- 14 available measures across 5 directions
- Budget: 100 units
- Exactly 5 unique measures per valid scenario
- Simulation horizon: 8 quarters

## Simulation

The engine validates measure scope, budget, direction limits, and incompatibilities. It applies lag-adjusted measure effects and defined synergies, clamps indicator values, calculates district scores, and produces the final Astana Quality of Life Score. Invalid scenarios return validation diagnostics and no calculated after-state.

## AI / Agent flow

```text
Natural-language objective
  → validated structured objective
  → deterministic scenario search
  → simulate valid scenarios
  → rank Top 3
  → grounded explanation
```

Supported optimizer objectives are `maximize_city_score`, `improve_district`, `reduce_critical_indicators`, and `balanced_development`.

## Tech stack

- Next.js 16 with the App Router and Turbopack
- React 19
- TypeScript 5
- Vitest 4
- OpenAI Responses API via server-side `fetch` (optional)

## Setup

Requirements: Node.js 20+ and npm.

```bash
npm install
```

Optionally create `.env.local` to enable LLM-based interpretation and qualitative explanations:

```dotenv
OPENAI_API_KEY=...
# Optional; defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

The application remains functional without an API key by using deterministic parser and explanation fallbacks.

```bash
npm run dev
```

## Tests

```bash
npm test
npm run typecheck
npm run build
```

## Demo flow

1. Show the city baseline.
2. Select five initiatives.
3. Run the deterministic simulation.
4. Show the before/after results.
5. Ask the AI advisor for an objective.
6. Review the deterministic Top-3 alternatives.
7. Compare the current plan with an AI proposal.

See the [`90-second demo script`](docs/demo-script.md) and [`demo queries`](docs/demo-queries.md).

## Limitations

- The dataset is synthetic and scoped to the hackathon track.
- The system is not a forecast of real Astana public policy outcomes.
- Recommendations are decision-support, not autonomous decisions.
- A human decision-maker remains responsible for the final choice.

## Third-party components

The project uses Next.js, React, TypeScript, Vitest, and their type packages as declared in `package.json`. The optional external service is the OpenAI Responses API. There is no database, authentication provider, or additional runtime service.
<details>
<summary>Initial repository notes</summary>

```text
hack-ec7c49fc-edu-ai
Hackathon team repository for edu_ai
123
hako krut
commit tokha
```

</details>
