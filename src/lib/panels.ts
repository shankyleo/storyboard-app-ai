export function storyboardSketchDataUrl(title: string, index: number): string {
  const label = title.slice(0, 40).replace(/[<>&'"]/g, "");
  const variant = index % 3;

  const scene =
    variant === 0
      ? `
    <ellipse cx="400" cy="175" rx="280" ry="55" fill="none" stroke="#b8b0a4" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="M120 280 Q200 220 320 260 T520 240 T680 270" fill="none" stroke="#8a8278" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="280" cy="210" r="22" fill="none" stroke="#6b6560" stroke-width="2"/>
    <path d="M280 232 L280 280 M260 255 L300 255 M280 280 L265 310 M280 280 L295 310" fill="none" stroke="#6b6560" stroke-width="2" stroke-linecap="round"/>
    <rect x="480" y="180" width="140" height="90" fill="none" stroke="#a8a098" stroke-width="2" rx="3"/>
    <line x1="480" y1="225" x2="620" y2="225" stroke="#c8c0b4" stroke-width="1"/>
    <line x1="550" y1="180" x2="550" y2="270" stroke="#c8c0b4" stroke-width="1"/>`
      : variant === 1
        ? `
    <rect x="100" y="120" width="600" height="180" fill="none" stroke="#b8b0a4" stroke-width="1.5" rx="4"/>
    <line x1="100" y1="200" x2="700" y2="200" stroke="#d4cdc4" stroke-width="1"/>
    <circle cx="220" cy="175" r="28" fill="none" stroke="#6b6560" stroke-width="2"/>
    <path d="M220 203 L220 265 M200 230 L240 230" fill="none" stroke="#6b6560" stroke-width="2" stroke-linecap="round"/>
    <path d="M380 265 L420 180 L460 265 Z" fill="none" stroke="#8a8278" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="560" cy="250" rx="60" ry="25" fill="none" stroke="#a8a098" stroke-width="2"/>
    <path d="M500 250 Q560 210 620 250" fill="none" stroke="#8a8278" stroke-width="2"/>`
        : `
    <line x1="80" y1="290" x2="720" y2="290" stroke="#c8c0b4" stroke-width="1.5"/>
    <path d="M160 290 L160 160 L340 290 Z" fill="none" stroke="#8a8278" stroke-width="2" stroke-linejoin="round"/>
    <path d="M340 290 L340 130 L520 290 Z" fill="none" stroke="#a8a098" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="600" cy="200" r="35" fill="none" stroke="#6b6560" stroke-width="2"/>
    <path d="M600 235 L600 290 M580 260 L620 260" fill="none" stroke="#6b6560" stroke-width="2" stroke-linecap="round"/>
    <path d="M200 120 Q400 80 600 120" fill="none" stroke="#b8b0a4" stroke-width="1.5" stroke-dasharray="5 4"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect fill="#faf7f2" width="800" height="450"/>
    <rect fill="none" x="16" y="16" width="768" height="418" stroke="#2a2826" stroke-width="3" rx="2"/>
    <rect fill="#2a2826" x="16" y="16" width="36" height="28" rx="2"/>
    <text x="34" y="35" fill="#faf7f2" font-family="system-ui,sans-serif" font-size="14" font-weight="600" text-anchor="middle">${index + 1}</text>
    ${scene}
    <rect fill="rgba(250,247,242,0.92)" x="0" y="380" width="800" height="70"/>
    <text x="400" y="410" fill="#3d3a36" font-family="system-ui,sans-serif" font-size="15" font-weight="600" text-anchor="middle">${label || `Scene ${index + 1}`}</text>
    <text x="400" y="432" fill="#8a8278" font-family="system-ui,sans-serif" font-size="12" text-anchor="middle">Storyboard sketch</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

import type { ImageProvider } from "@/lib/image-providers";
import { resolveImageProvider } from "@/lib/image-providers";

const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const PANEL_IMAGE_PROMPT_PREFIX =
  "Storyboard panel, comic storyboard style, cinematic sketch:";

export type PanelImageResult =
  | { ok: true; imageUrl: string }
  | { ok: false; error: string };

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

async function generateWithOpenAI(
  visualPrompt: string,
): Promise<PanelImageResult> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: `${PANEL_IMAGE_PROMPT_PREFIX} ${visualPrompt}`,
      n: 1,
      size: "1536x1024",
      quality: "low",
    }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: apiErrorMessage("OpenAI", response.status, body, {
        auth: "Invalid OpenAI API key. Check OPENAI_API_KEY in .env.local.",
      }),
    };
  }

  const data = body as { data?: Array<{ url?: string; b64_json?: string }> };
  const item = data.data?.[0];
  if (item?.b64_json) {
    return { ok: true, imageUrl: `data:image/png;base64,${item.b64_json}` };
  }
  if (item?.url) {
    return { ok: true, imageUrl: item.url };
  }

  return { ok: false, error: "OpenAI returned no image output." };
}

async function generateWithReplicate(
  visualPrompt: string,
): Promise<PanelImageResult> {
  const response = await fetch(
    `https://api.replicate.com/v1/models/${FLUX_SCHNELL_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt: `${PANEL_IMAGE_PROMPT_PREFIX} ${visualPrompt}`,
          num_outputs: 1,
          aspect_ratio: "16:9",
          output_format: "webp",
        },
      }),
    },
  );

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: apiErrorMessage("Replicate", response.status, body, {
        billing:
          "Replicate account needs billing credit. Add payment at replicate.com/account/billing.",
        auth: "Invalid Replicate API token. Check REPLICATE_API_TOKEN in .env.local.",
      }),
    };
  }

  const data = body as {
    output?: string | string[];
    status?: string;
    error?: string;
  };

  if (data.status === "failed" && data.error) {
    return { ok: false, error: data.error };
  }

  const output = Array.isArray(data.output) ? data.output[0] : data.output;
  if (output) {
    return { ok: true, imageUrl: output };
  }

  return { ok: false, error: "Replicate returned no image output." };
}

