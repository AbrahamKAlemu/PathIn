import json
import os
import urllib.request
from pathlib import Path

from openai import OpenAI

DATA = Path(__file__).parent / "data"
client = None


def _client():
    global client
    if client is None:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client


def _load_json(name):
    return json.loads((DATA / name).read_text())


def _load_text(name):
    return (DATA / name).read_text()


SCENARIOS = {s["role_id"]: s for s in _load_json("scenarios.json")["scenarios"]}
SUGGESTIONS = _load_json("suggestions_dataset.json")["suggestions"]
ANALYZER_PROMPT = _load_text("analyzer_prompt.txt")


def get_roles():
    return {"roles": [{"role_id": s["role_id"],
                       "role": s.get("role") or s.get("title", ""),
                       "industry": s.get("industry", "")}
                      for s in SCENARIOS.values()]}


def get_scenario(role_id):
    scenario = SCENARIOS.get(role_id)
    if not scenario:
        return None
    return {"scenario": scenario}


def _analyze(transcript, rating, skips):
    prompt = (f"{ANALYZER_PROMPT}\n\nTRANSCRIPT:\n{transcript}\n"
              f"RATING: {rating}/10\nSKIPS: {skips}\n\n"
              "Return ONLY JSON with keys: industry, role, readiness "
              "(one of: explore, build-skills, ready), enjoyment (low/med/high), "
              "aptitude (low/med/high), strengths (list of short strings).")
    resp = _client().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.strip("`").split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


def _is_young(user_profile):
    headline = (user_profile.get("headline") or "").lower()
    experience = user_profile.get("experience") or []
    young_words = ("high school", "hs ", "freshman", "sophomore",
                   "junior", "senior", "student", "grade")
    if any(w in headline for w in young_words):
        return True
    return len(experience) == 0


def _shape_profile(signals, user_profile):
    return {
        "name": user_profile.get("name", "Explorer"),
        "headline": user_profile.get("headline")
        or f"Interested in {signals.get('role', 'new careers')}",
        "location": user_profile.get("location", ""),
        "education": user_profile.get("education", []),
        "experience": user_profile.get("experience", []),
        "skills": (user_profile.get("skills", []) + signals.get("strengths", []))[:12],
        "interests": ([signals.get("industry")] if signals.get("industry") else [])
        + (user_profile.get("interests") or []),
    }


def _explore(profile):
    from .career_service import CareerService
    return CareerService().explore({"profile": profile, "resultCount": 4})


def _filter_suggestions(signals, user_profile):
    young = _is_young(user_profile)
    industry = (signals.get("industry") or "").lower()
    readiness = signals.get("readiness", "explore")
    out = []
    for s in SUGGESTIONS:
        if industry and industry not in (s.get("industry", "").lower()):
            continue
        stage = s.get("stage", "both")
        if not young and stage == "high_school":
            continue
        if young and stage == "college":
            continue
        if not young and s.get("readiness_fit") == "explore" \
                and readiness == "ready":
            continue
        out.append(s)
    return out[:4]


def _suggestion_node(s, idx):
    cost = (s.get("details", {}) or {}).get("cost") or s.get("cost") or "varies"
    commitment = s.get("commitment") or (s.get("details", {}) or {}).get(
        "commitment") or "flexible"
    prereq = s.get("prereq") or "no prereq"
    kind = s.get("type", "opportunity").title()
    return {
        "id": f"suggestion-{idx}",
        "type": "course",
        "label": s.get("title", "Opportunity"),
        "eyebrow": f"{kind} · {cost} · {prereq}",
        "summary": s.get("summary")
        or f"A {s.get('type', 'step')} others have used to break in.",
        "stage": "Could lead to opportunities",
        "workSetting": commitment,
        "whyItFits": [f"Fits your interest in {s.get('industry', 'this field')}."],
        "responsibilities": [],
        "existingSkills": [],
        "transferableSkills": [],
        "skillsToBuild": s.get("skills_built", []) or [],
        "preview": s.get("summary", ""),
        "challenges": [],
        "sourceRecord": {"id": s.get("id", f"sug-{idx}"),
                         "kind": "generated", "label": "Suggested step"},
    }


def _inject(career_map, suggestions):
    try:
        nodes = career_map.get("nodes", [])
        paths = career_map.get("paths", [])
        if not nodes or not paths:
            return career_map
        current = next((n for n in nodes if n.get("type") == "current"), nodes[0])
        path = paths[0]
        new_nodes, new_edges, new_ids = [], [], []
        for i, s in enumerate(suggestions):
            node = _suggestion_node(s, i)
            new_nodes.append(node)
            new_ids.append(node["id"])
            new_edges.append({
                "id": f"edge-sug-{i}",
                "source": current["id"],
                "target": node["id"],
                "type": "helpful_preparation",
                "evidenceLevel": "inferred",
                "explanation": "A practical step you could take from here.",
                "evidenceLabel": "Suggested",
                "privacyStatus": "not_applicable",
                "cohortSizeBucket": "not_applicable",
            })
        career_map["nodes"] = nodes + new_nodes
        career_map["edges"] = career_map.get("edges", []) + new_edges
        order = path.get("nodeIds", [])
        insert_at = 1 if len(order) > 1 else len(order)
        path["nodeIds"] = order[:insert_at] + new_ids + order[insert_at:]
        return career_map
    except Exception:
        return career_map


def generate_suggestions(payload):
    user_profile = payload.get("user_profile", {}) or {}
    responses = payload.get("new_responses", []) or []
    transcript = "\n".join(
        f"Q: {r.get('prompt', '')}\nA: {r.get('answer', '(skipped)')}"
        for r in responses)
    rating = next((r.get("rating") for r in responses if r.get("rating")), 7)
    skips = sum(1 for r in responses if not r.get("answer"))

    signals = _analyze(transcript, rating, skips)
    profile = _shape_profile(signals, user_profile)
    career_map = _explore(profile)

    if _is_young(user_profile):
        career_map = _inject(career_map, _filter_suggestions(signals, user_profile))

    return career_map
