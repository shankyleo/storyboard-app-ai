import type { BeatSheet } from "@/lib/beats";
import { beatSheetSchema } from "@/lib/beats";
import type { InterviewQuestionId } from "@/lib/beats";

function clampDescription(text: string, max = 500): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}.`;
}

function buildStoryBeatDescriptions(
  story: string,
  hero: string,
  protagonist: string,
): string[] {
  const sentences = story.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const s = (i: number) => sentences[i]?.trim();
  const logline = s(0) ?? story.trim();
  const second = s(1) ?? logline;
  const mid =
    s(Math.max(1, Math.floor(sentences.length / 2))) ?? second;
  const penultimate =
    s(Math.max(0, sentences.length - 2)) ?? mid;
  const ending = s(sentences.length - 1) ?? story.trim();

  return [
    `${protagonist} is established in their ordinary world. ${logline}`,
    `Everything changes when the inciting incident lands: ${second}`,
    `${protagonist} confronts the first major obstacle. ${hero}`,
    `${protagonist} regroups and commits to the journey, unwilling to let go of what matters most.`,
    `A midpoint revelation reframes the conflict and raises the stakes: ${mid}`,
    `The plan collapses under pressure, and ${protagonist} must face the cost of continuing.`,
    `At the darkest moment — ${penultimate.replace(/\.$/, "")} — all hope seems lost before the final push.`,
    `${protagonist} confronts the core conflict head-on in a decisive climax.`,
    `The story resolves as the consequences unfold: ${ending}`,
    `A closing image echoes the opening — ${protagonist} is changed, and the story finds its final shape.`,
  ].map((description) => clampDescription(description));
}

function buildMockBeatSheet(
  answers: Record<string, string>,
): BeatSheet {
  const title = answers.title?.trim() || "Untitled Story";
  const story =
    answers.story?.trim() ||
    "A character faces a turning point that changes everything.";
  const hero =
    answers.hero?.trim() || "The protagonist fights for what matters most.";
  const protagonist = hero.split(",")[0]?.trim() || "The protagonist";
  const logline =
    story.split(/(?<=[.!?])/)[0]?.trim() || `${story.trim()}.`;
  const genre = "Drama";
  const visualStyle =
    "Cinematic storyboard sketches, wide shots, dramatic lighting";

  const beatTitles = [
    "Opening Image",
    "Inciting Incident",
    "First Obstacle",
    "Push Back",
    "Midpoint Revelation",
    "Things Fall Apart",
    "Darkest Hour",
    "Climax",
    "Resolution",
    "Closing Image",
  ];

  const descriptions = buildStoryBeatDescriptions(story, hero, protagonist);

  const visualPrompts = [
    `${visualStyle}. Establishing shot of the world and protagonist.`,
    `${visualStyle}. The moment everything changes — dynamic medium shot.`,
    `${visualStyle}. Tension rises; close-up on reaction.`,
    `${visualStyle}. Determined character in motion.`,
    `${visualStyle}. Dramatic reveal, high contrast lighting.`,
    `${visualStyle}. Low angle, isolation, rain or fog optional.`,
    `${visualStyle}. Silhouette against bleak horizon.`,
    `${visualStyle}. Intense action or emotional confrontation.`,
    `${visualStyle}. Quiet, reflective final frame.`,
    `${visualStyle}. Bookend composition mirroring panel one.`,
  ];

  const beatTemplates = beatTitles.map((beatTitle, index) => ({
    title: beatTitle,
    description: descriptions[index]!,
    visualPrompt: visualPrompts[index]!,
  }));

  return beatSheetSchema.parse({
    title,
    logline,
    genre,
    beats: beatTemplates,
  });
}

async function generateWithOpenAI(
  answers: Record<string, string>,
): Promise<BeatSheet> {
  const systemPrompt = `You are a story development assistant. Given interview answers, produce a beat sheet as JSON with this exact shape:
{
  "title": string,
  "logline": string,
  "genre": string,
  "beats": [{ "title": string, "description": string, "visualPrompt": string }]
}
Rules:
- Exactly 8 to 12 beats in classic story structure
- Infer genre, setting, and tone from the story description
- Each description must be 1-2 complete sentences describing what happens in that beat, grounded in the user's story and hero answers
- Descriptions must read as finished prose — never truncate mid-sentence, never end with "…", and never use vague placeholders like "things get worse"
- Each visualPrompt should describe a single storyboard panel image in cinematic sketch style
- Return ONLY valid JSON, no markdown`;

  const userPrompt = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const raw = JSON.parse(data.choices[0].message.content) as unknown;
  return beatSheetSchema.parse(raw);
}

export async function generateBeatSheet(
  answers: Record<InterviewQuestionId | string, string>,
): Promise<BeatSheet> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(answers);
    } catch {
      // fall through to mock
    }
  }
  return buildMockBeatSheet(answers);
}
