# Deterministic city simulation

This module is the numeric source of truth for the synthetic Astana urban decision simulator. It validates a five-measure scenario, applies lag-adjusted effects and fixed synergies, and returns district-level indicator deltas plus the final quality-of-life score. It has no network, React, Next.js, database, time or random dependencies.

The model is synthetic and must not be presented as a forecast of real-world policy outcomes.

## Setup and checks

Install the repository dependencies and run the one-shot test suite:

```bash
npm install
npm test
npm run typecheck
```

## Baseline

```ts
import { getBaseline } from "./src/lib/simulation/index";

const baseline = getBaseline();
console.log(baseline.score); // 52.55768
console.log(baseline.weakestDistrict); // "nura"
```

`getBaseline()` returns fresh indicator objects, district scores, the population-weighted city average, the critical-value count and the weakest district.

## Scenario simulation

```ts
import { simulateScenario } from "./src/lib/simulation/index";

const result = simulateScenario({
  selections: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
});

if (result.valid) {
  console.log(result.scoreAfter); // approximately 56.54307
  console.log(result.remainingBudget); // 5
}
```

Invalid scenarios are not simulated:

```ts
const result = simulateScenario({ selections: [] });

if (!result.valid) {
  console.error(result.validationErrors);
  console.log(result.scoreAfter); // null
}
```

## Formula and constraints

For a measure with lag `L` and the eight-quarter horizon, its realized effect is:

```text
fullEffect * (8 - L) / 8
```

All normal effects and unscaled synergies are summed before each indicator is clipped to `0..100`. District scores are weighted sums of ten indicators. The city average is weighted by district population share. The final score is:

```text
0.7 * cityAverage + 0.3 * minimumDistrictScore - criticalCount
```

An indicator is critical only when it is strictly below 40. The final score itself is not clipped.

A valid scenario has exactly five unique measures, costs no more than 100, contains no more than two measures from any direction, targets district and city measures correctly, and respects the M1/M3, M4/M7 and M5/M13 incompatibilities.

The engine accumulates effects in catalog order (`M1` through `M14`), so permuting the input selections does not change floating-point accumulation or the result.
