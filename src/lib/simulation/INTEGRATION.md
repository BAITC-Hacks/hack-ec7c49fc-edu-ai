# Simulation integration contract

## Files to transfer

The simulation unit consists of:

- `src/data/districts.ts`
- `src/data/indicators.ts`
- `src/data/measures.ts`
- `src/lib/simulation/**`
- `tests/simulation/**`

Import the public API from `src/lib/simulation/index.ts`. The main integration functions are `simulateScenario` and `getBaseline`. The index also exports the fixed datasets, constants, calculation helpers and all standalone simulation types.

Use relative imports if this folder is moved into another project. No Next.js path alias is required by the module itself.

## Numeric authority

The UI, optimizer and AI layer must use `SimulationResult` values directly. They must not recalculate budgets, effects, district scores, critical counts or the final score. The AI layer may explain returned numbers, but it must not invent or recompute them.

## Error contract

`src/lib/simulation/types.ts` and the shared `src/types/domain.ts` define compatible `SimulationResult` discriminated unions on `valid`.

When `valid` is `false`, no effects are applied and these fields are deliberately nullable:

- `scoreAfter`
- `scoreDelta`
- `weakestDistrict`
- `criticalAfter`
- `cost` and `remainingBudget` only when the input contains an unknown or malformed measure ID

`scoreBefore` and `criticalBefore` always describe the baseline. If every measure ID is known, invalid scenarios still return the diagnostic cost of all submitted entries; duplicate entries are counted. This can produce a negative `remainingBudget` for an over-budget scenario.

The shared contract was synchronized during integration so invalid scenarios are represented without `any`, unsafe casts or fabricated zero values. `ScenarioCandidate.result` is a valid result because the optimizer discards invalid simulations before creating candidates.

The optimizer may safely call `simulateScenario` for candidate inputs, but it must branch on `result.valid` before reading valid-only fields. The frontend should use `getBaseline()` rather than calling `simulateScenario({ selections: [] })`, because an empty selection list is invalid by definition.
