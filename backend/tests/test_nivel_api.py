"""Nivel backend API tests - session, daily, turn, dashboard, review, base44 inspect, translate."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nivel-speak.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789@#$%&*+-"


@pytest.fixture(scope="module")
def session_id():
    r = requests.post(f"{API}/session/init", json={}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "session_id" in data
    assert data["level"] == "A1"
    assert data["proficiency"] == {"grammar": 10, "lexicon": 10, "fluency": 10,
                                    "pronunciation": 10, "comprehension": 10, "complexity": 10}
    return data["session_id"]


# ---------- Session ----------
def test_session_init_returns_defaults(session_id):
    assert isinstance(session_id, str) and len(session_id) > 5


def test_session_init_existing_id_idempotent():
    sid = "TEST_fixed_session_123"
    r1 = requests.post(f"{API}/session/init", json={"session_id": sid}, timeout=30)
    r2 = requests.post(f"{API}/session/init", json={"session_id": sid}, timeout=30)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["session_id"] == sid == r2.json()["session_id"]


# ---------- Daily ----------
def test_daily_get(session_id):
    r = requests.get(f"{API}/daily", params={"session_id": session_id}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    for k in ("level", "topic", "target", "opener", "duration_min"):
        assert k in data, f"missing {k}"


def test_daily_start(session_id):
    r = requests.post(f"{API}/daily/start", json={"session_id": session_id}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "topic" in d and "target" in d and "opener" in d


# ---------- Turn text (real LLM) ----------
def test_turn_text_returns_full_shape(session_id):
    r = requests.post(f"{API}/turn/text",
                      json={"session_id": session_id, "text": "Hola, me llamo Carlos.", "speak": False},
                      timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("assistant_reply", "english_gloss", "cefr_grade", "corrections",
              "vocab_injected", "pronunciation_score", "level", "proficiency",
              "turn", "state_b44"):
        assert k in d, f"missing {k}"
    assert isinstance(d["assistant_reply"], str) and len(d["assistant_reply"]) > 0
    assert isinstance(d["corrections"], list)
    assert d["turn"] >= 1
    # Base-44 verification
    assert len(d["state_b44"]) == 19, f"state_b44 wrong length: {d['state_b44']}"
    assert all(c in ALPHABET for c in d["state_b44"]), f"invalid b44 chars in {d['state_b44']}"
    # 6 dims
    assert isinstance(d["proficiency"], dict)
    for dim in ["grammar", "lexicon", "fluency", "pronunciation", "comprehension", "complexity"]:
        assert dim in d["proficiency"]


# ---------- Translate ----------
def test_translate():
    r = requests.post(f"{API}/translate", json={"word": "hablar", "context": "Yo hablo español."}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "translation" in d
    assert isinstance(d.get("translation", ""), str)


# ---------- Dashboard ----------
def test_dashboard(session_id):
    r = requests.get(f"{API}/dashboard/{session_id}", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("level", "proficiency", "vocab_count", "correction_count",
              "vocab", "recent_history", "proficiency_b44", "level_b44", "states_b44"):
        assert k in d, f"missing {k}"
    # Base-44 size assertions
    assert len(d["proficiency_b44"]) == 12, f"proficiency_b44 should be 12 chars: {d['proficiency_b44']}"
    assert len(d["level_b44"]) == 1, f"level_b44 should be 1 char: {d['level_b44']}"
    assert all(c in ALPHABET for c in d["proficiency_b44"])
    assert d["level_b44"] in ALPHABET
    assert isinstance(d["states_b44"], list)
    for st in d["states_b44"]:
        assert len(st) == 19


def test_dashboard_404_for_unknown():
    r = requests.get(f"{API}/dashboard/TEST_does_not_exist_xyz", timeout=15)
    assert r.status_code == 404


# ---------- Review ----------
def test_review(session_id):
    r = requests.get(f"{API}/review/{session_id}", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "deck" in d and isinstance(d["deck"], list)


# ---------- Base-44 inspect ----------
def test_base44_inspect(session_id):
    r = requests.get(f"{API}/base44/inspect/{session_id}", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["alphabet"] == ALPHABET
    assert len(d["alphabet"]) == 44
    assert isinstance(d["grammar_tags"], dict)
    assert len(d["proficiency_b44"]) == 12
    assert len(d["level_b44"]) == 1
    assert isinstance(d["recent_states_b44"], list)
    for st in d["recent_states_b44"]:
        assert len(st) == 19
