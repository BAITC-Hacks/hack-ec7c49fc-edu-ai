import { afterEach, expect, it, vi } from "vitest";
import { createOpenAIResponse } from "@/lib/agent/openai";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("sends Responses structured output server-side with a timeout and blank-model fallback", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_MODEL", "");
  const timeout = vi.spyOn(AbortSignal, "timeout");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "{}" }] }] })));
  vi.stubGlobal("fetch", fetchMock);
  const schema = { type: "json_schema", name: "test", strict: true, schema: { type: "object" } };
  await expect(createOpenAIResponse("instructions", "synthetic goal", schema)).resolves.toBe("{}");
  expect(timeout).toHaveBeenCalledWith(8_000);
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/responses");
  expect(request.headers.Authorization).toBe("Bearer test-key");
  expect(JSON.parse(request.body)).toMatchObject({ model: "gpt-4o-mini", text: { format: schema }, store: false });
  expect(request.body).not.toContain("test-key");
});

it("does not call OpenAI without a key", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(createOpenAIResponse("", "")).rejects.toThrow("not configured");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("does not log or expose provider error bodies", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private details", { status: 429 })));
  const log = vi.spyOn(console, "log");
  const error = vi.spyOn(console, "error");
  await expect(createOpenAIResponse("", "")).rejects.toThrow("status 429");
  expect(log).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});
