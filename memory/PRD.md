# Nivel — Voice-First Spanish Learning App

## Original problem statement
Design and ship a voice-first Spanish-learning app that:
- Uses **Base-44 encoding** internally for vocab/grammar/proficiency vectors and conversation state.
- Adapts to the user's **CEFR level (A1–C2)** in real time across six dimensions: grammar, lexicon, fluency, pronunciation, comprehension, complexity.
- Teaches Spanish through natural AI **voice conversation** (STT → LLM → TTS).
- Surfaces: voice-only mode, toggleable transcript, tap-to-translate, CEFR dashboard, vocabulary heatmap, daily conversation card, review mode, error-aware corrections, pronunciation scoring, base-44 inspector.

## Architecture (shipped 2026-05-29)
- **Backend** (`/app/backend`): FastAPI + Motor (MongoDB).
  - `base44.py` — 44-symbol alphabet (`a-z 0-9 @#$%&*+-`); encoders for ints, proficiency vector (12 chars), CEFR level (1 char), conversation state (19 chars), VocabEntry.
  - `cefr.py` — rubric, six-dim → A1/A2/B1/B2/C1/C2 mapping with numeric thresholds, daily prompt library per level, GPT system prompt template that forces structured JSON output.
  - `server.py` — endpoints: `/api/session/init`, `/api/session/{sid}`, `/api/daily`, `/api/daily/start`, `/api/turn/text`, `/api/turn/voice` (Whisper STT), `/api/translate`, `/api/dashboard/{sid}`, `/api/review/{sid}`, `/api/base44/inspect/{sid}`.
  - Integrations via `emergentintegrations`: OpenAI **GPT-5.2** chat, **Whisper-1** STT, **TTS-1** (nova voice) — single `EMERGENT_LLM_KEY`.
  - EMA update of proficiency vector each turn (α=0.18).
- **Frontend** (`/app/frontend/src`): React + Tailwind + shadcn/ui + framer-motion + recharts.
  - Swiss / high-contrast aesthetic (Cabinet Grotesk display, IBM Plex Sans body, IBM Plex Mono terminal, Klein Blue #002FA7 accent, Signal Red #FF2A00, Swiss Green #00C853, zero rounded corners).
  - Pages: Talk (voice orb + transcript), Daily (today's card), Dashboard (CEFR radar + level ladder + base-44 state), Vocab (heatmap), Review (flashcards).
  - Voice orb uses MediaRecorder (webm) → POST `/api/turn/voice` → audio played back from base64 mp3.
  - Tap-to-translate: every assistant word is a popover trigger hitting `/api/translate`.
  - Base-44 Inspector (dev panel, Sheet) shows live encoded vocab/state.

## Personas
- **The deliberate learner** — wants nightly 5–15 min practice with measurable CEFR progress.
- **The plateaued intermediate** — needs forced exposure to subjunctive, idioms, register switching.
- **The data nerd** — opens the Base-44 inspector and reads encoded proficiency vectors.

## What's implemented (2026-05-29)
- Real-time GPT-5.2 conversation with structured JSON grading.
- Whisper voice transcription, OpenAI TTS playback.
- Six-dim CEFR scoring + EMA aggregation + automatic level promotion.
- Daily prompt rotation tied to current level (A1–C2 libraries).
- Vocab heatmap with mastery progression, tap-to-translate, error-correction chips.
- Base-44 encoding of proficiency (12c), level (1c), conversation states (19c), vocab entries.
- Dev-mode Base-44 inspector panel.
- Review deck built from past corrections + low-mastery vocab.

## Backlog (P0/P1/P2)
- **P0** — Pronunciation phoneme breakdown (forced-alignment via Whisper word timestamps).
- **P0** — Streaming audio playback (websocket TTS) for sub-second latency.
- **P1** — Topic graph view (nodes of conversations + suggested next topics).
- **P1** — Spaced-repetition scheduling (SM-2) for the review deck.
- **P1** — Auth (Emergent Google login) so progress persists across devices.
- **P2** — Accent mirroring (mexicano / rioplatense / peninsular voice variants).
- **P2** — Native-level challenges (irony, regional slang, debate mode for C1/C2).
- **P2** — Export proficiency report (PDF) for tutors/certification prep.
- **P2** — Stretch: Anki deck export of base-44 encoded vocab.
