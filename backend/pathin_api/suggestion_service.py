from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"
SCENARIOS = {
    scenario["role_id"]: scenario
    for scenario in json.loads(
        (DATA_DIR / "scenarios.json").read_text(encoding="utf-8")
    )["scenarios"]
}
SUGGESTIONS = json.loads(
    (DATA_DIR / "suggestions_dataset.json").read_text(encoding="utf-8")
)["suggestions"]
ANALYZER_PROMPT = (DATA_DIR / "analyzer_prompt.txt").read_text(
    encoding="utf-8"
)

READINESS_LEVELS = (
    "explore",
    "build-skills",
    "gain-experience",
    "apply",
)

SHAPE_SIGNALS: dict[str, dict[str, list[str] | str]] = {
    "building": {
        "strengths": [
            "breaking an ambiguous problem into steps",
            "testing ideas against user or system constraints",
        ],
        "gap": "turn the reasoning into a small, reviewable work sample",
    },
    "troubleshooting": {
        "strengths": [
            "isolating likely causes before making changes",
            "balancing urgency with evidence",
        ],
        "gap": "practice with logs, monitoring, and incident follow-through",
    },
    "analytical": {
        "strengths": [
            "questioning assumptions before accepting a claim",
            "looking for missing variables and measurable evidence",
        ],
        "gap": "practice defining a test and explaining the result clearly",
    },
    "decision-making": {
        "strengths": [
            "comparing tradeoffs instead of treating every request equally",
            "asking what evidence would change a decision",
        ],
        "gap": "practice defining success metrics before committing a team",
    },
    "creative": {
        "strengths": [
            "shaping an idea around a specific audience",
            "iterating after weak feedback",
        ],
        "gap": "validate the idea with a small audience and measurable outcome",
    },
    "people-facing": {
        "strengths": [
            "listening for the concern behind the first statement",
            "protecting trust while working within real constraints",
        ],
        "gap": "practice closing the loop with a specific follow-up plan",
    },
}

ROLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "software-engineer": (
        "hash",
        "set",
        "dictionary",
        "complexity",
        "edge case",
        "duplicate",
        "loop",
        "test",
    ),
    "devops-engineer": (
        "rollback",
        "logs",
        "metrics",
        "monitor",
        "deploy",
        "incident",
        "status",
        "communicate",
    ),
    "data-scientist": (
        "correlation",
        "causation",
        "sample",
        "season",
        "variable",
        "experiment",
        "bias",
        "validate",
    ),
    "financial-analyst": (
        "revenue",
        "cost",
        "margin",
        "break-even",
        "forecast",
        "assumption",
        "cash",
        "pilot",
    ),
    "ux-designer": (
        "user",
        "friction",
        "test",
        "prototype",
        "accessibility",
        "journey",
        "feedback",
        "observe",
    ),
    "product-manager": (
        "impact",
        "severity",
        "customer",
        "metric",
        "tradeoff",
        "priority",
        "evidence",
        "risk",
    ),
    "marketing-specialist": (
        "audience",
        "message",
        "channel",
        "test",
        "segment",
        "feedback",
        "measure",
        "brand",
    ),
    "sales-representative": (
        "budget",
        "need",
        "question",
        "trust",
        "alternative",
        "value",
        "listen",
        "follow up",
    ),
    "hr-coordinator": (
        "listen",
        "confidential",
        "consent",
        "document",
        "follow up",
        "policy",
        "support",
        "context",
    ),
    "customer-service-manager": (
        "acknowledge",
        "listen",
        "resolve",
        "escalate",
        "follow up",
        "constraint",
        "ownership",
        "root cause",
    ),
}

ROLE_SIGNAL_STRENGTHS: dict[str, str] = {
    "software-engineer": (
        "choosing an efficient lookup strategy and checking edge cases"
    ),
    "devops-engineer": (
        "triaging an incident with rollback, monitoring, and communication"
    ),
    "data-scientist": (
        "separating correlation from causation and naming confounders"
    ),
    "financial-analyst": (
        "testing revenue assumptions against costs and break-even"
    ),
    "ux-designer": (
        "tracing user friction before proposing and testing a fix"
    ),
    "product-manager": (
        "prioritizing by user impact, risk, and measurable outcomes"
    ),
    "marketing-specialist": (
        "defining a specific audience and iterating on the message"
    ),
    "sales-representative": (
        "discovering the customer's constraint before proposing an option"
    ),
    "hr-coordinator": (
        "listening carefully while respecting consent and confidentiality"
    ),
    "customer-service-manager": (
        "acknowledging the impact, setting constraints, and owning follow-up"
    ),
}

