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
    prompt = (
        f"{ANALYZER_PROMPT}\n\n"
        "IMPORTANT: The person's self-rating and how many prompts they skipped "
        "are the STRONGEST signal of fit. A low rating or many skips means this "
        "career is NOT a good fit, regardless of what the transcript says. A high "
        "rating with engaged answers means strong fit. Weight rating and skips "
        "above the transcript.\n\n"
        f"TRANSCRIPT:\n{transcript or '(the person skipped most or all prompts)'}\n"
        f"SELF-RATING: {rating}/10\n"
        f"SKIPPED PROMPTS: {skips}\n\n"
        "Return ONLY JSON with keys: industry, role, "
        "readiness (one of: explore, build-skills, ready), "
        "enjoyment (low/med/high), aptitude (low/med/high), "
        "fit_score (integer 0-100, honest fit for THIS person), "
        "strengths (list of short strings), gaps (list of short strings)."
    )
    resp = _client().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.strip("`").split("\n", 1)[1].rsplit("```", 1)[0]
    signals = json.loads(text)

    # --- Hard guard: extremes can't slip through as positive ---
    try:
        rating_val = int(rating)
    except (TypeError, ValueError):
        rating_val = 7

    fit = signals.get("fit_score")
    if not isinstance(fit, (int, float)):
        fit = rating_val * 10  # fall back to rating if model omitted it

    # Rating dominates: pull fit toward the rating, then clamp on extremes.
    fit = round(0.65 * (rating_val * 10) + 0.35 * fit)

    if rating_val <= 2 or skips >= 3:
        fit = min(fit, 20)
        signals["enjoyment"] = "low"
        signals["aptitude"] = signals.get("aptitude", "low")
        signals["readiness"] = "explore"
    elif rating_val >= 8 and skips == 0:
        fit = max(fit, 75)
        signals["enjoyment"] = "high"

    fit = max(0, min(100, fit))
    signals["fit_score"] = fit
    signals["fit_label"] = (
        "strong fit" if fit >= 70 else "low fit" if fit < 40 else "moderate fit"
    )
    return signals



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
    experience = user_profile.get("experience") or []
    has_experience = len(experience) > 0
    young = _is_young(user_profile)
    industry = (signals.get("industry") or "").lower()
    readiness = signals.get("readiness", "explore")

    out = []
    for s in SUGGESTIONS:
        s_industry = (s.get("industry", "") or "").lower()
        # industry relevance (loose match either direction)
        if industry and s_industry and industry not in s_industry \
                and s_industry not in industry:
            continue

        stage = s.get("stage", "both")
        if not young and stage == "high_school":
            continue
        if young and stage == "college":
            continue

        s_type = (s.get("type", "") or "").lower()
        # scholarships / intro outreach only for people WITHOUT work experience
        if has_experience and s_type in ("scholarship", "outreach"):
            continue

        # readiness gating: don't show "explore" items to someone ready, or
        # advanced "ready" items to someone just exploring
        fit = s.get("readiness_fit")
        if fit == "explore" and readiness == "ready":
            continue
        if fit == "ready" and readiness == "explore":
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

    transcript_parts = []
    for r in responses:
        if r.get("transcript"):
            transcript_parts.append(r["transcript"])
        else:
            transcript_parts.append(
                f"Q: {r.get('prompt', '')}\nA: {r.get('answer', '(skipped)')}"
            )
    transcript = "\n\n".join(part for part in transcript_parts if part)

    rating = next((r.get("rating") for r in responses if r.get("rating") is not None), 7)
    skips = sum((r.get("skip_count") or 0) for r in responses)

    signals = _analyze(transcript, rating, skips)

    resp_role = next((r.get("role") for r in responses if r.get("role")), "")
    resp_industry = next(
        (r.get("industry") for r in responses if r.get("industry")), ""
    )
    role = signals.get("role") or resp_role
    industry = signals.get("industry") or resp_industry
    readiness = signals.get("readiness") or "explore"
    strengths = signals.get("strengths") or [
        "curiosity",
        "willingness to try new things",
    ]
    fit_score = signals.get("fit_score", 50)
    fit_label = signals.get("fit_label", "moderate fit")

    role_id = next(
        (
            rid
            for rid, sc in SCENARIOS.items()
            if (sc.get("role") or "").lower() == (role or "").lower()
        ),
        None,
    )

    enjoyment = signals.get("enjoyment", "med")
    aptitude = signals.get("aptitude", "med")
    if fit_score < 40:
        why = (
            f"This one doesn't look like a strong fit — you rated it {rating}/10"
            + (f" and skipped {skips} prompts" if skips else "")
            + ". That's useful to know. Build your full map to see directions "
            "that match your profile better."
        )
    else:
        readiness_phrase = {
            "ready": "you could start pursuing it now",
            "build-skills": "building a few skills would set you up well",
            "explore": "it's worth exploring further",
        }.get(readiness, "it's worth exploring further")
        why = (
            f"You showed {enjoyment} enjoyment and {aptitude} aptitude in the "
            f"{role or 'this'} scenario, which suggests {readiness_phrase}."
        )
    confidence = (
        "high" if fit_score >= 70 else "low" if fit_score < 40 else "medium"
    )

    direction = {
        "industry": industry,
        "role": role,
        "role_id": role_id,
        "readiness": readiness,
        "why": why,
        "fit_score": fit_score,
        "fit_label": fit_label,
    }

    actions = _filter_suggestions(signals, user_profile)

    profile = {
        "best_fit": {
            "industry": industry,
            "role": role,
            "role_id": role_id,
            "readiness": readiness,
            "why": why,
            "confidence": confidence,
            "fit_score": fit_score,
        },
        "strengths": strengths,
        "gaps": signals.get("gaps", []) or [],
        "roles_explored": [
            {
                "industry": industry,
                "role": role,
                "sessions_seen": 1,
                "strength_score": fit_score,
            }
        ],
        "shift_note": None,
    }

    return {"direction": direction, "actions": actions, "profile": profile}
