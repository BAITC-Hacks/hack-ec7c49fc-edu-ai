import { NextResponse } from "next/server";
import {
  advise,
  type AdvisorRequest,
  type AdvisorResponse,
} from "@/lib/agent/advisor";
import { simulateScenario } from "@/lib/simulation/engine";
import type { DistrictId } from "@/types/domain";

const DISTRICT_IDS: readonly DistrictId[] = [
  "esil",
  "almaty",
  "saryarka",
  "baikonur",
  "nura",
];
const SIMULATION_STUB_ERROR =
  "Simulation engine is not implemented yet. Merge feat/simulation-engine first.";

function isCurrentScenario(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const selections = (value as Record<string, unknown>).selections;
  if (!Array.isArray(selections) || selections.length > 50) return false;
  return selections.every((selection) => {
    if (!selection || typeof selection !== "object") return false;
    const item = selection as Record<string, unknown>;
    if (typeof item.measureId !== "string" || item.measureId.trim().length === 0) return false;
    if (item.measureId.length > 100) return false;
    return (
      item.districtId === undefined ||
      DISTRICT_IDS.includes(item.districtId as DistrictId)
    );
  });
}

function isAdvisorRequest(value: unknown): value is AdvisorRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  if (typeof request.message !== "string" || request.message.trim().length === 0) return false;
  if (request.message.length > 2_000) return false;
  if (request.currentScenario === undefined) return true;
  return isCurrentScenario(request.currentScenario);
}

type AdvisorRunner = (request: AdvisorRequest) => Promise<AdvisorResponse>;

const runAdvisor: AdvisorRunner = (request) => advise(request, simulateScenario);

export function createAdvisorPost(advisorRunner: AdvisorRunner = runAdvisor) {
  return async function post(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (!isAdvisorRequest(body)) {
      return NextResponse.json(
        { error: "message is required and must be at most 2000 characters." },
        { status: 400 },
      );
    }

    try {
      const result = await advisorRunner({ ...body, message: body.message.trim() });
      return NextResponse.json(result);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== SIMULATION_STUB_ERROR) {
        return NextResponse.json({ error: "Advisor failed." }, { status: 500 });
      }
      return NextResponse.json(
        { error: "Simulation engine is not available yet." },
        { status: 503 },
      );
    }
  };
}

export const POST = createAdvisorPost();
