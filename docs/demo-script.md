# 90-second demo script

## 0:00–0:15 — Baseline

Open the dashboard and establish the starting point: Astana Quality of Life Score is **52.56**, the weakest district is **Nura**, and there are **2 critical indicators**.

## 0:15–0:35 — Build a plan

Select exactly five initiatives:

- M7 → Nura
- M8 → Nura
- M10 → Nura
- M12 → City
- M5 → Saryarka

The total cost returned by the simulator is **95**, leaving **5** budget units.

## 0:35–0:50 — Simulate

Run the deterministic simulation. Show the calculated city result: approximately **52.56 → 56.54**, with critical indicators reduced from **2 → 0**. Briefly open the district comparison to show that the output includes district and indicator deltas.

## 0:50–1:05 — Ask the advisor

Send:

> Улучши Нуру и убери критические социальные показатели, не выходя за бюджет 100.

Explain that the LLM interprets the goal, but does not calculate any numbers.

## 1:05–1:20 — Show the trace

Show the system-action trace:

- analyzed the Nura baseline;
- identified the critical social indicators;
- evaluated valid scenarios;
- selected alternatives.

The trace is an audit-friendly action summary, not hidden chain-of-thought.

## 1:20–1:30 — Compare alternatives

Show the Top-3 scenarios in their returned order and compare their calculated score change, cost, remaining budget, critical indicators, district deltas, and qualitative trade-offs against the manually selected plan.

Close with:

> Мы не просим AI угадать правильное решение. Агент использует детерминированный симулятор как инструмент, проверяет варианты вычислениями и только после этого предлагает человеку решения.
