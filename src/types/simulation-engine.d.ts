declare module "@/lib/simulation/engine" {
  import type { ScenarioInput, SimulationResult } from "@/types/domain";

  export function simulateScenario(input: ScenarioInput): SimulationResult;
}
