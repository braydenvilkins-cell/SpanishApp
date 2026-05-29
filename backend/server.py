"""Nivel - voice-first adaptive Spanish learning backend."""
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from pathlib import Path
from datetime import datetime, timezone, date
import os
import io
import json
import uuid
import base64
import logging
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech

import base44
import cefr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Nivel API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("nivel")


# ---------- Models ----------
class SessionInit(BaseModel):
    session_id: Optional[str] = None


class TextTurnIn(BaseModel):
    session_id: str
    text: str
    speak: bool = True


class TranslateIn(BaseModel):
    word: str
    context: str = ""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULT_PROF = {"grammar": 10, "lexicon": 10, "fluency": 10, "pronunciation": 10, "comprehension": 10, "complexity": 10}


async def get_or_create_session(session_id: Optional[str]) -> Dict:
    if session_id:
        doc = await db.sessions.find_one({"session_id": session_id}, {"_id": 0})
        if doc:
            return doc
    sid = session_id or str(uuid.uuid4())
    doc = {
        "session_id": sid,
        "created_at": now_iso(),
        "proficiency": DEFAULT_PROF.copy(),
        "level": "A1",
        "turn": 0,
        "topic": "Presentación inicial",
        "target": "ser/estar, saludos básicos",
        "history": [],
        "vocab": {},          # lemma -> VocabEntry-dict
        "corrections": [],    # all corrections ever flagged
        "states": [],         # base-44 conversation states
    }
    await db.sessions.insert_one(doc.copy())
    return doc


async def save_session(s: Dict):
    s2 = {k: v for k, v in s.items() if k != "_id"}
    await db.sessions.update_one({"session_id": s["session_id"]}, {"$set": s2}, upsert=True)


