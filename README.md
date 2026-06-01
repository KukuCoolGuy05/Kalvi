# Kalvi — adaptive learning AI agent

An AI tutor that adapts in real time to how each person learns, with first-class
support for **dyslexia, ADHD, ESL learners, and other learning differences**. The
agent gets to know the learner through conversational onboarding and continuously
refines its approach based on feedback and confusion signals.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM → **Postgres** (Supabase)
- **Upstash Redis** for ephemeral session/onboarding state
- **Anthropic Claude** (`claude-sonnet-4-5`) with tool use + streaming
- **NextAuth** (email + Google) for auth
- Deploy target: **Vercel + Supabase**

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   fill in ANTHROPIC_API_KEY, DATABASE_URL, UPSTASH_REDIS_*, NEXTAUTH_SECRET

# 3. Database
npm run db:push      # create tables (or `db:migrate` for a migration)
npm run db:seed      # optional: demo learner + progress

# 4. Run
npm run dev          # http://localhost:3000
```

> **Auth note:** email sign-in uses a passwordless dev Credentials provider that
> upserts a user by email — fine for local/MVP. Swap in NextAuth's `EmailProvider`
> (magic links) + SMTP before production. Google is enabled automatically when
> `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.

## How the agent works

The personalization lives in `lib/agent/`:

| File | Responsibility |
|------|----------------|
| `adaptiveRules.ts` | Turns a `LearnerProfile` into a stacked block of teaching rules (dyslexia, ADHD, ESL, learning style, pace…). The single source of truth for accommodations. |
| `systemPrompt.ts` | Builds the dynamic tutor + onboarding system prompts. Injects the adaptive rules, core teaching principles, and the RETEACH protocol. |
| `confusionDetection.ts` | Fast deterministic confusion check on each user message; counts consecutive confusion to trip profile updates. |
| `spacedRepetition.ts` | Mastery-banded next-review scheduling (`<0.4`→1d, `0.4–0.7`→3d, `>0.7`→7d) with a spacing boost + EMA mastery blending. |
| `tools.ts` | Claude tool schemas (`update_learner_profile`, `get_learner_progress`, `schedule_review`, `log_confusion_event`, `get_session_context`, `complete_onboarding`) and a single validated executor. |
| `runner.ts` | Streams the model while running the multi-round tool-use loop. |

### Request flow (learning chat)

1. `POST /api/chat` resolves/creates a `LearningSession`.
2. Deterministic confusion check on the newest message; 3-in-a-row trips the
   RETEACH nudge + `update_learner_profile`.
3. `buildLearningSystemPrompt()` assembles the personalized prompt from the
   profile + current mastery.
4. `runAgent()` streams text back as plain UTF-8 chunks while executing tools.
5. The transcript + confusion count are persisted on completion.

## Accessibility

WCAG 2.1 AA is a baseline, not an afterthought:

- High-contrast theme, dyslexia-friendly **OpenDyslexic** font, font-size slider
  (14–22px), and reduce-motion — all in the `AccessibilityProvider`, applied via
  CSS variables on `<html>` so toggles are instant.
- Keyboard navigable, visible focus rings, skip-link, ARIA progressbars/live
  regions, line-height ≥ 1.6, no time limits anywhere.

## Project layout

```
app/                 routes (App Router) + API route handlers
components/          chat, onboarding, dashboard, ui (+ providers)
lib/agent/           the tutoring brain (prompts, rules, tools, runner)
lib/db/              prisma client + query layer
lib/redis/           ephemeral session state
prisma/              schema + seed
types/               shared client/server types
```
