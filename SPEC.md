# Spec — Which will allow users to generate a story board

## Why

I am thinking of an app which will allow users to generate a story board. Users have imagination and theuy think of a story, but if they want to publish it to the work as a movie or as a stomic or a book, the user lacks on how to put their imagination on paper to visualise how it is coming out and w

## From the Idea Forge thread

### At a glance

Yes — for a **greenfield MVP**, I have enough to start. John’s scope (guided interview → beat sheet → 8–12 panels → shareable pitch link/PDF), Maya’s four-layer model (Capture → Structure → Visualize → Share), and your **greenfield** call mean we’re not inheriting Idea Forge code — just a clean repo with **beats as source of truth** and visuals as an async render layer.

What I don’t have yet are **repo/folder choices** and a couple of **ops defaults** (auth for save/resume, image-gen budget). Those don’t block architecture; they only tune Phase 1 config.

---

### Plan

**Stack**
- **Frontend:** Next.js (App Router) + React + Tailwind + shadcn/ui — stepper interview, beat editor, read-only pitch page
- **Backend:** Next.js Route Handlers + Server Actions (monolith, no separate API service)
- **Database:** PostgreSQL (Neon) + Drizzle — `Project → Beats → Panels → Export`
- **LLM:** GPT-4o or Claude with **structured JSON** (Zod-validated beat sheet from interview)
- **Images:** OpenAI (gpt-image-1) or Replicate (Flux Schnell) — **queued batch** panel generation, not inline
- **Jobs:** Inngest or Trigger.dev — poll progress while panels render
- **Storage:** Cloudflare R2 or Supabase Storage — panel assets + PDF
- **PDF:** `@react-pdf/renderer` or Puppeteer HTML→PDF from the same pitch page template
- **Auth (Phase 1):** anonymous session + DB draft; add Clerk/NextAuth when you need cross-device resume

**Platform:** **Web only** for MVP (desktop-first creation; pitch link works on mobile).

**Build approach**
1. Schema + beat JSON contract first  
2. Interview → beats (sync)  
3. Panel job queue + progress UI  
4. Public pitch route (`/p/[slug]`) + PDF export  
5. Ship one happy path; no collab, no multi-format, no native apps until export/share metric proves out

**Hosting / deploy**
- **App:** Vercel (Next.js native, preview deploys per branch)
- **DB:** Neon (serverless Postgres, free tier for dev)
- **Storage:** R2 or Supabase Storage
- **Jobs:** Inngest Cloud (or Trigger.dev) — same region as DB where possible
- **Domain:** custom domain on Vercel for pitch links (`pitch.yourapp.com/p/...`)

This is enough to scaffold. When you’re ready, use **Promote to an app** — that form collects your local folder and GitHub repo and writes the charter so build can start in a clean tree.

---

For Phase 1 save/resume, do you want **fully anonymous** (browser session only) or **magic-link email** from day one?
