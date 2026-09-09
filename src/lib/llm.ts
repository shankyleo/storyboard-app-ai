import { z } from "zod";
import { beatSheetSchema, type BeatSheet } from "@/lib/beats";
import { runReplicatePrediction } from "@/lib/replicate";

const VISUAL_DIRECTION = `Act as a storyboard director planning a sequence of distinct film shots.
For every visualPrompt write 90–140 words (at most 1000 characters), describing ONE drawable instant:
- Name the visible character and repeat their concrete identifying design (age, hair, face, clothing) consistently when they recur. Infer missing design details once and reuse them.
- Describe the exact physical action, body pose, gaze and interaction with a specific story-relevant object or person. Translate abstract emotions into visible gestures and consequences.
- Specify the location, time of day, foreground/background arrangement, light source, shot size and camera angle.
- Choose a different focal action for each beat. Adjacent shots must differ in framing AND staging. Use establishing wides, medium interactions, over-the-shoulder views, inserts, close-ups and action shots only when the story calls for them. Do not repeatedly depict a character standing and looking into the distance.
- Keep monochrome graphite and charcoal on ivory paper consistent throughout. Consistency means the same character designs and drawing medium, not the same composition or location.
- Ground each shot in its beat and the user's story. Never use vague phrases like "tension rises", "dramatic reveal", "determined character in motion", or optional objects/weather. Do not describe events from other beats in this frame.
- Each prompt must stand alone: never say "same as before" or rely on another prompt. No lettering, captions, split screens or collages.
Before returning, check that each shot conveys a distinct story event and that adjacent panels would be visually distinguishable without captions.`;

async function generateJson(systemPrompt: string, userPrompt: string): Promise<unknown> {
  let text: string;
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Story writing failed (${response.status}). Please check your OpenAI account and try again.`);
    const body = await response.json();
    text = body.choices?.[0]?.message?.content ?? "";
  } else if (process.env.REPLICATE_API_TOKEN) {
    const result = await runReplicatePrediction("meta/meta-llama-3-70b-instruct", {
      system_prompt: systemPrompt,
      prompt: userPrompt,
      max_tokens: 6500,
      temperature: 0.6,
    });
    if (!result.ok) throw new Error(result.error);
    text = Array.isArray(result.output) ? result.output.join("") : result.output;
  } else {
    throw new Error("Add an OpenAI API key or Replicate token to write story-specific beats and visual prompts.");
  }
  // Some models wrap otherwise valid JSON in a Markdown fence.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("The story writer returned incomplete text. Please try again; your saved beats are unchanged.");
  }
}

export async function generateBeatSheet(answers: Record<string, string>): Promise<BeatSheet> {
  const raw = await generateJson(`You are a story development assistant. Return ONLY valid JSON:
{"title": string, "logline": string, "genre": string, "beats": [{"title": string, "description": string, "visualPrompt": string}]}
Create exactly 8–12 beats in classic story structure, grounded in the user's story and hero answers. Infer genre, setting and tone. Each description must be 1–2 complete sentences (at most 500 characters) describing a concrete event. Title at most 120 characters per beat. Logline at most 500 characters.
${VISUAL_DIRECTION}`, JSON.stringify(answers));
  const parsed = beatSheetSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The story writer returned an invalid beat sheet. Please try again; your saved beats are unchanged.");
  return parsed.data;
}

export async function improveVisualPrompts(
  answers: Record<string, string>,
  beats: { id: string; title: string; description: string; visualPrompt: string }[],
): Promise<{ id: string; visualPrompt: string }[]> {
  const raw = await generateJson(`Rewrite only the visual prompts for the supplied beats. Keep their IDs and story events unchanged. Return ONLY valid JSON:
{"beats": [{"id": string, "visualPrompt": string}]}
Return exactly one entry for every supplied beat, in the same order. Preserve any specific character design already established in the existing prompts.
${VISUAL_DIRECTION}`, JSON.stringify({ story: answers, beats }));
  const parsed = z.object({ beats: z.array(z.object({ id: z.string(), visualPrompt: z.string().min(1).max(1000) })) }).safeParse(raw);
  if (!parsed.success || parsed.data.beats.length !== beats.length || parsed.data.beats.some((beat, index) => beat.id !== beats[index].id)) {
    throw new Error("The story writer returned an incomplete shot list. Please try again; your saved prompts are unchanged.");
  }
  return parsed.data.beats;
}