ROLE_NEXT_TESTS: dict[str, str] = {
    "software-engineer": (
        "build the solution and explain its time and memory tradeoffs in a "
        "reviewable project"
    ),
    "devops-engineer": (
        "run a small incident drill using logs, rollback steps, and a "
        "post-incident note"
    ),
    "data-scientist": (
        "test one hypothesis with real data and document possible confounders"
    ),
    "financial-analyst": (
        "build a simple model with explicit assumptions and a break-even case"
    ),
    "ux-designer": (
        "prototype the shorter flow and observe where several users still stall"
    ),
    "product-manager": (
        "write the decision, rejected alternatives, and success metric before "
        "delivery"
    ),
    "marketing-specialist": (
        "test two messages with one defined audience and compare the response"
    ),
    "sales-representative": (
        "practice a discovery conversation that ends with an honest next step"
    ),
    "hr-coordinator": (
        "document a consent-aware response and a concrete follow-up checkpoint"
    ),
    "customer-service-manager": (
        "practice a resolution that includes ownership, limits, and follow-up"
    ),
}

ROLE_SUGGESTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "software-engineer": (
        "software",
        "coding",
        "computer",
        "engineer",
        "hack",
    ),
    "devops-engineer": (
        "software",
        "coding",
        "computer",
        "engineer",
        "cloud",
    ),
    "data-scientist": ("data", "analytics", "statistics", "science"),
    "financial-analyst": ("finance", "financial", "accounting", "investing"),
    "ux-designer": ("ux", "design", "user", "prototype"),
    "product-manager": ("product", "business", "technology", "startup"),
    "marketing-specialist": ("marketing", "brand", "social", "creative"),
    "sales-representative": ("sales", "business", "customer", "retail"),
    "hr-coordinator": ("people", "leadership", "mentor", "communication"),
    "customer-service-manager": (
        "customer",
        "service",
        "support",
        "communication",
    ),
}

ROLE_PRACTICE_PROJECTS: dict[str, tuple[str, str]] = {
    "software-engineer": (
        "Build and benchmark the pair-finding solution",
        (
            "Implement two approaches, test duplicate and empty inputs, and "
            "compare their time and memory use."
        ),
    ),
    "devops-engineer": (
        "Run a production-incident tabletop",
        (
            "Write the first checks, rollback decision, stakeholder update, "
            "and prevention follow-up for the outage scenario."
        ),
    ),
    "data-scientist": (
        "Test the ice-cream and website-crash claim",
        (
            "Use a small dataset to test the relationship, list confounders, "
            "and explain what the evidence cannot prove."
        ),
    ),
    "financial-analyst": (
        "Model the store's extended-hours decision",
        (
            "Build a one-page model covering staffing, utilities, expected "
            "sales, break-even, and a downside case."
        ),
    ),
    "ux-designer": (
        "Prototype and test a one-tap reorder flow",
        (
            "Create a low-fidelity flow, test it with several people, and "
            "document where anyone still gets stuck."
        ),
    ),
    "product-manager": (
        "Write the one-page priority decision",
        (
            "Choose among the crash, dark mode, and client feature; document "
            "the tradeoff, rejected options, and success metric."
        ),
    ),
    "marketing-specialist": (
        "Run a two-message audience test",
        (
            "Define one teenage audience, create two water-bottle messages, "
            "and compare which one earns a stronger response."
        ),
    ),
    "sales-representative": (
        "Practice a trust-first laptop conversation",
        (
            "Write a short discovery script that identifies budget and need "
            "before recommending a product or letting the customer walk."
        ),
    ),
    "hr-coordinator": (
        "Draft a consent-aware response and follow-up",
        (
            "Document what you would say to Jordan, what remains private, and "
            "the specific condition that would require escalation."
        ),
    ),
    "customer-service-manager": (
        "Write the recovery plan for Mr. Alvarez",
        (
            "Cover the first response, limits on what can be promised, team "
            "follow-up, and the signal that trust was actually restored."
        ),
    ),
}


