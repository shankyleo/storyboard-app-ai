export type ImageProvider = "openai" | "gemini";

export const IMAGE_PROVIDER_LABELS: Record<ImageProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
};

export function getAvailableImageProviders(): ImageProvider[] {
  const providers: ImageProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  return providers;
}

export function getDefaultImageProvider(): ImageProvider | null {
  const available = getAvailableImageProviders();
  if (available.length === 0) return null;
  if (available.includes("openai")) return "openai";
  return available[0] ?? null;
}

export function resolveImageProvider(
  requested: ImageProvider | null | undefined,
): ImageProvider | null {
  const available = getAvailableImageProviders();
  if (requested && available.includes(requested)) return requested;
  return getDefaultImageProvider();
}

export function isImageProvider(value: string): value is ImageProvider {
  return value === "openai" || value === "gemini";
}
