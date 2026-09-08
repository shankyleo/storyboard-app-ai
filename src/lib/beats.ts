import { z } from "zod";

export const beatSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  visualPrompt: z.string().min(1).max(1000),
});

export const beatSheetSchema = z.object({
  title: z.string().min(1).max(200),
  logline: z.string().min(1).max(500),
  genre: z.string().min(1).max(100),
  beats: z.array(beatSchema).min(8).max(12),
});

export type Beat = z.infer<typeof beatSchema>;
export type BeatSheet = z.infer<typeof beatSheetSchema>;

/** Three quick questions — the LLM fills in genre, setting, and structure. */
export const interviewQuestions = [
  {
    id: "title",
    label: "What's the working title?",
    placeholder: "The Last Lighthouse Keeper",
    type: "text" as const,
  },
  {
    id: "story",
    label: "Describe your story in a few sentences",
    placeholder:
      "A retired lighthouse keeper discovers a signal from a ship that vanished 40 years ago. As the fog-bound town dismisses her, she must decide whether to keep searching or let go.",
    type: "textarea" as const,
  },
  {
    id: "hero",
    label: "Who's the main character, and what's at stake?",
    placeholder:
      "Elena, 62, wants closure after her brother disappeared at sea — but uncovering the truth may cost her the only home she has left.",
    type: "textarea" as const,
  },
] as const;

export type InterviewQuestionId = (typeof interviewQuestions)[number]["id"];