# ---------- Helpers ----------
def parse_llm_json(raw: str) -> Dict:
    """LLMs sometimes wrap JSON in code fences or add text. Extract the first JSON object."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise
        return json.loads(m.group(0))


def update_proficiency(prof: Dict[str, int], grade: Dict[str, int], alpha: float = 0.18) -> Dict[str, int]:
    """Exponential moving average toward each new grade."""
    out = {}
    for dim in base44.PROFICIENCY_DIMS:
        old = prof.get(dim, 10)
        new = int(grade.get(dim, old))
        out[dim] = int(round(old * (1 - alpha) + new * alpha))
    return out


async def llm_turn(session: Dict, user_text: str, from_stt: bool) -> Dict:
    level = cefr.overall_level(session["proficiency"])
    system = cefr.build_system_prompt(level, session["proficiency"], session["topic"], session["target"])
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session["session_id"],
        system_message=system,
    ).with_model("openai", "gpt-5.2")

    # Inject short rolling history (last 6 turns) into the user message for context
    history_lines = []
    for h in session.get("history", [])[-6:]:
        history_lines.append(f"USER: {h['user']}\nNIVEL: {h['assistant']}")
    history_blob = "\n".join(history_lines)

    prompt = (
        f"PREVIOUS TURNS (for context only):\n{history_blob}\n\n"
        f"USER JUST SAID ({'transcribed from voice' if from_stt else 'typed'}): \"{user_text}\"\n"
        f"Reply now as the JSON object."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    return parse_llm_json(raw)


# ---------- Routes ----------
@api.get("/")
async def root():
    return {"service": "Nivel", "status": "ok"}


@api.post("/session/init")
async def session_init(body: SessionInit):
    s = await get_or_create_session(body.session_id)
    return {
        "session_id": s["session_id"],
        "level": s["level"],
        "proficiency": s["proficiency"],
        "topic": s["topic"],
        "target": s["target"],
        "turn": s["turn"],
    }


@api.get("/session/{sid}")
async def session_get(sid: str):
    s = await db.sessions.find_one({"session_id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "session not found")
    return s


@api.get("/daily")
async def daily(session_id: str):
    s = await get_or_create_session(session_id)
    day_index = date.today().toordinal()
    level = cefr.overall_level(s["proficiency"])
    prompt = cefr.pick_daily_prompt(level, day_index)
    return {"level": level, **prompt, "date": date.today().isoformat()}


@api.post("/daily/start")
async def daily_start(body: dict):
    sid = body["session_id"]
    s = await get_or_create_session(sid)
    day_index = date.today().toordinal()
    level = cefr.overall_level(s["proficiency"])
    p = cefr.pick_daily_prompt(level, day_index)
    s["topic"] = p["topic"]
    s["target"] = p["target"]
    await save_session(s)
    return {"topic": s["topic"], "target": s["target"], "opener": p["opener"]}


async def _process_turn(session: Dict, user_text: str, from_stt: bool, speak: bool) -> Dict:
    parsed = await llm_turn(session, user_text, from_stt)
    assistant_reply: str = parsed.get("assistant_reply", "Lo siento, ¿puedes repetir?")
    grade = parsed.get("cefr_grade", {})
    corrections = parsed.get("corrections", []) or []
    vocab_inj = parsed.get("vocab_injected") or {}
    pron = int(parsed.get("pronunciation_score", session["proficiency"]["pronunciation"]))
    english = parsed.get("english_gloss", "")
    tutor_tip = parsed.get("tutor_tip", "")
    strength = parsed.get("strength", "")
    next_target = parsed.get("next_target", "")

    # Update proficiency
    if from_stt:
        grade["pronunciation"] = pron
    new_prof = update_proficiency(session["proficiency"], grade)
    session["proficiency"] = new_prof
    session["level"] = cefr.overall_level(new_prof)
    session["turn"] += 1

    # Add to history
    session["history"].append({
        "turn": session["turn"],
        "user": user_text,
        "assistant": assistant_reply,
        "english": english,
        "grade": grade,
        "corrections": corrections,
        "vocab_injected": vocab_inj,
        "pronunciation_score": pron,
        "tutor_tip": tutor_tip,
        "strength": strength,
        "next_target": next_target,
        "at": now_iso(),
    })

    # Update vocab heatmap from injected + correctly-used words
    if vocab_inj and vocab_inj.get("lemma"):
        lemma = vocab_inj["lemma"].lower()
        entry = session["vocab"].get(lemma, {
            "lemma": lemma,
            "tag": next((k for k, v in base44.GRAMMAR_TAGS.items() if v == vocab_inj.get("tag")), "#"),
            "cefr": vocab_inj.get("cefr", session["level"]),
            "mastery": 5,
            "seen": 0,
            "correct": 0,
            "translation": vocab_inj.get("translation", ""),
        })
        entry["seen"] += 1
        # bump mastery proportionally to lexicon grade
        entry["mastery"] = min(99, int(entry["mastery"] + max(1, grade.get("lexicon", 10) // 10)))
        session["vocab"][lemma] = entry

    # Track corrections globally
    for c in corrections:
        c["at"] = now_iso()
        c["turn"] = session["turn"]
        session["corrections"].append(c)

    # Base-44 state snapshot
    topic_id = abs(hash(session["topic"])) % (44 ** 3)
    state_code = base44.encode_conversation_state(session["turn"], session["level"], new_prof, topic_id)
    session["states"].append(state_code)

    await save_session(session)

    # TTS
    audio_b64 = None
    if speak and assistant_reply:
        try:
            tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
            audio_b64 = await tts.generate_speech_base64(
                text=assistant_reply[:4000],
                model="tts-1",
                voice="nova",
            )
        except Exception as e:
            log.warning(f"TTS failed: {e}")

    return {
        "assistant_reply": assistant_reply,
        "english_gloss": english,
        "cefr_grade": grade,
        "corrections": corrections,
        "vocab_injected": vocab_inj,
        "pronunciation_score": pron,
        "tutor_tip": tutor_tip,
        "strength": strength,
        "next_target": next_target,
        "level": session["level"],
        "proficiency": new_prof,
        "turn": session["turn"],
        "state_b44": state_code,
        "audio_b64": audio_b64,
    }


@api.post("/turn/text")
async def turn_text(body: TextTurnIn):
    s = await get_or_create_session(body.session_id)
    return await _process_turn(s, body.text, from_stt=False, speak=body.speak)


@api.post("/turn/voice")
async def turn_voice(
    session_id: str = Form(...),
    speak: bool = Form(True),
    audio: UploadFile = File(...),
):
    s = await get_or_create_session(session_id)
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "empty audio")

    # Whisper transcription
    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    # Whisper needs a file-like object with a name
    fname = audio.filename or "audio.webm"
    bio = io.BytesIO(audio_bytes)
    bio.name = fname
    try:
        result = await stt.transcribe(
            file=bio,
            model="whisper-1",
            language="es",
            response_format="json",
        )
        user_text = (result.text or "").strip()
    except Exception as e:
        log.error(f"STT failed: {e}")
        raise HTTPException(500, f"transcription failed: {e}")

    if not user_text:
        user_text = "(silencio)"

    resp = await _process_turn(s, user_text, from_stt=True, speak=speak)
    resp["user_text"] = user_text
    return resp


@api.post("/translate")
async def translate(body: TranslateIn):
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate-{uuid.uuid4()}",
        system_message="You are a precise Spanish-English bilingual dictionary. Reply with JSON only.",
    ).with_model("openai", "gpt-5.2")
    prompt = (
        f"Translate the Spanish word '{body.word}' to English. "
        f"Context sentence: \"{body.context}\". "
        "Return JSON: {\"translation\": \"...\", \"part_of_speech\": \"...\", \"example\": \"...\", \"cefr\": \"A1|A2|B1|B2|C1|C2\"}."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    try:
        return parse_llm_json(raw)
    except Exception:
        return {"translation": raw.strip(), "part_of_speech": "", "example": "", "cefr": "A1"}


@api.get("/dashboard/{sid}")
async def dashboard(sid: str):
    s = await db.sessions.find_one({"session_id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "session not found")
    return {
        "level": s["level"],
        "proficiency": s["proficiency"],
        "turn": s["turn"],
        "topic": s["topic"],
        "target": s["target"],
        "vocab_count": len(s.get("vocab", {})),
        "correction_count": len(s.get("corrections", [])),
        "vocab": list(s.get("vocab", {}).values()),
        "recent_history": s.get("history", [])[-10:],
        "proficiency_b44": base44.encode_proficiency(s["proficiency"]),
        "level_b44": base44.encode_cefr(s["level"]),
        "states_b44": s.get("states", [])[-20:],
    }


@api.get("/review/{sid}")
async def review(sid: str):
    s = await db.sessions.find_one({"session_id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "session not found")
    # Build review deck: 1) past corrections, 2) low-mastery vocab
    deck: List[Dict[str, Any]] = []
    for c in s.get("corrections", [])[-40:]:
        deck.append({
            "kind": "correction",
            "front": c.get("wrong", ""),
            "back": c.get("correct", ""),
            "tag": c.get("tag", "error"),
            "explanation": c.get("explanation", ""),
        })
    for v in sorted(s.get("vocab", {}).values(), key=lambda x: x.get("mastery", 0))[:30]:
        deck.append({
            "kind": "vocab",
            "front": v["lemma"],
            "back": v.get("translation", ""),
            "tag": base44.GRAMMAR_TAGS.get(v.get("tag", "#"), "noun"),
            "cefr": v.get("cefr", "A1"),
            "mastery": v.get("mastery", 0),
        })
    return {"deck": deck}


@api.get("/base44/inspect/{sid}")
async def base44_inspect(sid: str):
    s = await db.sessions.find_one({"session_id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "session not found")
    encoded_vocab = []
    for v in list(s.get("vocab", {}).values())[:50]:
        try:
            entry = base44.VocabEntry(
                lemma=v["lemma"], tag=v.get("tag", "#"), cefr=v.get("cefr", "A1"),
                mastery=v.get("mastery", 0), seen=v.get("seen", 0), correct=v.get("correct", 0),
            )
            encoded_vocab.append({"lemma": v["lemma"], "b44": entry.encode()})
        except Exception:
            continue
    return {
        "alphabet": base44.ALPHABET,
        "grammar_tags": base44.GRAMMAR_TAGS,
        "proficiency_b44": base44.encode_proficiency(s["proficiency"]),
        "level_b44": base44.encode_cefr(s["level"]),
        "recent_states_b44": s.get("states", [])[-10:],
        "vocab_b44": encoded_vocab,
    }


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
