const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

interface ResponsePayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

function readOutputText(payload: ResponsePayload): string {
  if (payload.output_text) return payload.output_text;
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text")?.text ?? ""
  );
}

export async function createOpenAIResponse(
  instructions: string,
  input: string,
  format?: Record<string, unknown>,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(8_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      instructions,
      input,
      ...(format ? { text: { format } } : {}),
    }),
  });

  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
  const text = readOutputText((await response.json()) as ResponsePayload);
  if (!text) throw new Error("OpenAI returned no text output");
  return text;
}
