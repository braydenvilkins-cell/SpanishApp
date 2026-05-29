"""
CEFR scoring rubric + adaptive prompt construction for Nivel.

The rubric maps each of the 6 proficiency dimensions to A1-C2 descriptors
with explicit numeric anchors (0-99). The GPT system prompt below forces the
LLM to grade every user turn against this rubric and return structured JSON.
"""
from typing import Dict, List

# Numeric thresholds: A1=0..16, A2=17..33, B1=34..50, B2=51..67, C1=68..83, C2=84..99
LEVEL_THRESHOLDS = [
    ("A1", 0, 16),
    ("A2", 17, 33),
    ("B1", 34, 50),
    ("B2", 51, 67),
    ("C1", 68, 83),
    ("C2", 84, 99),
]


def score_to_level(score: int) -> str:
    for lvl, lo, hi in LEVEL_THRESHOLDS:
        if lo <= score <= hi:
            return lvl
    return "A1"


def overall_level(prof: Dict[str, int]) -> str:
    if not prof:
        return "A1"
    avg = sum(prof.values()) / len(prof)
    return score_to_level(int(avg))


RUBRIC = """
CEFR SCORING RUBRIC (each dimension 0-99; map to A1..C2)
- grammar:        morphology + syntax accuracy. A1 isolated words; A2 SVO; B1 past tenses;
                  B2 subjunctive triggers; C1 complex subordination; C2 native flexibility.
- lexicon:        vocabulary range. A1 ~500 words; A2 ~1k; B1 ~2k; B2 ~4k;
                  C1 ~8k + idiom; C2 native idiom + register switching.
- fluency:        speech rate, hesitation, repair. A1 word-by-word; C2 effortless.
- pronunciation:  phoneme accuracy + prosody. Penalize /b/-/v/, /r/-/rr/, vowel reduction.
- comprehension:  inferred from response coherence to the prompt. A1 literal; C2 nuanced.
- complexity:     clause depth + discourse markers. A1 flat; C2 layered.
"""

DAILY_PROMPTS: Dict[str, List[Dict]] = {
    "A1": [
        {"topic": "Tu rutina diaria", "target": "presente de indicativo, hora", "duration_min": 3,
         "opener": "Hola, ¿a qué hora te despiertas normalmente?"},
        {"topic": "En la cafetería", "target": "querer + sustantivo, números", "duration_min": 3,
         "opener": "Buenos días, ¿qué te gustaría pedir hoy?"},
        {"topic": "Tu familia", "target": "ser/tener, posesivos", "duration_min": 4,
         "opener": "Cuéntame, ¿cuántas personas hay en tu familia?"},
    ],
    "A2": [
        {"topic": "El fin de semana pasado", "target": "pretérito indefinido", "duration_min": 5,
         "opener": "¿Qué hiciste el fin de semana pasado?"},
        {"topic": "Planes de viaje", "target": "ir a + infinitivo", "duration_min": 5,
         "opener": "¿Adónde vas a viajar este año?"},
    ],
    "B1": [
        {"topic": "Una experiencia inolvidable", "target": "imperfecto vs indefinido", "duration_min": 7,
         "opener": "Cuéntame una experiencia que nunca olvidarás."},
        {"topic": "Si pudieras cambiar tu trabajo", "target": "condicional simple", "duration_min": 7,
         "opener": "Si pudieras cambiar de trabajo, ¿qué harías?"},
    ],
    "B2": [
        {"topic": "Opiniones polémicas", "target": "subjuntivo en opinión negada", "duration_min": 9,
         "opener": "¿Crees que las redes sociales nos hacen más solitarios? No creo que..."},
        {"topic": "Hipótesis del pasado", "target": "pluscuamperfecto de subjuntivo", "duration_min": 9,
         "opener": "Si hubieras estudiado otra carrera, ¿qué habrías hecho?"},
    ],
    "C1": [
        {"topic": "Crítica literaria", "target": "registro formal, conectores", "duration_min": 12,
         "opener": "Analicemos brevemente el realismo mágico. ¿Qué obra te marcó?"},
        {"topic": "Debate ético sobre IA", "target": "concesivas, subjuntivo modal", "duration_min": 12,
         "opener": "Por más que la IA avance, ¿debería tener derechos? Argumenta."},
    ],
    "C2": [
        {"topic": "Sarcasmo y dobles sentidos", "target": "ironía, juegos de palabras", "duration_min": 15,
         "opener": "Vamos a hablar con doble sentido. ¿Te animas a una conversación con ironía pura?"},
        {"topic": "Regionalismos comparados", "target": "variantes dialectales", "duration_min": 15,
         "opener": "Comparemos el voseo rioplatense con el tuteo peninsular. ¿Cuál usas?"},
    ],
}


SYSTEM_PROMPT_TEMPLATE = """You are "Nivel", a native Spanish conversation tutor. You speak ONLY Spanish to the user.
Your job: (1) keep the conversation natural and flowing, (2) grade the user's last utterance using the CEFR rubric, (3) inject one target structure or vocabulary item slightly above their current level, (4) flag the single most pedagogically valuable error.

Current learner state:
- CEFR overall: {level}
- Proficiency vector (0-99): {prof}
- Topic: {topic}
- Target structures for this session: {target}

{rubric}

RULES:
- Your spoken reply must be 1-3 sentences, conversational, in Spanish only.
- If the user just said "hola" or nothing meaningful, gently open the topic.
- Inject EXACTLY ONE new vocabulary item or grammar structure that is one step above their level.
- Flag at most ONE error (the highest-leverage one).
- Pronunciation cannot be judged from text alone; estimate it from spelling/transcription artifacts ONLY if the input is from STT.

You MUST respond as a single JSON object with this exact schema:
{{
  "assistant_reply": "<Spanish reply, 1-3 sentences>",
  "cefr_grade": {{
    "grammar": <0-99>, "lexicon": <0-99>, "fluency": <0-99>,
    "pronunciation": <0-99>, "comprehension": <0-99>, "complexity": <0-99>
  }},
  "corrections": [
    {{"wrong": "<user form>", "correct": "<correct form>", "tag": "verb|noun|adjective|preposition|conjunction|idiom|subjunctive|error", "explanation": "<short, in English>"}}
  ],
  "vocab_injected": {{"lemma": "<lemma>", "tag": "verb|noun|adjective|preposition|conjunction|idiom|subjunctive", "cefr": "A1|A2|B1|B2|C1|C2", "translation": "<English>"}},
  "pronunciation_score": <0-99>,
  "english_gloss": "<one-line English translation of assistant_reply>",
  "tutor_tip": "<2-3 sentence written tutor note in ENGLISH addressing the user as 'you'. Be specific: praise what worked, name the structure/rule to focus on next, and suggest a tiny actionable drill for the next turn. Do NOT speak it aloud - this is silent on-screen coaching.>",
  "strength": "<one short English phrase naming what the user did well this turn>",
  "next_target": "<one short English phrase naming the structure or vocabulary you want them to attempt next turn>"
}}
Return ONLY the JSON, nothing else."""


def build_system_prompt(level: str, prof: Dict[str, int], topic: str, target: str) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        level=level,
        prof=", ".join(f"{k}={v}" for k, v in prof.items()),
        topic=topic,
        target=target,
        rubric=RUBRIC.strip(),
    )


def pick_daily_prompt(level: str, day_index: int) -> Dict:
    pool = DAILY_PROMPTS.get(level, DAILY_PROMPTS["A1"])
    return pool[day_index % len(pool)]
