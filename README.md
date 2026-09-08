# Storyboard App

Turn your story idea into a visual pitch — guided interview, beat sheet, and storyboard panels.

## Stack

- Next.js 15 (App Router) + React + Tailwind
- PostgreSQL (Neon) + Drizzle ORM
- Zod-validated beat sheet contract
- Anonymous session for Phase 1 save/resume

## Getting started

```bash
cp .env.example .env.local
# Add DATABASE_URL (Neon) and REPLICATE_API_TOKEN for live panel generation

npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Happy path

1. **Start** — create a project with an anonymous session cookie
2. **Interview** — answer guided questions about your story
3. **Beats** — review and edit the generated beat sheet (8–12 beats)
4. **Panels** — pick Replicate (the default when configured), OpenAI, or Gemini, then generate storyboard visuals
5. **Pitch** — share `/p/[slug]` link; export PDF from the pitch page

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (prod) | Neon Postgres connection string |
| `OPENAI_API_KEY` | No | Beats (GPT) and panel images (gpt-image-1); selectable in app |
| `GEMINI_API_KEY` | No | Panel images (gemini-2.5-flash-image); selectable in app |
| `REPLICATE_API_TOKEN` | No | Panel images via Flux Schnell; selected by default when configured |
| `SESSION_SECRET` | Prod | Random string for session cookie signing |

Without `DATABASE_URL`, the app runs in **memory mode** for local dev.

## Scripts

- `npm run dev` — development server (writes to `.next-dev`)
- `npm run build` — production build (writes to `.next`; stop dev first if running)
- `npm run db:push` — push schema to Neon
- `npm run db:studio` — Drizzle Studio

## Docs

See `SPEC.md`, `ARCHITECTURE.md`, and `BUILD.md` for product charter.