def get_roles() -> dict[str, list[dict[str, str]]]:
    return {
        "roles": [
            {
                "role_id": scenario["role_id"],
                "role": scenario["role"],
                "industry": scenario["industry"],
                "shape": scenario["shape"],
            }
            for scenario in SCENARIOS.values()
        ]
    }


def get_scenario(role_id: str) -> dict[str, dict[str, Any]] | None:
    scenario = SCENARIOS.get(role_id)
    return {"scenario": scenario} if scenario else None


def _clean_strings(values: Any, *, limit: int = 12) -> list[str]:
    if not isinstance(values, list):
        return []
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = re.sub(r"\s+", " ", str(value)).strip()
        key = text.casefold()
        if not text or key in seen:
            continue
        seen.add(key)
        cleaned.append(text[:160])
        if len(cleaned) >= limit:
            break
    return cleaned


def _bounded_rating(value: Any) -> int:
    try:
        return min(10, max(1, int(value)))
    except (TypeError, ValueError):
        return 5


def _bounded_skips(value: Any) -> int:
    try:
        return min(20, max(0, int(value)))
    except (TypeError, ValueError):
        return 0


def _profile_text(user_profile: dict[str, Any]) -> str:
    fields = [
        user_profile.get("headline", ""),
        *(_clean_strings(user_profile.get("education"))),
        *(_clean_strings(user_profile.get("experience"))),
        *(_clean_strings(user_profile.get("skills"))),
        *(_clean_strings(user_profile.get("interests"))),
        *(_clean_strings(user_profile.get("goals"))),
    ]
    return " ".join(str(value) for value in fields).casefold()


