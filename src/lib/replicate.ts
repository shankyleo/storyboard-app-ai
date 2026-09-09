const REPLICATE_REQUEST_TIMEOUT_MS = 15_000;
const REPLICATE_POLL_TIMEOUT_MS = 660_000;
const REPLICATE_POLL_INTERVAL_MS = 1_000;
const REPLICATE_MIN_START_INTERVAL_MS = 11_000;
let nextReplicateStartAt = 0;


type ReplicateResult = { ok: true; output: string | string[] } | { ok: false; error: string };

function apiErrorMessage(
  provider: string,
  status: number,
  body: unknown,
  hints: { billing?: string; auth?: string },
): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.error === "string") return record.error;
    const nested = record.error as Record<string, unknown> | undefined;
    if (nested && typeof nested.message === "string") return nested.message;
  }

  if (status === 402 && hints.billing) return hints.billing;
  if (status === 401 && hints.auth) return hints.auth;
  if (status === 429) {
    return `${provider} rate limit or quota exceeded. Check your account billing.`;
  }

  return `${provider} request failed (${status})`;
}

export async function runReplicatePrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<ReplicateResult> {
  let response!: Response;
  let body: unknown = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    await waitForReplicateStartSlot();
    try {
      response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          "Cancel-After": "10m",
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(REPLICATE_REQUEST_TIMEOUT_MS),
      });
    } catch {
      return { ok: false, error: "Replicate could not confirm generation started. Check your dashboard before retrying." };
    }
    body = await readJson(response);
    if (response.status !== 429 || attempt === 5) break;
    // Retry only explicitly rejected starts, not ambiguous network failures.
    await delay(replicateRetryDelay(response, body));
  }
  if (!response.ok) {
    return { ok: false, error: apiErrorMessage("Replicate", response.status, body, {
      billing: "Replicate account needs billing credit. Add payment at replicate.com/account/billing.",
      auth: "Invalid Replicate API token. Check REPLICATE_API_TOKEN in .env.local.",
    }) };
  }
  const data = (body ?? {}) as {
    output?: string | string[];
    status?: string;
    error?: string;
    urls?: { get?: string };
  };
  const deadline = Date.now() + REPLICATE_POLL_TIMEOUT_MS;
  while (data.status === "starting" || data.status === "processing") {
    if (!data.urls?.get) return { ok: false, error: "Replicate returned no prediction status URL." };
    if (Date.now() >= deadline) {
      return { ok: false, error: "Replicate exceeded its 10-minute generation deadline. Check the prediction in your dashboard before retrying." };
    }
    await delay(REPLICATE_POLL_INTERVAL_MS);
    try {
      response = await fetch(data.urls.get, {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
        signal: AbortSignal.timeout(REPLICATE_REQUEST_TIMEOUT_MS),
      });
    } catch {
      await delay(3_000);
      continue;
    }
    body = await readJson(response);
    if (response.status === 429 || response.status >= 500) {
      await delay(Math.min(replicateRetryDelay(response, body), Math.max(0, deadline - Date.now())));
      continue;
    }
    if (!response.ok) return { ok: false, error: apiErrorMessage("Replicate", response.status, body, {}) };
    Object.assign(data, body as typeof data);
  }
  if (data.status === "failed" || data.status === "canceled") {
    return { ok: false, error: data.error || `Replicate generation ${data.status}. Please try again.` };
  }
  if (data.output) return { ok: true, output: data.output };
  return { ok: false, error: "Replicate returned no output." };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function replicateRetryDelay(response: Response, body: unknown): number {
  const header = response.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  const headerMs = Number.isFinite(seconds) ? seconds * 1000
    : header ? Date.parse(header) - Date.now() : 0;
  const detail = body && typeof body === "object"
    ? String((body as { detail?: unknown }).detail ?? "") : "";
  const match = detail.match(/(?:resets in|available in)\s*~?\s*(\d+(?:\.\d+)?)\s*s/i);
  const bodyMs = match ? Number(match[1]) * 1000 : 0;
  return Math.max(REPLICATE_MIN_START_INTERVAL_MS, headerMs || 0, bodyMs) + 1000;
}

async function waitForReplicateStartSlot(): Promise<void> {
  // Reserve synchronously before yielding, so concurrent callers get distinct slots.
  const startAt = Math.max(Date.now(), nextReplicateStartAt);
  nextReplicateStartAt = startAt + REPLICATE_MIN_START_INTERVAL_MS;
  const waitMs = startAt - Date.now();
  if (waitMs > 0) await delay(waitMs);
}


function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
