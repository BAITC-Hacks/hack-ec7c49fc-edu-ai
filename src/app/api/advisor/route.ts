import { NextResponse } from "next/server";
import { advise, type AdvisorRequest } from "@/lib/agent/advisor";
import { simulateScenario } from "@/lib/simulation/engine";

function isAdvisorRequest(value: unknown): value is AdvisorRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  if (typeof request.message !== "string" || request.message.trim().length === 0) return false;
  if (request.message.length > 2_000) return false;
  if (request.currentScenario === undefined) return true;
  if (!request.currentScenario || typeof request.currentScenario !== "object") return false;
  return Array.isArray((request.currentScenario as Record<string, unknown>).selections);
}

export async function POST(request: Request) {
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
    return NextResponse.json(await advise({ ...body, message: body.message.trim() }, simulateScenario));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Advisor failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