async function generateWithGemini(
  visualPrompt: string,
): Promise<PanelImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Gemini API key not configured. Check GEMINI_API_KEY in .env.local.",
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${PANEL_IMAGE_PROMPT_PREFIX} ${visualPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      }),
    },
  );

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: apiErrorMessage("Gemini", response.status, body, {
        auth: "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local.",
      }),
    };
  }

  const data = body as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  };

  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    const inline = part.inlineData ?? part.inline_data;
    if (!inline?.data) continue;
    const mimeType =
      "mimeType" in inline && inline.mimeType
        ? inline.mimeType
        : "mime_type" in inline
          ? inline.mime_type
          : "image/png";
    return {
      ok: true,
      imageUrl: `data:${mimeType ?? "image/png"};base64,${inline.data}`,
    };
  }

  return { ok: false, error: "Gemini returned no image output." };
}

export async function generatePanelImage(
  visualPrompt: string,
  index: number,
  beatTitle: string,
  provider?: ImageProvider | null,
): Promise<PanelImageResult> {
  const resolved = resolveImageProvider(provider);

  if (resolved === "openai") {
    return generateWithOpenAI(visualPrompt);
  }

  if (resolved === "gemini") {
    return generateWithGemini(visualPrompt);
  }

  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI(visualPrompt);
  }

  if (process.env.GEMINI_API_KEY) {
    return generateWithGemini(visualPrompt);
  }

  if (process.env.REPLICATE_API_TOKEN) {
    return generateWithReplicate(visualPrompt);
  }

  await delay(400 + Math.random() * 400);
  return { ok: true, imageUrl: storyboardSketchDataUrl(beatTitle, index) };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runPanelGenerationBatch(
  items: { visualPrompt: string; beatTitle: string }[],
  onProgress: (
    index: number,
    result: PanelImageResult,
  ) => Promise<void>,
  onBeforeGenerate?: (index: number) => Promise<void>,
  provider?: ImageProvider | null,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    if (onBeforeGenerate) {
      await onBeforeGenerate(i);
    }
    const item = items[i];
    const result = await generatePanelImage(
      item.visualPrompt,
      i,
      item.beatTitle,
      provider,
    );
    await onProgress(i, result);
  }
}
