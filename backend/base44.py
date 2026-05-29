"""
Base-44 encoding layer for the Nivel Spanish learning app.

WHY 44 SYMBOLS?
    - Spanish phoneme inventory has ~24 phonemes; CEFR has 6 levels (A1..C2);
      6 proficiency dimensions; 8 core grammar tags. We want a compact,
      URL-safe, human-readable alphabet that fits every dimension we encode
      while staying smaller than Base64 (44 = 26 letters + 10 digits + 8 grammar
      symbols, with no `0/O/1/l` confusion when used in the inspector view).
    - 44^N grows fast: 1 char = 44 buckets (perfect for a single CEFR sublevel),
      2 chars = 1,936 buckets (vocab frequency band), 3 chars = 85,184
      (large enough to enumerate every Spanish lemma we care about).

ALPHABET (index 0..43):
    0-25  -> a-z  (lemma / phoneme payload)
    26-35 -> 0-9  (counters, level markers)
    36-43 -> @ # $ % & * + -   (grammar tags / control symbols)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Iterable

ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789@#$%&*+-"
assert len(ALPHABET) == 44, "Base-44 alphabet MUST be exactly 44 symbols"
_IDX = {c: i for i, c in enumerate(ALPHABET)}

# Grammar tag mapping uses the 8 symbol slots at the tail of the alphabet.
GRAMMAR_TAGS: Dict[str, str] = {
    "@": "verb",        # @ = conjugated verb
    "#": "noun",        # # = noun phrase
    "$": "adjective",   # $ = adjective / participle
    "%": "preposition", # % = preposition
    "&": "conjunction", # & = conjunction / discourse marker
    "*": "idiom",       # * = idiomatic chunk
    "+": "subjunctive", # + = subjunctive mood marker
    "-": "error",       # - = flagged user error
}

CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
PROFICIENCY_DIMS = ["grammar", "lexicon", "fluency", "pronunciation", "comprehension", "complexity"]


def encode_int(n: int, width: int = 0) -> str:
    """Encode a non-negative int in base-44. Optionally left-pad with 'a' (=0)."""
    if n < 0:
        raise ValueError("base-44 encodes non-negative integers")
    if n == 0:
        return "a" * max(width, 1)
    out: List[str] = []
    while n:
        n, r = divmod(n, 44)
        out.append(ALPHABET[r])
    s = "".join(reversed(out))
    return s.rjust(width, "a") if width else s


def decode_int(s: str) -> int:
    n = 0
    for c in s:
        if c not in _IDX:
            raise ValueError(f"invalid base-44 char: {c!r}")
        n = n * 44 + _IDX[c]
    return n


def encode_proficiency(scores: Dict[str, int]) -> str:
    """
    Encode the 6-dim CEFR proficiency vector into a 12-char base-44 string.
    Each dimension is a 0-99 integer rendered as 2 base-44 chars (00..99 -> 'aa'..),
    enough resolution for fine-grained scoring (44^2 = 1936 buckets per dim).
    """
    parts: List[str] = []
    for dim in PROFICIENCY_DIMS:
        v = int(scores.get(dim, 0))
        v = max(0, min(99, v))
        # map 0..99 to 0..1935 (preserves 2-char width)
        parts.append(encode_int(v * 19, width=2))  # 99*19 = 1881 < 1936
    return "".join(parts)


def decode_proficiency(code: str) -> Dict[str, int]:
    if len(code) != 12:
        raise ValueError("proficiency code must be 12 chars")
    out: Dict[str, int] = {}
    for i, dim in enumerate(PROFICIENCY_DIMS):
        chunk = code[i * 2:i * 2 + 2]
        raw = decode_int(chunk)
        out[dim] = int(round(raw / 19))
    return out


def encode_cefr(level: str) -> str:
    """A1->'0', A2->'1', ... C2->'5' in base-44 ('0' is at index 26)."""
    return ALPHABET[26 + CEFR_LEVELS.index(level)]


def decode_cefr(c: str) -> str:
    return CEFR_LEVELS[_IDX[c] - 26]


@dataclass
class VocabEntry:
    lemma: str          # Spanish lemma, e.g. "hablar"
    tag: str            # one of GRAMMAR_TAGS keys
    cefr: str           # A1..C2
    mastery: int        # 0..99
    seen: int           # times encountered
    correct: int        # times produced correctly

    def encode(self) -> str:
        """
        Compact base-44 line:  <lemma><tag><cefr><mastery:2><seen:2><correct:2>
        e.g. "hablar@0az0a0a"  -> hablar (verb, A1, mastery 0, seen 0, correct 0)
        """
        return (
            self.lemma
            + self.tag
            + encode_cefr(self.cefr)
            + encode_int(self.mastery, width=2)
            + encode_int(self.seen, width=2)
            + encode_int(self.correct, width=2)
        )

    @classmethod
    def decode(cls, code: str) -> "VocabEntry":
        # tail: tag(1)+cefr(1)+m(2)+s(2)+c(2) = 8
        lemma = code[:-8]
        tag = code[-8]
        cefr = decode_cefr(code[-7])
        mastery = decode_int(code[-6:-4])
        seen = decode_int(code[-4:-2])
        correct = decode_int(code[-2:])
        return cls(lemma, tag, cefr, mastery, seen, correct)


def encode_conversation_state(turn: int, level: str, prof: Dict[str, int], topic_id: int) -> str:
    """
    State snapshot: <turn:3><level:1><prof:12><topic:3> = 19 chars.
    Stored at every turn so we can replay/inspect the session.
    """
    return (
        encode_int(turn, width=3)
        + encode_cefr(level)
        + encode_proficiency(prof)
        + encode_int(topic_id, width=3)
    )


def decode_conversation_state(code: str) -> Dict:
    if len(code) != 19:
        raise ValueError("state code must be 19 chars")
    return {
        "turn": decode_int(code[:3]),
        "level": decode_cefr(code[3]),
        "proficiency": decode_proficiency(code[4:16]),
        "topic_id": decode_int(code[16:]),
    }