def _fallback_analysis(
    scenario: dict[str, Any],
    transcript: str,
    rating: int,
    skips: int,
    user_profile: dict[str, Any],
) -> dict[str, Any]:
    transcript_text = transcript.casefold()
    word_count = len(re.findall(r"\b[\w'-]+\b", transcript_text))
    keyword_hits = sum(
        1
        for keyword in ROLE_KEYWORDS.get(scenario["role_id"], ())
        if keyword in transcript_text
    )
    answered_turns = max(0, transcript.count("You:") - transcript.count("(skipped)"))
    engagement_score = min(
        100,
        max(0, word_count // 2 + answered_turns * 11 - skips * 12),
    )
    aptitude_score = min(
        100,
        32 + keyword_hits * 8 + min(24, word_count // 8),
    )

    profile_text = _profile_text(user_profile)
    role_terms = {
        term
        for term in re.findall(r"[a-z]+", scenario["role"].casefold())
        if len(term) > 3
    }
    matched_role_terms = sum(term in profile_text for term in role_terms)
    profile_match = bool(
        role_terms and matched_role_terms >= min(2, len(role_terms))
    )
    exact_role_match = scenario["role"].casefold() in profile_text
    if profile_match:
        aptitude_score = min(100, aptitude_score + 8)

    fit_score = round(
        0.55 * rating * 10
        + 0.25 * aptitude_score
        + 0.20 * engagement_score
    )
    if rating <= 2 or skips >= 4:
        fit_score = min(fit_score, 28)
    fit_score = min(100, max(0, fit_score))

    if fit_score >= 85 and exact_role_match and keyword_hits >= 5:
        readiness = "apply"
    elif fit_score >= 66 and keyword_hits >= 2:
        readiness = "gain-experience"
    elif fit_score >= 45:
        readiness = "build-skills"
    else:
        readiness = "explore"

    shape = SHAPE_SIGNALS.get(
        scenario.get("shape", ""),
        SHAPE_SIGNALS["analytical"],
    )
    strengths = (
        [
            ROLE_SIGNAL_STRENGTHS[scenario["role_id"]],
            *list(shape["strengths"]),
        ]
        if keyword_hits >= 2
        else list(shape["strengths"])[:1]
    )
    if profile_match:
        strengths.append(
            f"connected profile evidence already supports {scenario['role']}",
        )

    return {
        "industry": scenario["industry"],
        "role": scenario["role"],
        "readiness": readiness,
        "enjoyment": "high" if rating >= 8 else "low" if rating <= 4 else "medium",
        "aptitude": (
            "high"
            if aptitude_score >= 72
            else "low"
            if aptitude_score < 45
            else "medium"
        ),
        "fit_score": fit_score,
        "strengths": strengths[:3],
        "gaps": [
            ROLE_NEXT_TESTS.get(
                scenario["role_id"],
                str(shape["gap"]),
            )
        ],
        "engagement_depth": (
            "high"
            if engagement_score >= 70
            else "low"
            if engagement_score < 35
            else "medium"
        ),
        "confidence": (
            "high"
            if answered_turns >= 5 and skips == 0
            else "low"
            if answered_turns < 2 or skips >= 4
            else "medium"
        ),
    }


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    payload = json.loads(cleaned)
    if not isinstance(payload, dict):
        raise ValueError("Analyzer response must be a JSON object.")
    return payload


def _ai_analysis(
    scenario: dict[str, Any],
    transcript: str,
    rating: int,
    skips: int,
    user_profile: dict[str, Any],
) -> dict[str, Any] | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from openai import OpenAI

        profile_context = {
            "headline": str(user_profile.get("headline", ""))[:240],
            "education": _clean_strings(user_profile.get("education"), limit=5),
            "experience": _clean_strings(
                user_profile.get("experience"),
                limit=6,
            ),
            "skills": _clean_strings(user_profile.get("skills"), limit=12),
            "interests": _clean_strings(
                user_profile.get("interests"),
                limit=8,
            ),
        }
        prompt = (
            f"{ANALYZER_PROMPT}\n\n"
            f"SCENARIO ROLE: {scenario['role']}\n"
            f"SCENARIO INDUSTRY: {scenario['industry']}\n"
            f"CONNECTED PROFILE EVIDENCE: {json.dumps(profile_context)}\n"
            f"TRANSCRIPT:\n{transcript or '(no written response)'}\n"
            f"SELF-RATING: {rating}/10\n"
            f"SKIPPED PROMPTS: {skips}\n\n"
            "The rating measures preference, not competence. Treat skips as "
            "missing evidence, not automatic dislike. Return the JSON shape "
            "specified above and do not invent profile facts."
        )
        response = OpenAI(api_key=api_key).chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content or "{}"
        return _extract_json(content)
    except Exception:
        return None


def _normalize_analysis(
    raw: dict[str, Any],
    fallback: dict[str, Any],
    scenario: dict[str, Any],
    rating: int,
    skips: int,
) -> dict[str, Any]:
    analysis = {**fallback, **raw}
    analysis["role"] = scenario["role"]
    analysis["industry"] = scenario["industry"]
    readiness = str(analysis.get("readiness", "")).strip().casefold()
    readiness_aliases = {
        "ready": "apply",
        "gain experience": "gain-experience",
        "gain_experience": "gain-experience",
        "build skills": "build-skills",
        "build_skills": "build-skills",
    }
    readiness = readiness_aliases.get(readiness, readiness)
    analysis["readiness"] = (
        readiness if readiness in READINESS_LEVELS else fallback["readiness"]
    )
    analysis["strengths"] = _clean_strings(
        analysis.get("strengths"),
        limit=4,
    ) or fallback["strengths"]
    analysis["gaps"] = _clean_strings(analysis.get("gaps"), limit=3) or fallback[
        "gaps"
    ]

    try:
        model_fit = int(analysis.get("fit_score", fallback["fit_score"]))
    except (TypeError, ValueError):
        model_fit = int(fallback["fit_score"])
    fit_score = round(0.55 * rating * 10 + 0.45 * model_fit)
    if rating <= 2 or skips >= 4:
        fit_score = min(fit_score, 28)
    analysis["fit_score"] = min(100, max(0, fit_score))
    analysis["fit_label"] = (
        "strong fit"
        if analysis["fit_score"] >= 70
        else "low fit"
        if analysis["fit_score"] < 40
        else "moderate fit"
    )
    return analysis


def _stage_for(user_profile: dict[str, Any]) -> str:
    explicit = str(user_profile.get("stage", "")).casefold()
    if explicit in {"high_school", "college", "both"}:
        return explicit
    profile_text = _profile_text(user_profile)
    if "high school" in profile_text:
        return "high_school"
    if any(
        term in profile_text
        for term in ("university", "college", "bachelor", "master", "stanford")
    ):
        return "college"
    return "both"


def _is_past_deadline(value: Any) -> bool:
    text = str(value or "").strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return False
    try:
        return datetime.strptime(text, "%Y-%m-%d").date() < datetime.now(
            timezone.utc
        ).date()
    except ValueError:
        return False


def _filter_suggestions(
    analysis: dict[str, Any],
    user_profile: dict[str, Any],
    scenario: dict[str, Any],
) -> list[dict[str, Any]]:
    industry = str(analysis.get("industry", "")).casefold()
    readiness = str(analysis.get("readiness", "explore"))
    stage = _stage_for(user_profile)
    existing = _profile_text(user_profile)
    role_keywords = ROLE_SUGGESTION_KEYWORDS.get(
        scenario["role_id"],
        (),
    )
    readiness_index = READINESS_LEVELS.index(readiness)
    ranked: list[tuple[int, dict[str, Any]]] = []

    for suggestion in SUGGESTIONS:
        if str(suggestion.get("industry", "")).casefold() != industry:
            continue
        suggestion_stage = suggestion.get("stage", "both")
        if stage != "both" and suggestion_stage not in {"both", stage}:
            continue
        if _is_past_deadline(suggestion.get("deadline")):
            continue

        title = str(suggestion.get("title", ""))
        title_text = title.casefold()
        role_relevance = sum(
            keyword in title_text for keyword in role_keywords
        )
        if suggestion.get("type") in {"club", "course", "internship"} and (
            role_relevance == 0
        ):
            continue
        title_words = [
            word
            for word in re.findall(r"[a-z]+", title.casefold())
            if len(word) > 5
        ]
        if title_words and sum(word in existing for word in title_words) >= 2:
            continue

        suggestion_readiness = str(
            suggestion.get("readiness_fit", "explore")
        )
        try:
            distance = abs(
                READINESS_LEVELS.index(suggestion_readiness) - readiness_index
            )
        except ValueError:
            distance = 3
        if distance > 1:
            continue

        score = 100 - distance * 20
        if suggestion_stage == stage:
            score += 8
        if suggestion.get("deadline") == "rolling":
            score += 5
        score += role_relevance * 12
        ranked.append((score, suggestion))

    project_title, project_summary = ROLE_PRACTICE_PROJECTS[
        scenario["role_id"]
    ]
    actions: list[dict[str, Any]] = [
        {
            "id": f"practice-{scenario['role_id']}",
            "type": "project",
            "industry": scenario["industry"],
            "title": project_title,
            "stage": "both",
            "deadline": "rolling",
            "location": "self-directed",
            "requirements": [project_summary],
            "details": {
                "summary": project_summary,
                "targets_gap": analysis["gaps"][0],
            },
            "prototype": True,
            "verification": (
                "Practice project generated from this scenario. Adapt its "
                "scope to your available time and experience."
            ),
        }
    ]
    for _, suggestion in sorted(ranked, key=lambda item: item[0], reverse=True)[
        :2
    ]:
        actions.append(
            {
                **suggestion,
                "prototype": True,
                "verification": (
                    "Example opportunity from the prototype dataset. Verify "
                    "availability, dates, and eligibility before acting."
                ),
            }
        )
    return actions


def _direction_summary(
    scenario: dict[str, Any],
    analysis: dict[str, Any],
    rating: int,
    skips: int,
) -> str:
    role = scenario["role"]
    strength = analysis["strengths"][0]
    gap = analysis["gaps"][0]
    if analysis["fit_score"] < 40:
        skip_note = f" and skipped {skips} prompts" if skips else ""
        return (
            f"You rated the {role} exercise {rating}/10{skip_note}. Keep it as "
            "a low-confidence option rather than forcing it into your path."
        )
    return (
        f"You rated the work {rating}/10. Your clearest signal was {strength}; "
        f"the next useful test is to {gap}."
    )


def _merge_profile(
    previous: dict[str, Any],
    scenario: dict[str, Any],
    analysis: dict[str, Any],
    rating: int,
    skips: int,
) -> dict[str, Any]:
    previous_roles = previous.get("roles_explored", [])
    roles = [
        dict(role)
        for role in previous_roles
        if isinstance(role, dict)
        and role.get("role_id") != scenario["role_id"]
    ]
    prior = next(
        (
            role
            for role in previous_roles
            if isinstance(role, dict)
            and role.get("role_id") == scenario["role_id"]
        ),
        None,
    )
    sessions_seen = int((prior or {}).get("sessions_seen", 0)) + 1
    previous_score = int((prior or {}).get("fit_score", analysis["fit_score"]))
    fit_score = round(
        (previous_score * (sessions_seen - 1) + analysis["fit_score"])
        / sessions_seen
    )
    roles.append(
        {
            "role_id": scenario["role_id"],
            "role": scenario["role"],
            "industry": scenario["industry"],
            "sessions_seen": sessions_seen,
            "fit_score": fit_score,
            "last_rating": rating,
            "last_skip_count": skips,
            "confidence": analysis.get("confidence", "medium"),
        }
    )
    roles.sort(key=lambda role: int(role.get("fit_score", 0)), reverse=True)
    best = roles[0]

    strengths = _clean_strings(
        [
            *_clean_strings(previous.get("strengths")),
            *analysis["strengths"],
        ],
        limit=12,
    )
    gaps = _clean_strings(
        [
            *_clean_strings(previous.get("gaps")),
            *analysis["gaps"],
        ],
        limit=10,
    )
    best_scenario = SCENARIOS.get(str(best.get("role_id")), scenario)
    best_rating = int(best.get("last_rating", rating))
    best_skip_count = int(best.get("last_skip_count", skips))
    best_analysis = {
        **analysis,
        "fit_score": int(best.get("fit_score", analysis["fit_score"])),
    }
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "best_fit": {
            "industry": best.get("industry", scenario["industry"]),
            "role": best.get("role", scenario["role"]),
            "role_id": best.get("role_id", scenario["role_id"]),
            "readiness": analysis["readiness"],
            "why": _direction_summary(
                best_scenario,
                best_analysis,
                best_rating,
                best_skip_count,
            ),
            "confidence": best.get("confidence", "medium"),
            "fit_score": best.get("fit_score", analysis["fit_score"]),
        },
        "strengths": strengths,
        "gaps": gaps,
        "roles_explored": roles[:12],
    }


def generate_suggestions(payload: dict[str, Any]) -> dict[str, Any]:
    user_profile = payload.get("user_profile") or {}
    previous_profile = payload.get("profile") or {}
    responses = payload.get("new_responses") or []
    if not isinstance(user_profile, dict):
        raise ValueError("user_profile must be an object.")
    if not isinstance(previous_profile, dict):
        raise ValueError("profile must be an object or null.")
    if not isinstance(responses, list) or not responses:
        raise ValueError("At least one scenario response is required.")

    response = responses[-1]
    if not isinstance(response, dict):
        raise ValueError("Scenario responses must be objects.")
    role_id = str(response.get("role_id", "")).strip()
    scenario = SCENARIOS.get(role_id)
    if scenario is None:
        role_name = str(response.get("role", "")).casefold()
        scenario = next(
            (
                candidate
                for candidate in SCENARIOS.values()
                if candidate["role"].casefold() == role_name
            ),
            None,
        )
    if scenario is None:
        raise ValueError("The scenario role is not supported.")

    transcript = re.sub(
        r"\s+\n",
        "\n",
        str(response.get("transcript", "")).strip(),
    )[:12_000]
    rating = _bounded_rating(response.get("rating"))
    skips = _bounded_skips(response.get("skip_count"))
    fallback = _fallback_analysis(
        scenario,
        transcript,
        rating,
        skips,
        user_profile,
    )
    ai_analysis = _ai_analysis(
        scenario,
        transcript,
        rating,
        skips,
        user_profile,
    )
    analysis = _normalize_analysis(
        ai_analysis or {},
        fallback,
        scenario,
        rating,
        skips,
    )
    profile = _merge_profile(
        previous_profile,
        scenario,
        analysis,
        rating,
        skips,
    )
    direction = {
        "industry": scenario["industry"],
        "role": scenario["role"],
        "role_id": scenario["role_id"],
        "readiness": analysis["readiness"],
        "why": _direction_summary(scenario, analysis, rating, skips),
        "fit_score": analysis["fit_score"],
        "fit_label": analysis["fit_label"],
        "confidence": analysis.get("confidence", "medium"),
        "strengths": analysis["strengths"],
        "gaps": analysis["gaps"],
    }
    return {
        "direction": direction,
        "actions": _filter_suggestions(analysis, user_profile, scenario),
        "profile": profile,
        "analysis_mode": "ai" if ai_analysis else "rules",
    }
