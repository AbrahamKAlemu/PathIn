from __future__ import annotations

import copy
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

from .errors import ApiError
from .pit_repository import PRIVACY_THRESHOLD
from .taxonomy import (
    ALGORITHM_VERSION,
    MODEL_VERSION,
    OCCUPATIONAL_TAXONOMY,
    ROLE_BY_ID,
    TAXONOMY_VERSION,
    contains_alias,
    normalize_title,
    role_concepts,
    semantic_concepts,
    slugify,
)
from .text_cleanup import (
    clean_profile_text,
    compact_profile_text,
    is_probably_compacted_text,
)

PROFILE_CATEGORIES = (
    "education",
    "coursework",
    "roles",
    "responsibilities",
    "dates",
    "projects",
    "skills",
    "certifications",
    "industries",
    "achievements",
    "interests",
    "locations",
    "goals",
    "workStyles",
)

SCORING_WEIGHTS = {
    "skillOverlap": 25,
    "experienceAdjacency": 20,
    "interestsAndGoals": 15,
    "projectEvidence": 10,
    "educationRelevance": 10,
    "preferencesAndConstraints": 10,
    "transitionEffort": 5,
    "careerHistoryEvidence": 5,
}

SOURCE_PRIORITY = {
    "manual": 5,
    "user_correction": 6,
    "resume": 4,
    "linkedin": 3,
    "profile": 3,
    "inferred": 1,
}

SKILL_NORMALIZATION = {
    "js": "javascript",
    "react js": "react",
    "reactjs": "react",
    "node js": "node",
    "nodejs": "node",
    "ms excel": "excel",
    "microsoft excel": "excel",
    "spreadsheet": "excel",
    "spreadsheets": "excel",
}

STOP_WORDS = {
    "and",
    "the",
    "for",
    "with",
    "from",
    "into",
    "that",
    "this",
    "your",
    "their",
    "using",
    "used",
    "role",
    "work",
    "team",
}

DOMAIN_SIGNALS: dict[str, tuple[str, ...]] = {
    "Robotics and Hardware": (
        "robotics",
        "robot",
        "battlebots",
        "chassis",
        "embedded systems",
        "arduino",
        "electronics",
        "soldering",
        "cad",
        "autodesk inventor",
        "autodesk fusion",
        "manufacturing",
        "3d printer",
    ),
    "Education": (
        "education",
        "student",
        "campus",
        "school",
        "learning experience",
        "instructional",
        "course design",
        "curriculum",
        "teaching",
    ),
    "Healthcare": (
        "health",
        "healthcare",
        "patient",
        "clinical",
        "medical",
        "hospital",
        "public health",
        "biomedical",
        "health informatics",
        "digital health",
    ),
    "Legal and Policy": (
        "law",
        "legal",
        "policy",
        "public policy",
        "regulatory",
        "regulation",
        "compliance",
        "contract",
        "privacy",
        "governance",
        "court",
        "legislation",
        "civic technology",
    ),
    "Arts and Creative Technology": (
        "art",
        "arts",
        "artist",
        "music",
        "musician",
        "piano",
        "film",
        "animation",
        "game design",
        "creative coding",
        "digital media",
        "interactive media",
        "theater",
        "theatre",
        "visual storytelling",
        "creative technology",
    ),
    "Financial Services": (
        "finance",
        "financial",
        "banking",
        "investment",
        "budget",
        "accounting",
    ),
    "People Operations": (
        "employee",
        "recruiting",
        "human resources",
        "hr ",
        "onboarding",
        "workplace",
    ),
    "Cloud Platforms": (
        "cloud",
        "aws",
        "azure",
        "gcp",
        "devops",
        "infrastructure",
        "ci/cd",
    ),
    "Consumer Products": (
        "consumer",
        "retail",
        "ecommerce",
        "e-commerce",
        "customer churn",
        "customer retention",
    ),
    "Marketing and Media": (
        "marketing",
        "campaign",
        "audience",
        "seo",
        "editorial",
        "social media",
    ),
    "Cybersecurity": (
        "security",
        "cybersecurity",
        "threat",
        "incident response",
    ),
}

CAPABILITY_SIGNALS: dict[str, tuple[str, ...]] = {
    "Computational Building": (
        "programming",
        "coding",
        "software",
        "developer",
        "python",
        "javascript",
        "api",
        "automation",
        "embedded systems",
    ),
    "Quantitative and Logical Reasoning": (
        "mathematics",
        "mathematical",
        "statistics",
        "probability",
        "logic",
        "logical reasoning",
        "algorithm",
        "proof",
        "quantitative",
        "data analysis",
        "financial analysis",
    ),
    "Systems Problem Solving": (
        "problem solving",
        "debugging",
        "troubleshooting",
        "root cause",
        "systems thinking",
        "process improvement",
        "requirements",
        "testing",
        "reliability",
    ),
    "Research and Synthesis": (
        "research",
        "experiment",
        "study",
        "investigation",
        "literature review",
        "user interview",
        "policy analysis",
        "legal research",
    ),
    "Human-Centered Design": (
        "user research",
        "usability",
        "interaction design",
        "product design",
        "prototype",
        "accessibility",
        "psychology",
    ),
    "Creative Production and Storytelling": (
        "creative",
        "art",
        "music",
        "film",
        "animation",
        "creative coding",
        "content",
        "writing",
        "storytelling",
        "visual communication",
    ),
    "Communication and Facilitation": (
        "communication",
        "presentation",
        "public speaking",
        "teaching",
        "facilitation",
        "stakeholder",
        "mentoring",
        "negotiation",
    ),
    "Coordination and Execution": (
        "coordination",
        "project management",
        "scheduling",
        "operations",
        "launch",
        "planning",
        "workflow",
    ),
}

DOMAIN_PORTABLE_CAPABILITIES = {
    "Computational Building",
    "Quantitative and Logical Reasoning",
    "Systems Problem Solving",
    "Research and Synthesis",
    "Human-Centered Design",
    "Creative Production and Storytelling",
    "Communication and Facilitation",
    "Coordination and Execution",
}

DOMAIN_INDUSTRY_ALIASES: dict[str, tuple[str, ...]] = {
    "Robotics and Hardware": ("engineering", "manufacturing", "automotive"),
    "Education": ("education",),
    "Healthcare": ("healthcare", "medical", "biomedical"),
    "Legal and Policy": ("legal", "law", "government", "public sector"),
    "Arts and Creative Technology": (
        "arts",
        "media",
        "entertainment",
        "music",
        "film",
    ),
    "Financial Services": ("finance", "financial services", "banking"),
    "People Operations": ("human resources", "people operations"),
    "Cloud Platforms": ("cloud", "technology"),
    "Consumer Products": ("retail", "consumer", "ecommerce"),
    "Marketing and Media": ("marketing", "media", "advertising"),
    "Cybersecurity": ("cybersecurity", "security"),
}

PROBLEM_SIGNALS: dict[str, tuple[str, ...]] = {
    "designing and validating physical systems": (
        "robot",
        "chassis",
        "mechanical design",
        "cad",
        "prototype",
        "embedded systems",
        "electronics",
        "manufacturing",
        "hardware test",
    ),
    "building usable digital products": (
        "app",
        "application",
        "product",
        "interface",
        "feature",
        "prototype",
    ),
    "turning data into decisions": (
        "analysis",
        "analytics",
        "dashboard",
        "experiment",
        "model",
        "sql",
    ),
    "understanding user behavior": (
        "user research",
        "interview",
        "usability",
        "psychology",
        "customer discovery",
    ),
    "improving workflows": (
        "workflow",
        "process",
        "operations",
        "coordination",
        "scheduling",
        "efficiency",
    ),
    "growing and informing audiences": (
        "campaign",
        "content",
        "audience",
        "seo",
        "writing",
    ),
    "helping people learn or succeed": (
        "teaching",
        "training",
        "learning experience",
        "learner",
        "instructional",
        "onboarding",
        "customer success",
    ),
    "improving reliability and delivery": (
        "testing",
        "reliability",
        "deployment",
        "automation",
        "debugging",
        "ci/cd",
    ),
    "interpreting rules and reducing risk": (
        "law",
        "legal",
        "policy",
        "regulation",
        "regulatory",
        "compliance",
        "contract",
        "privacy",
        "governance",
    ),
    "improving health decisions and experiences": (
        "health",
        "healthcare",
        "patient",
        "clinical",
        "medical",
        "hospital",
        "public health",
    ),
    "creating expressive digital experiences": (
        "art",
        "music",
        "film",
        "animation",
        "creative coding",
        "interactive media",
        "digital media",
        "storytelling",
    ),
    "solving complex structured problems": (
        "logic",
        "logical reasoning",
        "mathematics",
        "algorithm",
        "proof",
        "root cause",
        "systems thinking",
        "problem solving",
    ),
}

ROLE_SPECIALIZATION_RULES: dict[
    str, tuple[tuple[str, tuple[str, ...]], ...]
] = {
    "software-engineer": (
        ("Frontend Product Engineer", ("react", "next.js", "frontend", "interface")),
        ("Backend and API Engineer", ("api", "rest", "backend", "service")),
        ("Cloud Platform Engineer", ("aws", "cloud", "infrastructure", "ci/cd")),
        ("Product Software Engineer", ("product", "application", "app", "feature")),
    ),
    "quality-assurance-analyst": (
        ("Test Automation Analyst", ("automation", "automated test", "test suite")),
        ("Release Quality Analyst", ("release", "quality", "regression")),
    ),
    "devops-engineer": (
        ("Cloud Reliability Engineer", ("reliability", "monitoring", "cloud", "aws")),
        ("Developer Platform Engineer", ("platform", "developer tools", "infrastructure")),
        ("Delivery Automation Engineer", ("ci/cd", "deployment", "automation")),
    ),
    "cybersecurity-analyst": (
        ("Cloud Security Analyst", ("cloud", "aws", "azure", "gcp")),
        ("Security Risk Analyst", ("risk", "controls", "assessment")),
        ("Detection and Response Analyst", ("incident", "monitoring", "threat")),
    ),
    "data-scientist": (
        ("Product Data Scientist", ("experiment", "product", "customer churn", "user")),
        ("Applied Machine Learning Scientist", ("machine learning", "predictive", "model")),
        ("Decision Science Analyst", ("statistics", "decision", "research")),
    ),
    "data-analyst": (
        ("Product Data Analyst", ("product", "user", "feature", "experiment")),
        ("Marketing Analytics Analyst", ("marketing", "campaign", "audience", "seo")),
        ("Operations Data Analyst", ("operations", "workflow", "process", "efficiency")),
        ("People Analytics Analyst", ("employee", "recruiting", "people", "hr ")),
        ("Decision Support Analyst", ("dashboard", "sql", "visualization")),
    ),
    "financial-analyst": (
        ("Strategic Finance Analyst", ("strategy", "scenario", "forecast")),
        ("Investment Research Analyst", ("investment", "research", "market")),
        ("Planning and Forecasting Analyst", ("budget", "forecast", "planning")),
    ),
    "business-analyst": (
        ("Product Business Analyst", ("product", "feature", "user")),
        ("Operations Business Analyst", ("operations", "workflow", "process")),
        ("Technical Business Analyst", ("api", "software", "technical", "system")),
    ),
    "operations-analyst": (
        ("Product Operations Analyst", ("product", "launch", "feature")),
        ("People Operations Analyst", ("employee", "recruiting", "onboarding", "hr ")),
        ("Process Improvement Analyst", ("workflow", "process", "efficiency")),
    ),
    "product-manager": (
        ("Technical Product Manager", ("software", "api", "engineering", "technical")),
        ("Data Product Manager", ("data", "analytics", "machine learning", "ai")),
        ("Growth Product Manager", ("growth", "campaign", "retention", "audience")),
        ("Research-Led Product Manager", ("user research", "interview", "usability")),
    ),
    "product-operations-specialist": (
        ("Product Operations and Insights Specialist", ("metrics", "analytics", "dashboard")),
        ("Launch Operations Specialist", ("launch", "release", "delivery")),
        ("Product Workflow Specialist", ("workflow", "process", "coordination")),
    ),
    "project-coordinator": (
        ("Technical Project Coordinator", ("software", "technical", "engineering", "api")),
        ("Product Launch Coordinator", ("product", "launch", "feature")),
        ("Program Operations Coordinator", ("operations", "program", "workflow")),
    ),
    "ux-designer": (
        ("Accessibility-Focused Product Designer", ("accessible", "accessibility")),
        ("Research-Led Product Designer", ("user research", "interview", "usability")),
        ("Interaction Designer", ("interaction", "flow", "prototype", "figma")),
        ("Digital Product Designer", ("product", "app", "mobile", "web")),
    ),
    "learning-experience-designer": (
        ("Technical Learning Experience Designer", ("technical", "software", "technology")),
        ("Workplace Learning Designer", ("employee", "workplace", "onboarding")),
        ("Digital Learning Designer", ("digital", "online", "course")),
    ),
    "marketing-specialist": (
        ("Growth Marketing Specialist", ("growth", "analytics", "performance")),
        ("Content Marketing Specialist", ("content", "seo", "writing", "editorial")),
        ("Product Marketing Specialist", ("product", "launch", "customer")),
        ("Lifecycle Marketing Specialist", ("email", "retention", "lifecycle")),
    ),
    "content-strategist": (
        ("Technical Content Strategist", ("technical", "software", "api", "developer")),
        ("UX Content Strategist", ("user", "ux", "interface", "research")),
        ("SEO Content Strategist", ("seo", "search", "analytics")),
        ("Learning Content Strategist", ("education", "learning", "training")),
    ),
    "sales-representative": (
        ("Technical Solutions Representative", ("technical", "software", "cloud", "api")),
        ("Consultative Sales Representative", ("discovery", "research", "customer needs")),
    ),
    "customer-success-specialist": (
        ("Technical Customer Success Specialist", ("technical", "software", "api", "cloud")),
        ("Customer Education Specialist", ("training", "teaching", "learning")),
        ("Product Adoption Specialist", ("onboarding", "adoption", "product")),
    ),
    "customer-service-manager": (
        ("Support Operations Manager", ("operations", "workflow", "metrics")),
        ("Customer Education Manager", ("training", "learning", "onboarding")),
    ),
    "hr-coordinator": (
        ("Recruiting Operations Coordinator", ("recruiting", "interview", "candidate")),
        ("Employee Experience Coordinator", ("employee", "onboarding", "workplace")),
        ("People Programs Coordinator", ("people", "program", "equitable")),
    ),
    "engineering-manager": (
        ("Product Engineering Manager", ("product", "feature", "user")),
        ("Platform Engineering Manager", ("platform", "cloud", "infrastructure")),
        ("Software Delivery Manager", ("delivery", "planning", "release")),
    ),
    "robotics-engineer": (
        (
            "Mechanical Robotics Engineer",
            ("chassis", "cad", "mechanical", "manufacturing"),
        ),
        (
            "Embedded Robotics Engineer",
            ("embedded systems", "arduino", "electronics", "firmware"),
        ),
        (
            "Robotics Prototyping Engineer",
            ("prototype", "robotics", "robot"),
        ),
    ),
    "embedded-systems-engineer": (
        (
            "Embedded Robotics Engineer",
            ("robotics", "arduino", "robot"),
        ),
        (
            "Firmware and Hardware Integration Engineer",
            ("electronics", "sensor", "hardware"),
        ),
    ),
    "mechanical-design-engineer": (
        (
            "Robotics Mechanical Design Engineer",
            ("robotics", "chassis", "battlebots", "robot"),
        ),
        (
            "CAD and Prototyping Engineer",
            ("cad", "autodesk inventor", "autodesk fusion", "prototype"),
        ),
    ),
    "manufacturing-engineer": (
        (
            "Robotics Manufacturing Engineer",
            ("robotics", "chassis", "robot"),
        ),
        (
            "Prototype Manufacturing Engineer",
            ("prototype", "makerspace", "3d printer"),
        ),
    ),
    "hardware-test-engineer": (
        (
            "Robotics Hardware Test Engineer",
            ("robotics", "robot", "chassis", "arduino"),
        ),
        (
            "Electronics Validation Engineer",
            ("electronics", "soldering", "embedded systems"),
        ),
    ),
}

ROLE_ARTIFACTS: dict[str, tuple[str, str]] = {
    "software-engineer": (
        "Make {subject} production-ready",
        "A deployed feature, automated tests, and a short architecture note",
    ),
    "quality-assurance-analyst": (
        "Build a release-quality test plan for {subject}",
        "A test plan, automated checks, and a defect-quality report",
    ),
    "devops-engineer": (
        "Automate deployment and monitoring for {subject}",
        "A repeatable pipeline, monitoring view, and reliability notes",
    ),
    "cybersecurity-analyst": (
        "Threat-model and secure {subject}",
        "A threat model, prioritized controls, and a remediation brief",
    ),
    "data-scientist": (
        "Build and validate a model for {subject}",
        "A reproducible model, evaluation notes, and a decision-focused readout",
    ),
    "data-analyst": (
        "Turn {subject} into a decision dashboard",
        "A reproducible analysis, dashboard, and three decision-ready findings",
    ),
    "financial-analyst": (
        "Build a scenario model for {subject}",
        "A documented model, assumptions, scenarios, and recommendation",
    ),
    "business-analyst": (
        "Map requirements and outcomes for {subject}",
        "A process map, requirements brief, and measurable success criteria",
    ),
    "operations-analyst": (
        "Measure and improve {subject}",
        "A baseline, redesigned workflow, and before-and-after measures",
    ),
    "product-manager": (
        "Run product discovery for {subject}",
        "Research notes, a prioritized problem brief, and an outcome metric",
    ),
    "product-operations-specialist": (
        "Build a launch system for {subject}",
        "A launch workflow, decision log, readiness checklist, and metrics",
    ),
    "project-coordinator": (
        "Deliver {subject} with a milestone plan",
        "A project plan, risk log, status cadence, and completion retrospective",
    ),
    "ux-designer": (
        "Research and test {subject}",
        "Research notes, a tested prototype, findings, and a concise case study",
    ),
    "learning-experience-designer": (
        "Design and evaluate learning for {subject}",
        "A learner brief, learning artifact, pilot feedback, and evaluation",
    ),
    "marketing-specialist": (
        "Run a measured campaign for {subject}",
        "A campaign brief, audience-specific assets, and a performance readout",
    ),
    "content-strategist": (
        "Build an audience-led content system for {subject}",
        "Audience evidence, a content model, sample content, and success metrics",
    ),
    "sales-representative": (
        "Test customer discovery for {subject}",
        "A discovery script, interview notes, objection themes, and a pitch",
    ),
    "customer-success-specialist": (
        "Design product adoption for {subject}",
        "An onboarding journey, success plan, help artifact, and adoption measures",
    ),
    "customer-service-manager": (
        "Improve support operations for {subject}",
        "A service baseline, redesigned workflow, coaching plan, and quality measures",
    ),
    "hr-coordinator": (
        "Pilot a people workflow for {subject}",
        "A documented workflow, candidate or employee artifact, and outcome measures",
    ),
    "engineering-manager": (
        "Lead a technical delivery cycle for {subject}",
        "A delivery plan, technical decision record, coaching evidence, and retrospective",
    ),
    "robotics-engineer": (
        "Design, integrate, and test {subject}",
        "A working robotic subsystem, CAD or wiring evidence, a test log, and design tradeoffs",
    ),
    "embedded-systems-engineer": (
        "Build embedded control for {subject}",
        "Firmware, a circuit or wiring diagram, repeatable tests, and a short debugging log",
    ),
    "mechanical-design-engineer": (
        "Engineer and validate {subject}",
        "A dimensioned CAD assembly, design review, prototype evidence, and manufacturing notes",
    ),
    "manufacturing-engineer": (
        "Create a manufacturing plan for {subject}",
        "A process plan, bill of materials, quality checks, and measured improvement evidence",
    ),
    "hardware-test-engineer": (
        "Build a validation plan for {subject}",
        "A test fixture or procedure, pass/fail criteria, failure evidence, and a validation report",
    ),
}

ROLE_ROUTE_SUBJECTS: dict[str, str] = {
    "software-engineer": "a small user-facing application",
    "quality-assurance-analyst": "a small software release",
    "devops-engineer": "a small deployed service",
    "cybersecurity-analyst": "a small application",
    "data-scientist": "a public decision dataset",
    "data-analyst": "a real operational question",
    "financial-analyst": "a small business scenario",
    "business-analyst": "a recurring workflow",
    "operations-analyst": "a recurring workflow",
    "product-manager": "a specific user problem",
    "product-operations-specialist": "a small product launch",
    "project-coordinator": "a small cross-functional project",
    "ux-designer": "a specific user workflow",
    "learning-experience-designer": "a short learning module",
    "marketing-specialist": "a small audience campaign",
    "content-strategist": "a focused information need",
    "sales-representative": "a defined customer problem",
    "customer-success-specialist": "a sample product",
    "customer-service-manager": "a support workflow",
    "hr-coordinator": "a recruiting or onboarding workflow",
    "engineering-manager": "a small technical delivery",
    "robotics-engineer": "a small robotic subsystem",
    "embedded-systems-engineer": "a sensor-and-actuator device",
    "mechanical-design-engineer": "a small mechanical assembly",
    "manufacturing-engineer": "a prototype production process",
    "hardware-test-engineer": "a small hardware subsystem",
}

EVIDENCE_CATEGORY_LABELS = {
    "achievements": "achievement",
    "education": "education entry",
    "interests": "interest",
    "projects": "project",
    "responsibilities": "responsibility",
    "roles": "role",
    "skills": "skill",
}

EVIDENCE_SOURCE_LABELS = {
    "inferred": "inferred profile",
    "linkedin": "LinkedIn profile",
    "manual": "profile",
    "profile": "profile",
    "resume": "resume",
    "user_correction": "corrected profile",
}


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    values = value if isinstance(value, list) else [value]
    result: list[str] = []
    for item in values:
        text = clean_profile_text(str(item))
        if (
            text
            and not is_probably_compacted_text(text)
            and text not in result
        ):
            result.append(text)
    return result


def _object(value: Any) -> dict[str, Any]:
    return copy.deepcopy(value) if isinstance(value, dict) else {}


def _normalized_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _normalized_skill(value: str) -> str:
    normalized = _normalized_text(value)
    return SKILL_NORMALIZATION.get(normalized, normalized)


def _terms(values: list[str]) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9+#.]+", " ".join(values).lower())
        if len(token) > 2 and token not in STOP_WORDS
    }


def _matching_signal_labels(
    values: list[str],
    definitions: dict[str, tuple[str, ...]],
) -> set[str]:
    combined = " ".join(values).lower()
    return {
        label
        for label, keywords in definitions.items()
        if any(contains_alias(combined, keyword) for keyword in keywords)
    }


def _entry(
    value: str,
    *,
    source: str,
    confidence: float = 1.0,
    explicit: bool = True,
    enabled: bool = True,
) -> dict[str, Any]:
    cleaned = clean_profile_text(value)
    normalized = _normalized_text(cleaned)
    return {
        "id": hashlib.sha1(f"{source}:{normalized}".encode()).hexdigest()[:14],
        "value": cleaned,
        "normalized": normalized,
        "source": source,
        "confidence": round(confidence, 2),
        "explicit": explicit,
        "enabled": enabled,
    }


class ProfileNormalizer:
    def normalize(self, payload: dict[str, Any]) -> dict[str, Any]:
        profile = payload.get("profile", payload)
        if not isinstance(profile, dict):
            raise ApiError(
                "INVALID_PROFILE",
                "Profile input must be a JSON object.",
                details={"field": "profile"},
            )

        enabled_categories = {
            category: bool(
                _object(profile.get("enabledCategories")).get(
                    category,
                    _object(payload.get("enabledCategories")).get(category, True),
                )
            )
            for category in PROFILE_CATEGORIES
        }
        provided_fields = _object(
            profile.get("fields") or profile.get("fieldEvidence")
        )
        normalized_fields: dict[str, list[dict[str, Any]]] = {}
        disabled_fields: dict[str, list[dict[str, Any]]] = {}
        candidate_fields: dict[str, list[dict[str, Any]]] = {}
        conflicts: list[dict[str, Any]] = []

        for category in PROFILE_CATEGORIES:
            candidates: list[dict[str, Any]] = []
            raw_items = provided_fields.get(category, profile.get(category, []))
            if not isinstance(raw_items, list):
                raw_items = [raw_items] if raw_items else []
            for raw_item in raw_items:
                if isinstance(raw_item, dict):
                    value = clean_profile_text(
                        str(raw_item.get("value", ""))
                    )
                    if not value or is_probably_compacted_text(value):
                        continue
                    item = {
                        **_entry(
                            value,
                            source=str(raw_item.get("source", "manual")),
                            confidence=float(raw_item.get("confidence", 1.0)),
                            explicit=bool(raw_item.get("explicit", True)),
                            enabled=bool(raw_item.get("enabled", True)),
                        ),
                        **{
                            key: copy.deepcopy(raw_item[key])
                            for key in (
                                "evidence",
                                "originalSource",
                                "importBatch",
                                "corroboratedBy",
                            )
                            if key in raw_item
                        },
                    }
                else:
                    value = clean_profile_text(str(raw_item))
                    if not value or is_probably_compacted_text(value):
                        continue
                    item = _entry(value, source="manual")
                candidates.append(item)
            candidate_fields[category] = copy.deepcopy(candidates)

            selected: dict[str, dict[str, Any]] = {}
            disabled: list[dict[str, Any]] = []
            for item in candidates:
                if not item["enabled"] or not enabled_categories[category]:
                    disabled.append(item)
                    continue
                key = self._dedupe_key(category, item)
                previous = selected.get(key)
                if previous is None:
                    item["corroboratedBy"] = self._evidence_sources(item)
                    selected[key] = item
                    continue
                corroborated_by = list(
                    dict.fromkeys(
                        [
                            *self._evidence_sources(previous),
                            *self._evidence_sources(item),
                        ]
                    )
                )
                if SOURCE_PRIORITY.get(
                    item["source"], 0
                ) > SOURCE_PRIORITY.get(previous["source"], 0):
                    item["corroboratedBy"] = corroborated_by
                    selected[key] = item
                else:
                    previous["corroboratedBy"] = corroborated_by
            normalized_fields[category] = list(selected.values())
            disabled_fields[category] = disabled

        conflicts.extend(self._find_conflicts(candidate_fields))
        values = {
            category: [item["value"] for item in normalized_fields[category]]
            for category in PROFILE_CATEGORIES
        }

        roles = values["roles"]
        responsibilities = values["responsibilities"]
        current_role_ids = [
            role_id
            for role_id in (normalize_title(value) for value in roles)
            if role_id
        ]
        goal_role_ids = list(
            dict.fromkeys(
                role_id
                for role_id in (
                    normalize_title(value) for value in values["goals"]
                )
                if role_id
            )
        )
        explicit_level, explicit_level_evidence = self._explicit_level(roles)
        enabled_signals = [
            category
            for category in PROFILE_CATEGORIES
            if enabled_categories[category] and values[category]
        ]
        evidence_count = sum(len(values[category]) for category in enabled_signals)
        core_categories = {
            "education",
            "roles",
            "responsibilities",
            "projects",
            "skills",
            "interests",
            "goals",
        }
        completeness = min(
            1.0,
            (
                len(set(enabled_signals) & core_categories) / 5
                + min(evidence_count, 20) / 40
            ),
        )

        constraints = {
            **_object(profile.get("constraints")),
            **_object(payload.get("constraints")),
        }
        preferences = {
            **_object(profile.get("preferences")),
            **_object(payload.get("preferences")),
        }
        exclusions = list(
            dict.fromkeys(
                [
                    *values.get("exclusions", []),
                    *_string_list(constraints.get("excludedRoles")),
                    *_string_list(constraints.get("excludedIndustries")),
                    *_string_list(profile.get("exclusions")),
                ]
            )
        )
        training_time = str(
            profile.get("trainingTime")
            or preferences.get("trainingTime")
            or constraints.get("trainingTime")
            or ""
        ).strip()
        desired_difficulty = str(
            profile.get("desiredDifficulty")
            or preferences.get("desiredDifficulty")
            or constraints.get("desiredDifficulty")
            or ""
        ).strip()

        normalized = {
            "id": str(profile.get("id", "profile")).strip() or "profile",
            "name": clean_profile_text(str(profile.get("name", ""))),
            "headline": clean_profile_text(
                str(profile.get("headline", ""))
            ),
            **values,
            "experience": list(dict.fromkeys([*roles, *responsibilities])),
            "locationPreferences": values["locations"],
            "preferences": preferences,
            "constraints": constraints,
            "exclusions": exclusions,
            "trainingTime": training_time,
            "desiredDifficulty": desired_difficulty,
            "enabledCategories": enabled_categories,
            "enabledSignals": enabled_signals,
            "fieldEvidence": normalized_fields,
            "disabledFieldEvidence": disabled_fields,
            "conflicts": conflicts,
            "currentRoleIds": current_role_ids,
            "goalRoleIds": goal_role_ids,
            "explicitCareerLevel": explicit_level,
            "explicitCareerLevelEvidence": explicit_level_evidence,
            "completeness": round(completeness, 2),
            "warnings": [
                "Only enabled categories are used for recommendations.",
                "Inferred skills remain labeled and have lower scoring weight.",
                "Sensitive demographic attributes are not analyzed.",
            ],
        }
        normalized["profileFingerprint"] = self._build_profile_fingerprint(
            normalized
        )
        return normalized

    @staticmethod
    def _evidence_sources(item: dict[str, Any]) -> list[str]:
        sources = _string_list(item.get("corroboratedBy"))
        source = str(item.get("source", "")).strip()
        original_source = str(item.get("originalSource", "")).strip()
        if source == "inferred" and original_source:
            sources.append(original_source)
        elif source:
            sources.append(source)
        return list(dict.fromkeys(value for value in sources if value))

    @staticmethod
    def _fingerprint_evidence(
        category: str,
        item: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "category": category,
            "value": item["value"],
            "source": item["source"],
            "confidence": item["confidence"],
            "explicit": item["explicit"],
            "corroboratedBy": ProfileNormalizer._evidence_sources(item),
        }

    @classmethod
    def _build_profile_fingerprint(
        cls,
        profile: dict[str, Any],
    ) -> dict[str, Any]:
        evidence_items = [
            (category, item)
            for category in profile["enabledSignals"]
            for item in profile["fieldEvidence"].get(category, [])
        ]
        sources = list(
            dict.fromkeys(
                source
                for _, item in evidence_items
                for source in cls._evidence_sources(item)
                if source in {"resume", "linkedin", "manual", "user_correction"}
            )
        )
        capabilities = [
            cls._fingerprint_evidence("skills", item)
            for item in sorted(
                profile["fieldEvidence"].get("skills", []),
                key=lambda value: (
                    not value["explicit"],
                    -float(value["confidence"]),
                    value["value"],
                ),
            )[:8]
        ]
        role_trajectory = [
            cls._fingerprint_evidence("roles", item)
            for item in profile["fieldEvidence"].get("roles", [])[:5]
        ]
        project_themes = [
            cls._fingerprint_evidence("projects", item)
            for item in profile["fieldEvidence"].get("projects", [])[:5]
        ]
        achievements = [
            cls._fingerprint_evidence("achievements", item)
            for item in profile["fieldEvidence"].get("achievements", [])[:5]
        ]

        def derive_signals(
            definitions: dict[str, tuple[str, ...]],
            *,
            include_industries: bool = False,
            include_education: bool = True,
        ) -> list[dict[str, Any]]:
            derived = []
            for label, keywords in definitions.items():
                support = []
                matched_keywords: set[str] = set()
                for category, item in evidence_items:
                    if (
                        not include_education
                        and category in {"education", "coursework"}
                    ):
                        continue
                    value = item["value"].lower()
                    keyword_hits = [
                        keyword
                        for keyword in keywords
                        if contains_alias(value, keyword)
                    ]
                    explicit_industry = (
                        include_industries
                        and category == "industries"
                        and (
                            label.lower() in value
                            or value in label.lower()
                        )
                    )
                    if keyword_hits or explicit_industry:
                        matched_keywords.update(keyword_hits)
                        support.append(
                            cls._fingerprint_evidence(category, item)
                        )
                if support:
                    derived.append(
                        {
                            "label": label,
                            "strength": min(
                                1.0,
                                0.35
                                + len(matched_keywords) * 0.15
                                + len(support) * 0.1,
                            ),
                            "supportingEvidence": support[:3],
                        }
                    )
            derived.sort(
                key=lambda item: (
                    -float(item["strength"]),
                    item["label"],
                )
            )
            return derived

        corroborated_count = sum(
            1
            for _, item in evidence_items
            if len(cls._evidence_sources(item)) > 1
        )
        explicit_count = sum(
            1 for _, item in evidence_items if item["explicit"]
        )
        quality_score = min(
            1.0,
            profile["completeness"] * 0.55
            + min(explicit_count, 15) / 15 * 0.25
            + min(len(sources), 2) / 2 * 0.12
            + min(corroborated_count, 4) / 4 * 0.08,
        )
        return {
            "sourcesPresent": sources,
            "sourceCoverage": {
                source: sum(
                    1
                    for _, item in evidence_items
                    if source in cls._evidence_sources(item)
                )
                for source in sources
            },
            "roleTrajectory": role_trajectory,
            "strongestCapabilities": capabilities,
            "repeatedActivities": [
                cls._fingerprint_evidence("responsibilities", item)
                for item in profile["fieldEvidence"].get(
                    "responsibilities", []
                )[:6]
            ],
            "projectThemes": project_themes,
            "achievements": achievements,
            "domains": derive_signals(
                DOMAIN_SIGNALS,
                include_industries=True,
                include_education=False,
            )[:4],
            "problemThemes": derive_signals(PROBLEM_SIGNALS)[:4],
            "capabilityThemes": derive_signals(CAPABILITY_SIGNALS)[:6],
            "capabilityCombination": [
                item["value"] for item in capabilities[:3]
            ],
            "evidenceQuality": {
                "score": round(quality_score, 2),
                "label": (
                    "strong"
                    if quality_score >= 0.75
                    else "moderate"
                    if quality_score >= 0.55
                    else "limited"
                ),
                "explicitFactCount": explicit_count,
                "corroboratedFactCount": corroborated_count,
                "sourceCount": len(sources),
            },
        }

    @staticmethod
    def _dedupe_key(
        category: str,
        item: dict[str, Any],
    ) -> str:
        normalized = str(item["normalized"])
        if category == "roles":
            role_id = normalize_title(item["value"])
            if role_id:
                return f"role:{role_id}"
        if category == "skills":
            return f"skill:{SKILL_NORMALIZATION.get(normalized, normalized)}"
        return normalized

    @staticmethod
    def _explicit_level(roles: list[str]) -> tuple[int | None, str | None]:
        combined = " ".join(roles).lower()
        levels = (
            (4, ("director", "head of", "vice president", "vp ", "engineering manager")),
            (3, ("senior", "sr.", "lead ", "manager")),
            (1, ("intern", "junior", "jr.", "entry-level", "entry level", "assistant")),
        )
        for level, markers in levels:
            marker = next((value for value in markers if value in combined), None)
            if marker:
                return level, marker.strip()
        return None, None

    @staticmethod
    def _find_conflicts(
        fields: dict[str, list[dict[str, Any]]],
    ) -> list[dict[str, Any]]:
        conflicts: list[dict[str, Any]] = []
        locations = fields["locations"]
        distinct_location_sources = {
            item["source"]: item["value"]
            for item in locations
            if item["source"] in {"resume", "linkedin", "manual"}
        }
        if len(set(distinct_location_sources.values())) > 1:
            conflicts.append(
                {
                    "category": "locations",
                    "message": "Location values differ across imported sources.",
                    "values": distinct_location_sources,
                }
            )

        role_groups: dict[str, list[dict[str, Any]]] = {}
        for item in fields["roles"]:
            role_id = normalize_title(item["value"])
            if role_id:
                role_groups.setdefault(role_id, []).append(item)
        for role_id, items in role_groups.items():
            sources = {item["source"] for item in items}
            values = {item["value"] for item in items}
            if len(sources) > 1 and len(values) > 1:
                conflicts.append(
                    {
                        "category": "roles",
                        "roleId": role_id,
                        "message": "Role details differ across imported sources.",
                        "values": [
                            {"source": item["source"], "value": item["value"]}
                            for item in items
                        ],
                    }
                )
        return conflicts


class RecommendationEngine:
    def __init__(self, catalog: dict[str, Any]):
        self.catalog = copy.deepcopy(catalog)
        self.candidates = self._candidate_catalog()

    def recommend(
        self,
        profile: dict[str, Any],
        *,
        feedback: dict[str, Any] | None = None,
        pinned_destination_ids: list[str] | None = None,
        count: int = 4,
    ) -> list[dict[str, Any]]:
        if not self._has_usable_profile(profile):
            raise ApiError(
                "INSUFFICIENT_PROFILE",
                "Add usable education, experience, project, skill, or interest information before generating paths.",
                details={
                    "requiredCategories": [
                        "education",
                        "roles",
                        "responsibilities",
                        "projects",
                        "skills",
                        "interests",
                    ]
                },
            )

        feedback = feedback or {}
        pinned_destination_ids = pinned_destination_ids or []
        candidates = [
            candidate
            for candidate in self.candidates
            if not self._excluded(candidate, profile, feedback)
        ]
        if not candidates:
            raise ApiError(
                "NO_DESTINATIONS",
                "No careers remain after applying the selected exclusions.",
                details={"exclusions": profile.get("exclusions", [])},
            )

        retrieved = sorted(
            candidates,
            key=lambda item: (
                -self._retrieval_score(profile, item),
                item["title"],
            ),
        )
        for destination_id in pinned_destination_ids:
            role_id = destination_id.removeprefix("dest-")
            candidate = next(
                (item for item in candidates if item["id"] == role_id), None
            )
            if candidate and candidate not in retrieved:
                retrieved.append(candidate)

        scored = [
            self._score_candidate(profile, candidate, feedback=feedback)
            for candidate in retrieved
        ]
        scored.sort(key=lambda item: (-item["overallScore"], item["title"]))
        credibility_floor = max(
            30.0,
            scored[0]["overallScore"] - 45.0,
        )
        credible = [
            item
            for item in scored
            if item["overallScore"] >= credibility_floor
            and item["confidence"] != "exploratory"
        ]
        if len(credible) >= 2:
            candidate_pool = credible
        else:
            primary = scored[0]
            primary_role = ROLE_BY_ID.get(primary["id"], {})
            primary_adjacent_ids = set(
                primary_role.get("adjacentRoleIds", [])
            )

            def fallback_key(item: dict[str, Any]) -> tuple[Any, ...]:
                item_role = ROLE_BY_ID.get(item["id"], {})
                is_adjacent = (
                    item["id"] in primary_adjacent_ids
                    or primary["id"]
                    in set(item_role.get("adjacentRoleIds", []))
                )
                return (
                    item["id"] not in profile.get("goalRoleIds", []),
                    not bool(item.get("interdisciplinaryFit")),
                    not bool(item.get("topMatchingSignals")),
                    -item["overallScore"],
                    not is_adjacent,
                    item["family"] != primary["family"],
                    item["title"],
                )

            fallback = (
                min(scored[1:], key=fallback_key)
                if len(scored) > 1
                else None
            )
            candidate_pool = [primary, *([fallback] if fallback else [])]
        target_count = max(2, min(count, 5))
        diversified = self._diversify(candidate_pool, target_count)
        if len(diversified) < min(2, len(scored)):
            diversified = self._diversify(scored, target_count)
        if len(diversified) < 2:
            raise ApiError(
                "INSUFFICIENT_DESTINATION_VARIETY",
                (
                    "PathIn needs at least two distinct career options. "
                    "Adjust the profile exclusions or add more career evidence."
                ),
                details={
                    "minimumCareerOptions": 2,
                    "eligibleCareerOptions": len(diversified),
                },
            )

        selected_families = {item["family"] for item in diversified}
        alternative_families = [
            item["family"]
            for item in scored
            if item["family"] not in selected_families
        ]
        alternatives = list(dict.fromkeys(alternative_families))[:4]
        for index, item in enumerate(diversified, start=1):
            item["rank"] = index
            item["alternativeRoleFamilies"] = alternatives
        self._mark_north_star(profile, diversified)
        return diversified

    def score_destination(
        self,
        profile: dict[str, Any],
        role_id: str,
        *,
        feedback: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        candidate = next(
            (item for item in self.candidates if item["id"] == role_id), None
        )
        if not candidate:
            raise ApiError(
                "INVALID_DESTINATION",
                "Choose a destination returned by the PathIn catalog.",
                details={"destinationId": role_id},
            )
        if self._excluded(candidate, profile, feedback or {}):
            raise ApiError(
                "DESTINATION_EXCLUDED",
                "This destination conflicts with an explicit profile exclusion.",
                details={"destinationId": role_id},
            )
        result = self._score_candidate(profile, candidate, feedback=feedback or {})
        result["rank"] = 1
        result["alternativeRoleFamilies"] = []
        self._mark_north_star(profile, [result])
        return result

    def build_map(
        self,
        profile: dict[str, Any],
        recommendations: list[dict[str, Any]],
        *,
        mode: str,
        pinned_node_ids: list[str] | None = None,
        dismissed_node_ids: list[str] | None = None,
        feedback: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        pinned_node_ids = pinned_node_ids or []
        dismissed_node_ids = dismissed_node_ids or []
        feedback = feedback or {}
        nodes: dict[str, dict[str, Any]] = {}
        paths: list[dict[str, Any]] = []
        edges: dict[tuple[str, str], dict[str, Any]] = {}
        destination_ids: list[str] = []
        build_paths: dict[str, list[str]] = {}
        explore_paths: list[str] = []

        nodes["current"] = self._current_node(profile)
        for recommendation in recommendations:
            destination_id = f"dest-{recommendation['id']}"
            destination_ids.append(destination_id)
            destination = self._destination_node(recommendation)
            destination["id"] = destination_id
            nodes[destination_id] = destination

            generated = self._generate_routes(
                profile,
                recommendation,
                feedback=feedback,
            )
            route_ids: list[str] = []
            for route in generated:
                route_ids.append(route["path"]["id"])
                paths.append(route["path"])
                for node in route["nodes"]:
                    nodes[node["id"]] = node
                for source, target in zip(
                    route["path"]["nodeIds"],
                    route["path"]["nodeIds"][1:],
                ):
                    key = (source, target)
                    if key not in edges:
                        edges[key] = self._edge(
                            source,
                            target,
                            nodes,
                            profile,
                        )
            build_paths[destination_id] = route_ids
            alternative_target = str(
                feedback.get("alternativeRouteFor", "")
            )
            explore_paths.append(
                route_ids[1]
                if alternative_target in {destination_id, recommendation["id"]}
                and len(route_ids) > 1
                else route_ids[0]
            )

        generated_at = _timestamp()
        fingerprint_payload = {
            "profile": {
                key: profile.get(key)
                for key in (
                    "education",
                    "roles",
                    "responsibilities",
                    "projects",
                    "skills",
                    "interests",
                    "goals",
                    "preferences",
                    "constraints",
                    "enabledSignals",
                    "profileFingerprint",
                )
            },
            "recommendations": [
                {
                    "id": item["id"],
                    "personalizedTitle": item["personalizedTitle"],
                    "isDreamCareer": item["isDreamCareer"],
                }
                for item in recommendations
            ],
            "mode": mode,
            "feedback": feedback,
            "versions": [
                TAXONOMY_VERSION,
                MODEL_VERSION,
                ALGORITHM_VERSION,
            ],
        }
        fingerprint = hashlib.sha256(
            json.dumps(
                fingerprint_payload,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest()
        map_id = f"map_{fingerprint[:20]}"
        source = copy.deepcopy(self.catalog["source"])
        source["fetchedAt"] = generated_at
        dream_career = self._dream_career(
            recommendations,
            build_paths,
            paths,
            nodes,
        )
        map_data = {
            "id": map_id,
            "name": "My PathIn career map",
            "mode": mode,
            "disclaimer": (
                "These are explainable possibilities based on enabled profile "
                "evidence, taxonomy matches, and privacy-safe synthetic PIT data. "
                "They are not hiring predictions or guaranteed outcomes."
            ),
            "profile": self._frontend_profile(profile),
            "profileSnapshot": copy.deepcopy(profile),
            "profileFingerprint": copy.deepcopy(
                profile["profileFingerprint"]
            ),
            "profileSummary": nodes["current"]["summary"],
            "dreamCareer": dream_career,
            "rankedDestinations": copy.deepcopy(recommendations),
            "nodes": list(nodes.values()),
            "edges": list(edges.values()),
            "paths": paths,
            "explorePathIds": explore_paths,
            "buildPathIdsByDestination": build_paths,
            "destinationIds": destination_ids,
            "pinnedNodeIds": [
                node_id for node_id in pinned_node_ids if node_id in nodes
            ],
            "dismissedNodeIds": [
                node_id for node_id in dismissed_node_ids if node_id in nodes
            ],
            "enabledSignals": profile["enabledSignals"],
            "exactSignalsUsed": {
                category: [
                    {
                        "value": item["value"],
                        "source": item["source"],
                        "confidence": item["confidence"],
                        "explicit": item["explicit"],
                    }
                    for item in profile["fieldEvidence"].get(category, [])
                ]
                for category in profile["enabledSignals"]
            },
            "generationConstraints": {
                "preferences": profile.get("preferences", {}),
                "constraints": profile.get("constraints", {}),
                "exclusions": profile.get("exclusions", []),
                "feedback": feedback,
            },
            "warnings": [
                "Sparse historical transitions are suppressed below 20 profiles.",
                "PIT salaries are synthetic posting fields, not live market estimates.",
                "Limited and exploratory matches need more evidence before acting.",
            ],
            "source": source,
            "generation": {
                "dataVersion": (
                    "pit-live-2026-06"
                    if source["status"] == "live"
                    else "pit-snapshot-2026-06-23"
                ),
                "taxonomyVersion": TAXONOMY_VERSION,
                "modelVersion": MODEL_VERSION,
                "algorithmVersion": ALGORITHM_VERSION,
                "promptVersion": "evidence-grounded-career-paths-2.2",
                "requestFingerprint": fingerprint,
                "generatedAt": generated_at,
            },
            "createdAt": generated_at,
            "updatedAt": generated_at,
        }
        return map_data

    @staticmethod
    def _dream_career(
        recommendations: list[dict[str, Any]],
        build_paths: dict[str, list[str]],
        paths: list[dict[str, Any]],
        nodes: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        dream = next(
            (
                item
                for item in recommendations
                if item.get("isDreamCareer")
            ),
            recommendations[0],
        )
        destination_id = dream["destinationId"]
        route_ids = build_paths.get(destination_id, [])
        route = next(
            (item for item in paths if item["id"] in route_ids),
            None,
        )
        milestone_nodes = (
            [
                nodes[node_id]
                for node_id in route["nodeIds"][1:-1]
                if node_id in nodes
            ]
            if route
            else []
        )
        all_route_nodes = [
            nodes[node_id]
            for path in paths
            if path["destinationId"] == destination_id
            for node_id in path["nodeIds"][1:-1]
            if node_id in nodes
        ]
        intermediate_roles = list(
            dict.fromkeys(
                node["label"]
                for node in all_route_nodes
                if node["type"] in {"entry_role", "role"}
            )
        )
        return {
            "destinationId": destination_id,
            "personalizedDreamTitle": dream["personalizedTitle"],
            "canonicalRole": dream["canonicalRole"],
            "specialization": dream["specialization"],
            "targetIndustryOrDomain": dream[
                "targetIndustryOrDomain"
            ],
            "targetProblem": dream["targetProblem"],
            "careerHorizon": dream["careerHorizon"],
            "careerThesis": dream["careerThesis"],
            "supportingEvidence": copy.deepcopy(
                dream["personalizationEvidence"][:4]
            ),
            "currentAdvantages": dream["transferableSkills"][:5],
            "criticalGaps": dream["gaps"][:3],
            "intermediateRoles": intermediate_roles[:3],
            "personalizedMilestones": [
                {
                    "label": node["label"],
                    "outcome": node["stepDetails"]["completionEvidence"],
                    "groundedIn": node["stepDetails"].get(
                        "supportingEvidence", []
                    ),
                }
                for node in milestone_nodes
                if node.get("stepDetails")
            ],
            "confidence": dream["confidence"],
            "uncertainty": dream["uncertainty"],
            "sourceBlend": dream["sourceBlend"],
            "aspirationSource": dream.get(
                "aspirationSource", "inferred"
            ),
        }

    def _candidate_catalog(self) -> list[dict[str, Any]]:
        candidates = []
        role_stats = self.catalog.get("roleStats", {})
        for taxonomy_role in OCCUPATIONAL_TAXONOMY:
            stats = copy.deepcopy(role_stats.get(taxonomy_role["id"]))
            candidates.append(
                {
                    **copy.deepcopy(taxonomy_role),
                    "market": stats,
                    "catalogSource": "pit" if stats else "taxonomy",
                }
            )
        return candidates

    @staticmethod
    def _has_usable_profile(profile: dict[str, Any]) -> bool:
        return any(
            profile.get(category)
            for category in (
                "education",
                "roles",
                "responsibilities",
                "projects",
                "skills",
                "interests",
                "goals",
            )
        )

    @staticmethod
    def _candidate_capability_labels(
        candidate: dict[str, Any],
    ) -> set[str]:
        return _matching_signal_labels(
            [
                candidate["title"],
                candidate["family"],
                candidate["description"],
                *candidate["skills"],
                *candidate["responsibilities"],
                *candidate["interests"],
                *candidate["projects"],
                *candidate["workStyles"],
            ],
            CAPABILITY_SIGNALS,
        )

    @staticmethod
    def _role_anchor_count(
        profile: dict[str, Any],
        candidate: dict[str, Any],
    ) -> int:
        profile_values = [
            *profile["skills"],
            *profile["responsibilities"],
            *profile["projects"],
            *profile["education"],
        ]
        profile_concepts = semantic_concepts(profile_values)
        normalized_profile_skills = {
            _normalized_skill(value) for value in profile["skills"]
        }
        matched_anchors = {
            skill
            for skill in candidate["skills"]
            if (
                _normalized_skill(skill) in normalized_profile_skills
                or semantic_concepts([skill]) & profile_concepts
            )
        }
        return len(matched_anchors)

    @classmethod
    def _interdisciplinary_alignment(
        cls,
        profile: dict[str, Any],
        candidate: dict[str, Any],
        *,
        evidence_fit: float,
        role_anchor_count: int,
    ) -> dict[str, Any] | None:
        fingerprint = profile.get("profileFingerprint", {})
        profile_capabilities = {
            str(item["label"])
            for item in fingerprint.get("capabilityThemes", [])
        }
        candidate_capabilities = cls._candidate_capability_labels(candidate)
        shared_capabilities = sorted(
            profile_capabilities
            & candidate_capabilities
            & DOMAIN_PORTABLE_CAPABILITIES
        )
        current_role_ids = set(profile.get("currentRoleIds", []))
        explicit_role_direction = (
            candidate["id"]
            in {
                *current_role_ids,
                *profile.get("goalRoleIds", []),
            }
            or bool(
                current_role_ids & set(candidate["adjacentRoleIds"])
            )
        )
        if (
            not shared_capabilities
            or evidence_fit < 20
            or (role_anchor_count < 2 and not explicit_role_direction)
        ):
            return None

        candidate_industries = {
            _normalized_text(value) for value in candidate["industries"]
        }
        alignments = []
        for domain in fingerprint.get("domains", []):
            support = domain.get("supportingEvidence", [])
            explicitly_directional = any(
                item.get("explicit")
                and item.get("category")
                in {"industries", "interests", "goals"}
                for item in support
            )
            if (
                float(domain.get("strength", 0)) < 0.6
                or (len(support) < 2 and not explicitly_directional)
            ):
                continue

            industry_aliases = {
                _normalized_text(value)
                for value in DOMAIN_INDUSTRY_ALIASES.get(
                    str(domain["label"]),
                    (),
                )
            }
            direct_industry_match = bool(
                candidate_industries & industry_aliases
            )
            score = (
                float(domain["strength"]) * 60
                + min(3, len(shared_capabilities)) * 10
                + min(100, evidence_fit) * 0.2
                + (10 if direct_industry_match else 0)
            )
            alignments.append(
                {
                    "domain": copy.deepcopy(domain),
                    "capabilityThemes": shared_capabilities[:3],
                    "score": round(min(100.0, score), 1),
                    "alignmentType": (
                        "industry_and_transferable_capabilities"
                        if direct_industry_match
                        else "transferable_capabilities"
                    ),
                }
            )

        if not alignments:
            return None
        return max(
            alignments,
            key=lambda item: (
                float(item["score"]),
                float(item["domain"]["strength"]),
                item["domain"]["label"],
            ),
        )

    def _retrieval_score(
        self, profile: dict[str, Any], candidate: dict[str, Any]
    ) -> float:
        profile_values = [
            *profile["skills"],
            *profile["roles"],
            *profile["responsibilities"],
            *profile["education"],
            *profile["projects"],
            *profile["interests"],
            *profile["goals"],
            *profile["industries"],
        ]
        profile_concepts = semantic_concepts(profile_values)
        candidate_concepts = role_concepts(candidate)
        concept_score = len(profile_concepts & candidate_concepts) * 8
        token_score = len(_terms(profile_values) & _terms(
            [
                candidate["title"],
                candidate["description"],
                *candidate["skills"],
                *candidate["responsibilities"],
            ]
        ))
        adjacency = 12 if any(
            role_id in candidate["adjacentRoleIds"]
            for role_id in profile["currentRoleIds"]
        ) else 0
        same_role = 18 if candidate["id"] in profile["currentRoleIds"] else 0
        profile_capabilities = {
            str(item["label"])
            for item in profile.get("profileFingerprint", {}).get(
                "capabilityThemes",
                [],
            )
        }
        shared_capabilities = (
            profile_capabilities
            & self._candidate_capability_labels(candidate)
        )
        domain_bonus = 0
        if shared_capabilities and profile.get(
            "profileFingerprint", {}
        ).get("domains"):
            domain_bonus = min(12, len(shared_capabilities) * 4)
        return (
            concept_score
            + token_score
            + adjacency
            + same_role
            + len(shared_capabilities) * 6
            + domain_bonus
        )

    def _score_candidate(
        self,
        profile: dict[str, Any],
        candidate: dict[str, Any],
        *,
        feedback: dict[str, Any],
    ) -> dict[str, Any]:
        skill_score, skill_matches = self._overlap_score(
            profile["skills"],
            candidate["skills"],
        )
        inferred_skills = {
            item["value"]
            for item in profile["fieldEvidence"].get("skills", [])
            if not item["explicit"]
        }
        if inferred_skills:
            inferred_match_count = len(
                {
                    value
                    for value in skill_matches
                    if any(
                        _normalized_text(value) == _normalized_text(inferred)
                        for inferred in inferred_skills
                    )
                }
            )
            skill_score = max(0.0, skill_score - inferred_match_count * 6)

        responsibility_score, responsibility_matches = self._overlap_score(
            [*profile["roles"], *profile["responsibilities"]],
            [
                candidate["title"],
                *candidate["responsibilities"],
                *[
                    ROLE_BY_ID[role_id]["title"]
                    for role_id in candidate["adjacentRoleIds"]
                    if role_id in ROLE_BY_ID
                ],
            ],
        )
        same_current_role = candidate["id"] in profile["currentRoleIds"]
        adjacent_current_role = any(
            role_id in candidate["adjacentRoleIds"]
            for role_id in profile["currentRoleIds"]
        )
        if same_current_role:
            responsibility_score = min(100.0, responsibility_score + 35)
        elif adjacent_current_role:
            responsibility_score = min(100.0, responsibility_score + 25)
        role_anchor_count = self._role_anchor_count(profile, candidate)
        profile_capability_items = profile.get(
            "profileFingerprint", {}
        ).get("capabilityThemes", [])
        profile_capabilities = {
            str(item["label"]) for item in profile_capability_items
        }
        candidate_capabilities = self._candidate_capability_labels(candidate)
        shared_capabilities = sorted(
            profile_capabilities & candidate_capabilities
        )
        if shared_capabilities and (
            role_anchor_count >= 2
            or same_current_role
            or adjacent_current_role
            or candidate["id"] in profile.get("goalRoleIds", [])
        ):
            responsibility_score = max(
                responsibility_score,
                min(80.0, 30 + len(shared_capabilities) * 18),
            )

        interest_score, interest_matches = self._overlap_score(
            [*profile["interests"], *profile["goals"]],
            [*candidate["interests"], candidate["family"], candidate["title"]],
        )
        if candidate["id"] in profile.get("goalRoleIds", []):
            interest_score = 100.0
        project_score, project_matches = self._overlap_score(
            [*profile["projects"], *profile["achievements"]],
            [*candidate["projects"], *candidate["responsibilities"]],
        )
        education_score, education_matches = self._overlap_score(
            [*profile["education"], *profile["coursework"], *profile["certifications"]],
            candidate["education"],
        )
        preference_score, preference_matches = self._preference_score(
            profile, candidate
        )
        evidence_fit = max(
            skill_score,
            responsibility_score,
            project_score,
            education_score,
        )
        interdisciplinary_fit = self._interdisciplinary_alignment(
            profile,
            candidate,
            evidence_fit=evidence_fit,
            role_anchor_count=role_anchor_count,
        )
        if interdisciplinary_fit:
            interest_score = max(
                interest_score,
                float(interdisciplinary_fit["score"]),
            )

        gaps = self._skill_gaps(profile, candidate)
        seniority_penalty, seniority_reason = self._seniority_penalty(
            profile, candidate
        )
        transition_effort_score = max(
            0.0,
            100
            - min(70, len(gaps) * 12)
            - seniority_penalty,
        )
        history_score, history_evidence = self._history_score(profile, candidate)

        raw_scores = {
            "skillOverlap": skill_score,
            "experienceAdjacency": responsibility_score,
            "interestsAndGoals": interest_score,
            "projectEvidence": project_score,
            "educationRelevance": education_score,
            "preferencesAndConstraints": preference_score,
            "transitionEffort": transition_effort_score,
            "careerHistoryEvidence": history_score,
        }
        component_scores = {
            component: {
                "score": round(score, 1),
                "weight": weight,
                "contribution": round(score * weight / 100, 1),
            }
            for component, weight in SCORING_WEIGHTS.items()
            for score in [raw_scores[component]]
        }
        overall = sum(
            item["contribution"] for item in component_scores.values()
        )

        more_like_id = str(feedback.get("moreLikeRoleId", "")).removeprefix("dest-")
        different_id = str(feedback.get("differentFromRoleId", "")).removeprefix("dest-")
        if more_like_id in ROLE_BY_ID:
            if candidate["family"] == ROLE_BY_ID[more_like_id]["family"]:
                overall += 8
            if candidate["id"] == more_like_id:
                overall += 4
        if different_id in ROLE_BY_ID:
            if candidate["family"] == ROLE_BY_ID[different_id]["family"]:
                overall -= 14
            elif candidate["id"] != different_id:
                overall += 3
        if candidate["id"] in {
            value.removeprefix("dest-")
            for value in _string_list(feedback.get("pinnedDestinationIds"))
        }:
            overall += 10
        overall = round(max(0, min(100, overall)), 1)

        confidence = self._confidence(overall, profile["completeness"], candidate)
        difficulty = self._difficulty(transition_effort_score, seniority_penalty)
        stage = self._match_stage(
            skill_score, responsibility_score, candidate["level"], profile
        )
        matches = list(
            dict.fromkeys(
                [
                    *skill_matches,
                    *responsibility_matches,
                    *interest_matches,
                    *project_matches,
                    *education_matches,
                    *preference_matches,
                ]
            )
        )[:10]
        top_profile_signals = self._matching_profile_evidence(profile, candidate)
        if interdisciplinary_fit:
            supporting_evidence = [
                *interdisciplinary_fit["domain"].get(
                    "supportingEvidence",
                    [],
                ),
                *[
                    evidence
                    for item in profile_capability_items
                    if item["label"]
                    in interdisciplinary_fit["capabilityThemes"]
                    for evidence in item.get("supportingEvidence", [])
                ],
            ]
            seen_signals = {
                (item["category"], item["value"])
                for item in top_profile_signals
            }
            for item in supporting_evidence:
                key = (item["category"], item["value"])
                if key not in seen_signals:
                    top_profile_signals.append(copy.deepcopy(item))
                    seen_signals.add(key)
        personalization = self._personalize_candidate(
            profile,
            candidate,
            top_profile_signals,
            gaps,
            stage,
            skill_matches,
            interdisciplinary_fit,
        )
        explanation = self._explanation(
            personalization,
            gaps,
        )
        uncertainty = self._uncertainty(
            confidence,
            profile,
            history_evidence,
            seniority_reason,
        )

        return {
            "id": candidate["id"],
            "destinationId": f"dest-{candidate['id']}",
            "title": personalization["personalizedTitle"],
            "canonicalRole": candidate["title"],
            "personalizedTitle": personalization["personalizedTitle"],
            "specialization": personalization["specialization"],
            "targetIndustryOrDomain": personalization[
                "targetIndustryOrDomain"
            ],
            "targetProblem": personalization["targetProblem"],
            "careerHorizon": personalization["careerHorizon"],
            "careerPosition": personalization["careerPosition"],
            "personalizationEvidence": personalization[
                "personalizationEvidence"
            ],
            "careerThesis": personalization["careerThesis"],
            "sourceBlend": personalization["sourceBlend"],
            "interdisciplinaryFit": copy.deepcopy(interdisciplinary_fit),
            "aspirationSource": "inferred",
            "isDreamCareer": False,
            "family": candidate["family"],
            "rank": 0,
            "overallScore": overall,
            "componentScores": component_scores,
            "confidence": confidence,
            "transitionDifficulty": difficulty,
            "matchStage": stage,
            "explanation": explanation,
            "topMatchingSignals": top_profile_signals[:5],
            "matches": matches,
            "transferableSkills": skill_matches[:6],
            "gaps": gaps[:6],
            "constraintsApplied": self._constraints_applied(profile),
            "uncertainty": uncertainty,
            "seniorityPenalty": seniority_penalty,
            "seniorityReason": seniority_reason,
            "historicalEvidence": history_evidence,
            "sourceStrength": {
                "profileFit": "strong" if top_profile_signals else "limited",
                "marketEvidence": "moderate" if candidate["market"] else "limited",
                "taxonomyInference": "maintained",
                "historicalEvidence": history_evidence["strength"],
            },
            "catalogSource": candidate["catalogSource"],
            "description": candidate["description"],
            "responsibilities": candidate["responsibilities"],
            "skills": candidate["skills"],
            "workStyles": candidate["workStyles"],
            "market": copy.deepcopy(candidate["market"]),
            "alternativeRoleFamilies": [],
        }

    @staticmethod
    def _overlap_score(
        profile_values: list[str],
        candidate_values: list[str],
    ) -> tuple[float, list[str]]:
        if not profile_values:
            return 0.0, []
        profile_concepts = semantic_concepts(profile_values)
        profile_terms = _terms(profile_values)
        normalized_profile_values = {
            _normalized_skill(value) for value in profile_values
        }
        matches = []
        for candidate_value in candidate_values:
            candidate_concepts = semantic_concepts([candidate_value])
            candidate_terms = _terms([candidate_value])
            if (
                profile_concepts & candidate_concepts
                or profile_terms & candidate_terms
                or _normalized_skill(candidate_value)
                in normalized_profile_values
            ):
                matches.append(candidate_value)
        denominator = max(1, min(8, len(candidate_values)))
        return min(100.0, len(matches) / denominator * 100), matches

    def _preference_score(
        self,
        profile: dict[str, Any],
        candidate: dict[str, Any],
    ) -> tuple[float, list[str]]:
        preferences = profile.get("preferences", {})
        preferred_industries = list(
            dict.fromkeys(
                [
                    *profile.get("industries", []),
                    *_string_list(preferences.get("industries")),
                ]
            )
        )
        work_styles = list(
            dict.fromkeys(
                [
                    *profile.get("workStyles", []),
                    *_string_list(preferences.get("workStyles")),
                ]
            )
        )
        locations = profile.get("locationPreferences", [])
        supplied = bool(preferred_industries or work_styles or locations)
        if not supplied:
            return 50.0, []
        matches = []
        score_parts = []
        if preferred_industries:
            overlap = {
                value.lower()
                for value in preferred_industries
            } & {
                value.lower()
                for value in candidate["industries"]
            }
            score_parts.append(100 if overlap else 20)
            matches.extend(sorted(overlap))
        if work_styles:
            work_score, work_matches = self._overlap_score(
                work_styles, candidate["workStyles"]
            )
            score_parts.append(work_score)
            matches.extend(work_matches)
        if locations:
            market_locations = (candidate.get("market") or {}).get("locations", [])
            location_score, location_matches = self._overlap_score(
                locations, market_locations
            )
            score_parts.append(location_score if market_locations else 40)
            matches.extend(location_matches)
        return sum(score_parts) / len(score_parts), matches

    @staticmethod
    def _skill_gaps(
        profile: dict[str, Any],
        candidate: dict[str, Any],
    ) -> list[str]:
        profile_values = [
            *profile["skills"],
            *profile["responsibilities"],
            *profile["projects"],
            *profile["education"],
        ]
        concepts = semantic_concepts(profile_values)
        terms = _terms(profile_values)
        normalized_profile_skills = {
            _normalized_skill(value) for value in profile["skills"]
        }
        gaps = []
        for skill in candidate["skills"]:
            if not (
                semantic_concepts([skill]) & concepts
                or _terms([skill]) & terms
                or _normalized_skill(skill) in normalized_profile_skills
            ):
                gaps.append(skill)
        return gaps

    @staticmethod
    def _seniority_penalty(
        profile: dict[str, Any],
        candidate: dict[str, Any],
    ) -> tuple[int, str]:
        target_level = int(candidate["level"])
        current_level = profile.get("explicitCareerLevel")
        if current_level is None:
            if target_level >= 4:
                return 50, "No explicit people-leadership or senior-level evidence supports this jump."
            if target_level == 3:
                return 22, "The profile does not explicitly establish senior-level scope."
            return 0, ""
        distance = target_level - int(current_level)
        if distance <= 1:
            return 0, ""
        penalty = min(60, (distance - 1) * 25)
        return penalty, (
            f"The destination is {distance} levels above the explicitly stated "
            "career level, so intermediate evidence is required."
        )

    def _history_score(
        self,
        profile: dict[str, Any],
        candidate: dict[str, Any],
    ) -> tuple[float, dict[str, Any]]:
        counts = self.catalog.get("transitionCounts", {})
        observed = []
        sparse = []
        for role_id in profile["currentRoleIds"]:
            count = int(counts.get(f"{role_id}::{candidate['id']}", 0))
            if count >= PRIVACY_THRESHOLD:
                observed.append(count)
            elif count > 0:
                sparse.append(count)
        if observed:
            highest = max(observed)
            return min(100.0, 65 + highest), {
                "status": "approved",
                "strength": "moderate",
                "cohortSizeBucket": "20_plus",
                "frequencyBucket": "100_plus" if highest >= 100 else "20_to_99",
                "explanation": (
                    "A matching transition exists in the synthetic PIT dataset "
                    "above the 20-profile privacy threshold."
                ),
            }
        if sparse:
            return 12.0, {
                "status": "suppressed",
                "strength": "limited",
                "cohortSizeBucket": "below_20",
                "frequencyBucket": "insufficient_data",
                "explanation": (
                    "Related synthetic PIT transitions exist, but their counts "
                    "are below the 20-profile threshold and are not exposed."
                ),
            }
        return 18.0, {
            "status": "not_observed",
            "strength": "limited",
            "cohortSizeBucket": "not_available",
            "frequencyBucket": "not_observed",
            "explanation": (
                "No privacy-safe PIT transition supports this route. It is shown "
                "from profile fit and taxonomy evidence only."
            ),
        }

    @staticmethod
    def _confidence(
        overall: float,
        completeness: float,
        candidate: dict[str, Any],
    ) -> str:
        adjusted = overall * (0.65 + completeness * 0.35)
        if not candidate.get("market"):
            adjusted -= 5
        if adjusted >= 75:
            return "strong"
        if adjusted >= 58:
            return "moderate"
        if adjusted >= 42:
            return "limited"
        return "exploratory"

    @staticmethod
    def _difficulty(effort_score: float, seniority_penalty: int) -> str:
        if seniority_penalty >= 40 or effort_score < 35:
            return "high"
        if effort_score < 68:
            return "moderate"
        return "lower"

    @staticmethod
    def _match_stage(
        skill_score: float,
        responsibility_score: float,
        target_level: int,
        profile: dict[str, Any],
    ) -> str:
        current_level = profile.get("explicitCareerLevel")
        if (
            skill_score >= 72
            and responsibility_score >= 60
            and (current_level is None or target_level <= current_level + 1)
        ):
            return "qualified_now"
        if skill_score >= 38 or responsibility_score >= 38:
            return "realistic_next_move"
        return "longer_term_path"

    @staticmethod
    def _matching_profile_evidence(
        profile: dict[str, Any],
        candidate: dict[str, Any],
    ) -> list[dict[str, Any]]:
        candidate_values = [
            candidate["title"],
            candidate["family"],
            *candidate["skills"],
            *candidate["responsibilities"],
            *candidate["interests"],
            *candidate["industries"],
            *candidate["education"],
            *candidate["workStyles"],
        ]
        candidate_concepts = semantic_concepts(candidate_values)
        candidate_terms = _terms(candidate_values)
        matches = []
        for category in profile["enabledSignals"]:
            for item in profile["fieldEvidence"].get(category, []):
                value = item["value"]
                if (
                    semantic_concepts([value]) & candidate_concepts
                    or _terms([value]) & candidate_terms
                ):
                    matches.append(
                        {
                            "category": category,
                            "value": value,
                            "source": item["source"],
                            "confidence": item["confidence"],
                            "explicit": item["explicit"],
                            "corroboratedBy": (
                                ProfileNormalizer._evidence_sources(item)
                            ),
                        }
                    )
        matches.sort(
            key=lambda item: (
                not item["explicit"],
                -float(item["confidence"]),
                item["category"],
                item["value"],
            )
        )
        return matches

    @staticmethod
    def _evidence_for_keywords(
        profile: dict[str, Any],
        keywords: tuple[str, ...],
    ) -> list[dict[str, Any]]:
        evidence = []
        for category in profile["enabledSignals"]:
            for item in profile["fieldEvidence"].get(category, []):
                value = item["value"].lower()
                if not any(
                    contains_alias(value, keyword)
                    for keyword in keywords
                ):
                    continue
                evidence.append(
                    {
                        "category": category,
                        "value": item["value"],
                        "source": item["source"],
                        "confidence": item["confidence"],
                        "explicit": item["explicit"],
                        "corroboratedBy": (
                            ProfileNormalizer._evidence_sources(item)
                        ),
                    }
                )
        evidence.sort(
            key=lambda item: (
                not item["explicit"],
                -float(item["confidence"]),
                item["category"],
                item["value"],
            )
        )
        return evidence

    @staticmethod
    def _source_blend_label(evidence: list[dict[str, Any]]) -> str:
        sources = {
            source
            for item in evidence
            for source in (
                item.get("corroboratedBy")
                or [item.get("source", "")]
            )
        }
        if {"resume", "linkedin"} <= sources:
            return "resume and LinkedIn evidence"
        if "linkedin" in sources:
            return "LinkedIn evidence"
        if "resume" in sources:
            return "resume evidence"
        return "enabled profile evidence"

    def _personalize_candidate(
        self,
        profile: dict[str, Any],
        candidate: dict[str, Any],
        top_signals: list[dict[str, Any]],
        gaps: list[str],
        stage: str,
        skill_matches: list[str],
        interdisciplinary_fit: dict[str, Any] | None,
    ) -> dict[str, Any]:
        specialization = candidate["title"]
        specialization_evidence: list[dict[str, Any]] = []
        for label, keywords in ROLE_SPECIALIZATION_RULES.get(
            candidate["id"], ()
        ):
            matched = self._evidence_for_keywords(profile, keywords)
            if matched:
                specialization = label
                specialization_evidence = matched
                break

        fingerprint = profile.get("profileFingerprint", {})
        domain = (
            interdisciplinary_fit["domain"]
            if interdisciplinary_fit
            else None
        )
        target_domain = str(domain["label"]) if domain else ""
        target_problem = (
            str(fingerprint["problemThemes"][0]["label"])
            if fingerprint.get("problemThemes")
            else ""
        )
        domain_terms = _terms([target_domain])
        title_terms = _terms([specialization, candidate["family"]])
        append_domain = bool(
            target_domain
            and not domain_terms & title_terms
            and target_domain
            not in {"Cloud Platforms", "Marketing and Media"}
        )
        personalized_title = (
            f"{specialization} for {target_domain}"
            if append_domain
            else specialization
        )

        domain_evidence = (
            copy.deepcopy(domain.get("supportingEvidence", []))
            if domain
            else []
        )
        combined_evidence = []
        seen_evidence: set[tuple[str, str]] = set()
        for item in [
            *specialization_evidence,
            *domain_evidence,
            *top_signals,
        ]:
            key = (str(item.get("category")), str(item.get("value")))
            if key in seen_evidence:
                continue
            seen_evidence.add(key)
            combined_evidence.append(copy.deepcopy(item))

        horizon_by_stage = {
            "qualified_now": "Now to 18 months",
            "realistic_next_move": "1 to 3 years",
            "longer_term_path": "3 to 7 years",
        }
        position_by_stage = {
            "qualified_now": "ready_now",
            "realistic_next_move": "next_move",
            "longer_term_path": "longer_term",
        }
        current_strengths = skill_matches[:3]
        if not current_strengths:
            current_strengths = [
                item["value"]
                for item in combined_evidence
                if len(item["value"]) <= 40
            ][:2]
        if not current_strengths:
            current_strengths = ["limited role-specific evidence"]
        gap_copy = gaps[0] if gaps else "role-specific proof"
        capability_themes = (
            interdisciplinary_fit["capabilityThemes"]
            if interdisciplinary_fit
            else []
        )
        intersection_copy = (
            f"Intersection: {', '.join(capability_themes)} applied to "
            f"{target_domain}. "
            if target_domain and capability_themes
            else ""
        )
        career_thesis = (
            f"{intersection_copy}"
            f"Current evidence: {', '.join(current_strengths)}. "
            f"Build next: {gap_copy}."
        )
        return {
            "canonicalRole": candidate["title"],
            "personalizedTitle": personalized_title,
            "specialization": specialization,
            "targetIndustryOrDomain": target_domain or None,
            "targetProblem": target_problem or None,
            "careerHorizon": horizon_by_stage[stage],
            "careerPosition": position_by_stage[stage],
            "personalizationEvidence": combined_evidence[:6],
            "currentStrengths": current_strengths,
            "capabilityThemes": capability_themes,
            "careerThesis": career_thesis,
            "sourceBlend": self._source_blend_label(combined_evidence),
        }

    @staticmethod
    def _mark_north_star(
        profile: dict[str, Any],
        recommendations: list[dict[str, Any]],
    ) -> None:
        if not recommendations:
            return

        def north_star_score(item: dict[str, Any]) -> tuple[float, float, str]:
            components = item["componentScores"]
            aspiration = (
                components["interestsAndGoals"]["contribution"] * 1.4
                + components["projectEvidence"]["contribution"] * 0.8
            )
            horizon_bonus = {
                "qualified_now": 0,
                "realistic_next_move": 4,
                "longer_term_path": 2,
            }[item["matchStage"]]
            evidence_bonus = min(
                4,
                len(item.get("personalizationEvidence", [])),
            )
            score = (
                item["overallScore"]
                + aspiration
                + horizon_bonus
                + evidence_bonus
                - item["seniorityPenalty"] * 0.15
            )
            return score, item["overallScore"], item["canonicalRole"]

        explicit_goal_match: tuple[dict[str, Any], str] | None = None
        for goal in profile.get("goals", []):
            normalized_goal_role = normalize_title(goal)
            if normalized_goal_role:
                exact_match = next(
                    (
                        item
                        for item in recommendations
                        if item["id"] == normalized_goal_role
                    ),
                    None,
                )
                if exact_match:
                    explicit_goal_match = (exact_match, goal)
                    break
            goal_terms = _terms([goal])
            if not goal_terms:
                continue
            matching_recommendations = [
                item
                for item in recommendations
                if (
                    role_terms := _terms([item["canonicalRole"]])
                )
                and role_terms <= goal_terms
            ]
            if matching_recommendations:
                explicit_goal_match = (
                    max(matching_recommendations, key=north_star_score),
                    goal,
                )
                break

        if explicit_goal_match:
            dream, stated_goal = explicit_goal_match
            dream["aspirationSource"] = "user_selected"
            gap_copy = ", ".join(dream["gaps"][:2]) or "role-specific proof"
            dream["careerThesis"] = (
                f"North Star selected from your stated goal: {stated_goal}. "
                f"Build next: {gap_copy}."
            )
            dream["uncertainty"] = (
                "This destination reflects a stated aspiration. Employer fit, "
                "seniority, interview readiness, and hiring outcomes are not "
                "inferred from enabled profile evidence."
            )
        else:
            dream = max(recommendations, key=north_star_score)
            dream["aspirationSource"] = "inferred"
        dream["isDreamCareer"] = True
        dream["careerPosition"] = "north_star"
        if dream["matchStage"] == "qualified_now":
            dream["careerHorizon"] = (
                dream["careerHorizon"]
                if dream.get("aspirationSource") == "user_selected"
                else "2 to 5 years"
            )

    @staticmethod
    def _explanation(
        personalization: dict[str, Any],
        gaps: list[str],
    ) -> str:
        strength_copy = ", ".join(
            personalization["currentStrengths"][:3]
        )
        gap_copy = gaps[0] if gaps else "role-specific applied proof"
        target_domain = personalization.get("targetIndustryOrDomain")
        capability_themes = personalization.get("capabilityThemes", [])
        if target_domain and capability_themes:
            return (
                f"This interdisciplinary option connects "
                f"{', '.join(capability_themes[:2])} with {target_domain}. "
                f"Current evidence: {strength_copy}. Next gap: {gap_copy}."
            )
        return (
            f"Current evidence: {strength_copy}. Next gap: {gap_copy}."
        )

    @staticmethod
    def _uncertainty(
        confidence: str,
        profile: dict[str, Any],
        history: dict[str, Any],
        seniority_reason: str,
    ) -> str:
        reasons = []
        if profile["completeness"] < 0.55:
            reasons.append("the enabled profile is incomplete")
        if history["status"] != "approved":
            reasons.append("privacy-safe historical support is limited")
        if seniority_reason:
            reasons.append(seniority_reason.rstrip(".").lower())
        if not reasons:
            return (
                f"Confidence is {confidence}, but this remains a possibility "
                "rather than a predicted outcome."
            )
        return (
            f"Confidence is {confidence} because "
            + ", and ".join(reasons)
            + "."
        )

    @staticmethod
    def _constraints_applied(profile: dict[str, Any]) -> list[str]:
        applied = []
        if profile.get("exclusions"):
            applied.append(
                "Excluded: " + ", ".join(profile["exclusions"][:5])
            )
        if profile.get("locationPreferences"):
            applied.append(
                "Location: " + ", ".join(profile["locationPreferences"][:3])
            )
        if profile.get("trainingTime"):
            applied.append(f"Training time: {profile['trainingTime']}")
        if profile.get("desiredDifficulty"):
            applied.append(
                f"Desired change difficulty: {profile['desiredDifficulty']}"
            )
        return applied

    def _excluded(
        self,
        candidate: dict[str, Any],
        profile: dict[str, Any],
        feedback: dict[str, Any],
    ) -> bool:
        exclusions = [
            *profile.get("exclusions", []),
            *_string_list(feedback.get("excludedRoles")),
            *_string_list(feedback.get("notForMeRoleIds")),
            *_string_list(feedback.get("regeneratedFromRoleIds")),
        ]
        normalized_exclusions = {_normalized_text(value) for value in exclusions}
        role_keys = {
            _normalized_text(candidate["id"]),
            _normalized_text(f"dest-{candidate['id']}"),
            _normalized_text(candidate["title"]),
            _normalized_text(candidate["family"]),
        }
        if any(
            excluded in role_keys
            or any(excluded in key or key in excluded for key in role_keys)
            for excluded in normalized_exclusions
            if excluded
        ):
            return True
        excluded_industries = {
            value.lower()
            for value in _string_list(
                profile.get("constraints", {}).get("excludedIndustries")
            )
        }
        if excluded_industries and excluded_industries & {
            value.lower() for value in candidate["industries"]
        }:
            return True
        if (
            profile.get("desiredDifficulty", "").lower() in {"low", "lower"}
            and candidate["level"] >= 4
        ):
            return True
        return False

    @staticmethod
    def _diversify(
        scored: list[dict[str, Any]], count: int
    ) -> list[dict[str, Any]]:
        selected: list[dict[str, Any]] = []
        deferred: list[dict[str, Any]] = []
        families: set[str] = set()
        for item in scored:
            if item["family"] in families:
                deferred.append(item)
                continue
            selected.append(item)
            families.add(item["family"])
            if len(selected) >= count:
                return selected
        for item in deferred:
            selected.append(item)
            if len(selected) >= count:
                break
        return selected

    def _current_node(self, profile: dict[str, Any]) -> dict[str, Any]:
        fingerprint = profile["profileFingerprint"]
        sources = set(fingerprint["sourcesPresent"])
        source_label = (
            "Resume + LinkedIn profile"
            if {"resume", "linkedin"} <= sources
            else "LinkedIn profile"
            if "linkedin" in sources
            else "Resume"
            if "resume" in sources
            else "Profile input"
        )
        evidence_subject = {
            "LinkedIn profile": "LinkedIn profile",
            "Profile input": "enabled profile input",
            "Resume": "resume",
            "Resume + LinkedIn profile": "resume and LinkedIn profile",
        }[source_label]
        role_values = [
            compact_profile_text(
                value,
                max_characters=58,
                fallback="",
            )
            for value in profile["roles"][:3]
        ]
        role_values = [value for value in role_values if value]
        role_copy = (
            ", ".join(role_values[:-1]) + f", and {role_values[-1]}"
            if len(role_values) > 1
            else role_values[0]
            if role_values
            else "the enabled education, projects, and skills"
        )
        skill_values = [
            compact_profile_text(
                value,
                max_characters=36,
                fallback="",
            )
            for value in profile["skills"][:5]
        ]
        skill_copy = ", ".join(
            value for value in skill_values if value
        ) or "the capabilities present in your enabled evidence"
        project_values = [
            compact_profile_text(
                value,
                max_characters=64,
                fallback="",
            )
            for value in profile["projects"][:2]
        ]
        project_copy = "; ".join(
            value for value in project_values if value
        )
        summary = (
            f"Your {evidence_subject} shows {role_copy}. "
            "Demonstrated strengths include "
            f"{skill_copy}."
            + (
                f" Applied proof includes {project_copy}."
                if project_copy
                else ""
            )
        )
        return {
            "id": "current",
            "type": "current",
            "label": "Your current standing",
            "eyebrow": source_label,
            "summary": summary,
            "stage": "Current standing",
            "workSetting": role_copy,
            "whyItFits": [
                (
                    f"{fingerprint['evidenceQuality']['explicitFactCount']} "
                    "explicit facts were analyzed."
                ),
                (
                    f"Evidence came from {', '.join(fingerprint['sourcesPresent'])}."
                    if fingerprint["sourcesPresent"]
                    else "Evidence came from enabled profile input."
                ),
            ],
            "responsibilities": profile["responsibilities"][:6]
            or ["Add responsibilities to improve experience-adjacency scoring."],
            "existingSkills": profile["skills"][:10],
            "transferableSkills": profile["skills"][:8],
            "skillsToBuild": [],
            "preview": summary,
            "challenges": [
                "Incomplete or disabled fields reduce recommendation confidence."
            ],
            "sourceRecord": {
                "id": profile["id"],
                "kind": "profile",
                "label": f"{source_label} evidence",
            },
            "evidence": {
                "enabledSignals": profile["enabledSignals"],
                "completeness": profile["completeness"],
            },
        }

    @staticmethod
    def _destination_node(recommendation: dict[str, Any]) -> dict[str, Any]:
        market = recommendation.get("market")
        position_labels = {
            "north_star": "North Star",
            "ready_now": "Ready-now direction",
            "next_move": "Credible next move",
            "longer_term": "Longer-term direction",
        }
        return {
            "type": "destination",
            "label": recommendation["personalizedTitle"],
            "eyebrow": (
                f"{position_labels[recommendation['careerPosition']]} "
                f"- {recommendation['careerHorizon']}"
            ),
            "summary": recommendation["careerThesis"],
            "stage": recommendation["careerHorizon"],
            "workSetting": ", ".join(recommendation["workStyles"][:2]),
            "whyItFits": [
                recommendation["explanation"],
                recommendation["uncertainty"],
            ],
            "responsibilities": recommendation["responsibilities"],
            "existingSkills": recommendation["transferableSkills"],
            "transferableSkills": recommendation["transferableSkills"],
            "skillsToBuild": recommendation["gaps"],
            "preview": recommendation["description"],
            "challenges": [
                recommendation["uncertainty"],
                (
                    recommendation["seniorityReason"]
                    or "Validate the role through a small project or conversation."
                ),
            ],
            "sourceRecord": {
                "id": recommendation["id"],
                "kind": (
                    "job"
                    if recommendation["catalogSource"] == "pit"
                    else "taxonomy"
                ),
                "label": (
                    (
                        f"Personalized from {recommendation['sourceBlend']}; "
                        f"canonical role: {recommendation['canonicalRole']}"
                    )
                    if recommendation["catalogSource"] == "pit"
                    else (
                        f"Personalized from {recommendation['sourceBlend']}; "
                        f"PathIn taxonomy {TAXONOMY_VERSION}"
                    )
                ),
            },
            **({"market": market} if market else {}),
            "recommendation": copy.deepcopy(recommendation),
            "roleId": recommendation["id"],
        }

    def _generate_routes(
        self,
        profile: dict[str, Any],
        recommendation: dict[str, Any],
        *,
        feedback: dict[str, Any],
    ) -> list[dict[str, Any]]:
        role_id = recommendation["id"]
        destination_id = f"dest-{role_id}"
        avoided_labels = {
            value.lower()
            for value in _string_list(feedback.get("avoidStepLabels"))
        }
        base_gaps = recommendation["gaps"] or recommendation["skills"][:2]
        gaps = [
            gap
            for gap in base_gaps
            if not any(label in gap.lower() or gap.lower() in label for label in avoided_labels)
        ] or base_gaps
        gap = gaps[0]
        seed = self._profile_seed(profile, recommendation)
        seed_value = compact_profile_text(
            seed["value"],
            max_characters=96,
            fallback="supplied profile evidence",
        )
        seed_category_label = EVIDENCE_CATEGORY_LABELS.get(
            seed["category"],
            "profile signal",
        )
        seed_source_label = EVIDENCE_SOURCE_LABELS.get(
            seed["source"],
            "profile",
        )
        seed_context = f"{seed_source_label} {seed_category_label}"
        subject = self._route_subject(
            seed,
            role_id,
            recommendation.get("targetIndustryOrDomain"),
        )
        artifact_template, completion_evidence = ROLE_ARTIFACTS.get(
            role_id,
            (
                "Build applied proof around {subject}",
                "A reviewable artifact, feedback, and a concise outcome summary",
            ),
        )
        project_label = artifact_template.format(subject=subject)
        if role_id == "data-scientist" and contains_alias(subject, "model"):
            project_label = f"Validate and document {subject}"
        if len(project_label) > 110:
            project_label = (
                "Create a role-specific work sample for "
                f"{recommendation['canonicalRole']}"
            )
        evidence_support = (
            f"Grounded in your {seed_context}: {seed_value}. "
            f"The step targets the identified {gap} gap."
        )

        course = self._select_course(
            gaps,
            recommendation["skills"],
            role_id=role_id,
            avoided_labels=avoided_labels,
        )
        course_id = f"course-{role_id}-{slugify(course['id'])}"
        project_id = f"project-{role_id}-{slugify(subject)[:36]}"
        skill_id = f"skill-{role_id}-{slugify(gap)}"
        bridge = self._select_bridge_role(
            profile,
            role_id,
            avoided_labels=avoided_labels,
        )
        bridge_id = f"bridge-{role_id}-{bridge['id']}"
        positioning_id = f"positioning-{role_id}-{slugify(subject)[:30]}"
        source_evidence = [copy.deepcopy(seed)]
        practice = self._practice_blueprint(
            role_id=role_id,
            gap=gap,
            subject=subject,
        )
        bridge_is_current = bridge["id"] in profile["currentRoleIds"]
        bridge_label = (
            f"Expand {bridge['title']} scope"
            if bridge_is_current
            else bridge["title"]
        )

        course_node = {
            "id": course_id,
            "type": "course",
            "label": course["name"],
            "eyebrow": "Learning step",
            "summary": (
                f"{gap} · {course['length']['value']} "
                f"{course['length']['unit']}"
            ),
            "stage": "Learning step",
            "workSetting": f"{course['level']} · {course['length']['value']} {course['length']['unit']}",
            "whyItFits": [
                f"It addresses the explicit {gap} gap.",
                (
                    f"It prepares for a work sample grounded in your "
                    f"{seed_context}, rather than ending with a credential."
                ),
            ],
            "responsibilities": [
                f"Complete only the modules needed for {gap}.",
                f"Apply the learning directly to {subject}.",
            ],
            "existingSkills": recommendation["transferableSkills"][:4],
            "transferableSkills": course["skills"],
            "skillsToBuild": gaps[:3],
            "preview": (
                f"Treat {course['name']} as preparation for a specific proof "
                "artifact, not as the outcome."
            ),
            "challenges": [
                "A course alone does not demonstrate applied experience."
            ],
            "sourceRecord": {
                "id": course["id"],
                "kind": (
                    "course"
                    if course["catalogSource"] == "pit"
                    else "taxonomy"
                ),
                "label": (
                    "PIT course catalog"
                    if course["catalogSource"] == "pit"
                    else f"Generated learning plan from {TAXONOMY_VERSION}"
                ),
            },
            "stepDetails": {
                "why": (
                    f"Builds enough {gap} knowledge to begin the "
                    "role-specific work sample."
                ),
                "support": evidence_support,
                "skillsDeveloped": course["skills"],
                "gapAddressed": gap,
                "requirement": "optional",
                "effort": f"{course['length']['value']} {course['length']['unit']}",
                "completionEvidence": (
                    f"Relevant course work applied directly to {subject}"
                ),
                "supportingEvidence": source_evidence,
                "sourceBlend": recommendation["sourceBlend"],
            },
        }
        project_node = {
            "id": project_id,
            "type": "experience",
            "label": project_label,
            "eyebrow": "Portfolio project",
            "summary": f"{gap} · {completion_evidence}",
            "stage": "Evidence-building step",
            "workSetting": "Independent or team project",
            "whyItFits": [
                evidence_support,
                (
                    f"It tests {recommendation['canonicalRole']} work before "
                    "requiring the title."
                ),
            ],
            "responsibilities": recommendation["responsibilities"][:3],
            "existingSkills": recommendation["transferableSkills"][:4],
            "transferableSkills": recommendation["transferableSkills"][:4],
            "skillsToBuild": gaps[:3],
            "preview": (
                f"Produce {completion_evidence.lower()}. Tie each decision back "
                f"to the original {seed_category_label} evidence."
            ),
            "challenges": ["Keep the project small enough to finish and review."],
            "sourceRecord": {
                "id": f"generated-{role_id}-project",
                "kind": "generated",
                "label": (
                    f"Generated from {seed_context} "
                    "evidence plus a maintained role gap"
                ),
            },
            "stepDetails": {
                "why": (
                    "Creates applied proof for "
                    f"{recommendation['personalizedTitle']}."
                ),
                "support": evidence_support,
                "skillsDeveloped": gaps[:3],
                "gapAddressed": gap,
                "requirement": "recommended",
                "effort": (
                    "2-4 weeks"
                    if recommendation["matchStage"] != "longer_term_path"
                    else "4-8 weeks"
                ),
                "completionEvidence": completion_evidence,
                "supportingEvidence": source_evidence,
                "sourceBlend": recommendation["sourceBlend"],
            },
        }
        skill_node = {
            "id": skill_id,
            "type": "skill",
            "label": practice["label"],
            "eyebrow": "Skill practice",
            "summary": practice["summary"],
            "stage": "Capability-building step",
            "workSetting": "Practice in current work, volunteering, or a project",
            "whyItFits": [
                f"{gap} is a concrete difference between the enabled evidence and the canonical role.",
                (
                    f"The practice is grounded in your {seed_context}, so the "
                    "exercise stays connected to supplied evidence."
                ),
            ],
            "responsibilities": practice["responsibilities"],
            "existingSkills": recommendation["transferableSkills"][:4],
            "transferableSkills": recommendation["transferableSkills"][:4],
            "skillsToBuild": gaps[:3],
            "preview": practice["preview"],
            "challenges": ["Avoid claiming proficiency without a reviewable example."],
            "sourceRecord": {
                "id": f"gap-{role_id}-{slugify(gaps[0])}",
                "kind": "taxonomy",
                "label": f"Gap analysis using {TAXONOMY_VERSION}",
            },
            "stepDetails": {
                "why": (
                    "Closes the highest-ranked gap before the "
                    "role-specific portfolio project."
                ),
                "support": evidence_support,
                "skillsDeveloped": gaps[:3],
                "gapAddressed": gap,
                "requirement": "recommended",
                "effort": "1-3 weeks",
                "completionEvidence": practice["completionEvidence"],
                "supportingEvidence": source_evidence,
                "sourceBlend": recommendation["sourceBlend"],
            },
        }
        bridge_node = {
            "id": bridge_id,
            "type": (
                "experience"
                if bridge_is_current
                else "entry_role"
                if bridge["level"] <= 2
                else "role"
            ),
            "label": bridge_label,
            "eyebrow": "Adjacent role",
            "summary": f"{gap} · workplace experience",
            "stage": "Experience-first step",
            "workSetting": ", ".join(bridge["workStyles"][:2]),
            "whyItFits": [
                f"{bridge['title']} is adjacent to the destination in the maintained taxonomy.",
                (
                    f"It creates a workplace setting for practicing {gap} and "
                    "destination-adjacent responsibilities."
                ),
            ],
            "responsibilities": bridge["responsibilities"],
            "existingSkills": recommendation["transferableSkills"][:4],
            "transferableSkills": list(
                dict.fromkeys(
                    [
                        skill
                        for skill in bridge["skills"]
                        if skill in recommendation["skills"]
                    ]
                )
            )[:5]
            or bridge["skills"][:4],
            "skillsToBuild": gaps[:3],
            "preview": bridge["description"],
            "challenges": [
                "This role is an option, not a mandatory prerequisite."
            ],
            "sourceRecord": {
                "id": bridge["id"],
                "kind": (
                    "job"
                    if bridge.get("market")
                    else "taxonomy"
                ),
                "label": (
                    "Aggregated PIT job family"
                    if bridge.get("market")
                    else f"PathIn taxonomy {TAXONOMY_VERSION}"
                ),
            },
            **({"market": bridge["market"]} if bridge.get("market") else {}),
            "roleId": bridge["id"],
            "stepDetails": {
                "why": (
                    (
                        "Adds destination-adjacent responsibility evidence "
                        "within the current role before "
                        if bridge_is_current
                        else "Adds adjacent responsibility evidence before "
                    )
                    + f"{recommendation['personalizedTitle']}."
                ),
                "support": evidence_support,
                "skillsDeveloped": bridge["skills"][:4],
                "gapAddressed": gap,
                "requirement": "optional",
                "effort": (
                    "One responsibility expansion in the current role"
                    if bridge_is_current
                    else "One role transition or equivalent responsibility expansion"
                ),
                "completionEvidence": "Documented ownership of adjacent responsibilities",
                "supportingEvidence": source_evidence,
                "sourceBlend": recommendation["sourceBlend"],
            },
        }
        positioning_node = {
            "id": positioning_id,
            "type": "experience",
            "label": f"Position {subject} as {recommendation['specialization']} proof",
            "eyebrow": "Application prep",
            "summary": f"{gap} · portfolio, resume, and interview proof",
            "stage": "Application preparation",
            "workSetting": "Portfolio, resume, and interview narrative",
            "whyItFits": [
                (
                    "The match is already close enough that clearer proof may "
                    "matter more than another generic credential."
                ),
                evidence_support,
            ],
            "responsibilities": [
                "State the problem and your ownership.",
                "Show decisions, evidence, outcome, and limitations.",
            ],
            "existingSkills": recommendation["transferableSkills"][:5],
            "transferableSkills": recommendation["transferableSkills"][:5],
            "skillsToBuild": gaps[:2],
            "preview": (
                f"Create a role-specific story around {subject} and validate "
                "it with one practitioner or hiring-manager conversation."
            ),
            "challenges": [
                "Do not overstate ownership or outcomes that are absent from the supplied evidence."
            ],
            "sourceRecord": {
                "id": f"generated-{role_id}-positioning",
                "kind": "generated",
                "label": f"Generated from {seed_context} evidence",
            },
            "stepDetails": {
                "why": "Makes existing relevant evidence legible for the target role.",
                "support": evidence_support,
                "skillsDeveloped": gaps[:2],
                "gapAddressed": gap,
                "requirement": "recommended",
                "effort": "3-7 days",
                "completionEvidence": (
                    "A concise case narrative, revised resume bullets, and one external review"
                ),
                "supportingEvidence": source_evidence,
                "sourceBlend": recommendation["sourceBlend"],
            },
        }

        proof_path_id = f"path-{role_id}-proof"
        alternative_path_id = f"path-{role_id}-bridge"
        proof_node_ids = ["current"]
        proof_nodes = []
        if recommendation["matchStage"] != "qualified_now":
            proof_node_ids.append(skill_id)
            proof_nodes.append(skill_node)
        proof_node_ids.extend([project_id, destination_id])
        proof_nodes.append(project_node)
        proof_strategy = (
            f"{recommendation['specialization']} proof from "
            f"{seed_category_label} evidence"
        )

        if recommendation["matchStage"] == "qualified_now":
            alternative_node_ids = [
                "current",
                positioning_id,
                destination_id,
            ]
            alternative_nodes = [positioning_node]
            alternative_strategy = (
                f"Direct positioning from {seed_category_label} evidence"
            )
            alternative_description = (
                f"Package '{seed_value}' as credible "
                f"{recommendation['canonicalRole']} evidence and validate it "
                "before targeted applications."
            )
            alternative_effort = "Several days to a few weeks"
        else:
            alternative_node_ids = [
                "current",
                course_id,
                bridge_id,
                destination_id,
            ]
            alternative_nodes = [course_node, bridge_node]
            alternative_strategy = (
                (
                    f"{gap} plus expanded {bridge['title']} responsibilities"
                    if bridge_is_current
                    else f"{gap} plus {bridge['title']} responsibility bridge"
                )
            )
            alternative_description = (
                (
                    f"Build enough {gap} to expand {bridge['title']} "
                    f"responsibilities, then move toward "
                    f"{recommendation['personalizedTitle']}."
                    if bridge_is_current
                    else (
                        f"Build enough {gap} to take on adjacent "
                        f"{bridge['title']} responsibilities, then move toward "
                        f"{recommendation['personalizedTitle']}."
                    )
                )
            )
            alternative_effort = (
                "Several months to one role transition"
                if recommendation["matchStage"] == "longer_term_path"
                else "One responsibility expansion or adjacent move"
            )

        return [
            {
                "path": {
                    "id": proof_path_id,
                    "label": (
                        f"Turn {subject} into proof for "
                        f"{recommendation['personalizedTitle']}"
                    ),
                    "shortLabel": f"{recommendation['specialization']} proof",
                    "destinationId": destination_id,
                    "nodeIds": proof_node_ids,
                    "description": (
                        (
                            f"Use your {seed_context}, '{seed_value}', as the "
                            f"starting point; close {gap} and produce "
                            "role-specific evidence."
                            if seed["category"] == "projects"
                            else (
                                f"Use the transferable evidence in your "
                                f"{seed_context}, '{seed_value}', as context; "
                                f"close {gap} by creating a role-specific work "
                                "sample."
                            )
                        )
                    ),
                    "strategy": proof_strategy,
                    "estimatedEffort": (
                        "2-6 weeks"
                        if recommendation["matchStage"] != "longer_term_path"
                        else "1-3 months"
                    ),
                },
                "nodes": proof_nodes,
            },
            {
                "path": {
                    "id": alternative_path_id,
                    "label": (
                        f"Alternative route to "
                        f"{recommendation['personalizedTitle']}"
                    ),
                    "shortLabel": (
                        "Position existing proof"
                        if recommendation["matchStage"] == "qualified_now"
                        else f"Bridge through {bridge['title']}"
                    ),
                    "destinationId": destination_id,
                    "nodeIds": alternative_node_ids,
                    "description": alternative_description,
                    "strategy": alternative_strategy,
                    "estimatedEffort": alternative_effort,
                },
                "nodes": alternative_nodes,
            },
        ]

    @staticmethod
    def _profile_seed(
        profile: dict[str, Any],
        recommendation: dict[str, Any],
    ) -> dict[str, Any]:
        project_signal = next(
            (
                item
                for item in recommendation.get(
                    "personalizationEvidence", []
                )
                if item.get("category") == "projects"
            ),
            None,
        )
        if project_signal:
            return copy.deepcopy(project_signal)
        if profile["fieldEvidence"].get("projects"):
            item = profile["fieldEvidence"]["projects"][0]
            return {
                "category": "projects",
                "value": item["value"],
                "source": item["source"],
                "confidence": item["confidence"],
                "explicit": item["explicit"],
                "corroboratedBy": (
                    ProfileNormalizer._evidence_sources(item)
                ),
            }
        for category in ("responsibilities", "achievements", "roles"):
            signal = next(
                (
                    item
                    for item in recommendation.get(
                        "personalizationEvidence", []
                    )
                    if item.get("category") == category
                ),
                None,
            )
            if signal:
                return copy.deepcopy(signal)
            items = profile["fieldEvidence"].get(category, [])
            if items:
                item = items[0]
                return {
                    "category": category,
                    "value": item["value"],
                    "source": item["source"],
                    "confidence": item["confidence"],
                    "explicit": item["explicit"],
                    "corroboratedBy": (
                        ProfileNormalizer._evidence_sources(item)
                    ),
                }
        if recommendation.get("personalizationEvidence"):
            return copy.deepcopy(
                recommendation["personalizationEvidence"][0]
            )
        for category in profile["enabledSignals"]:
            items = profile["fieldEvidence"].get(category, [])
            if items:
                item = items[0]
                return {
                    "category": category,
                    "value": item["value"],
                    "source": item["source"],
                    "confidence": item["confidence"],
                    "explicit": item["explicit"],
                    "corroboratedBy": (
                        ProfileNormalizer._evidence_sources(item)
                    ),
                }
        return {
            "category": "profile",
            "value": recommendation["canonicalRole"],
            "source": "profile",
            "confidence": 0.5,
            "explicit": False,
            "corroboratedBy": [],
        }

    @staticmethod
    def _subject_from_evidence(value: str, fallback: str) -> str:
        cleaned = re.sub(r"\s+", " ", value).strip(" .,:;-")
        normalized = cleaned.lower()
        if "customer churn" in normalized and "model" in normalized:
            return "a customer churn prediction model"
        if "chassis" in normalized and (
            "robot" in normalized or "bot" in normalized
        ):
            return "a competitive robot chassis"
        if "combat robot" in normalized:
            return "a combat robot"
        if "robot" in normalized:
            return "a robot prototype"
        cleaned = re.sub(
            (
                r"^(?:assisted\s+(?:in\s+)?(?:building|creating|developing)|"
                r"working\s+on|building|creating|designing|drafting|"
                r"developing|learning|built|created|designed|developed|"
                r"deployed|analyzed|redesigned|implemented|led|managed|"
                r"conducted|produced|improved|coordinated)"
                r"(?:\s+(?:and|&)\s+(?:building|creating|designing|drafting|"
                r"developing|deployed|analyzed|redesigned|implemented|led|"
                r"managed|conducted|produced|improved|coordinated|tested|"
                r"validated))?"
                r"\s+"
            ),
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"^(?:and|&)\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.split(
            r"\s+\|\s+|\s+-\s+|:\s+",
            cleaned,
            maxsplit=1,
        )[0].strip(" .,:;-")
        words = cleaned.split()
        subject = " ".join(words[:8]).strip(" .,:;-")
        if not subject:
            subject = fallback.strip()
        return subject or "an existing work sample"

    @classmethod
    def _route_subject(
        cls,
        seed: dict[str, Any],
        role_id: str,
        target_domain: str | None = None,
    ) -> str:
        fallback = ROLE_ROUTE_SUBJECTS.get(
            role_id,
            "a small role-relevant work sample",
        )
        if seed.get("category") != "projects":
            if (
                target_domain
                and not _terms([target_domain]) & _terms([fallback])
            ):
                return f"{fallback} for {target_domain.lower()}"
            return fallback
        return cls._subject_from_evidence(str(seed.get("value", "")), fallback)

    @staticmethod
    def _practice_blueprint(
        *,
        role_id: str,
        gap: str,
        subject: str,
    ) -> dict[str, Any]:
        label = f"Apply {gap} to {subject}"
        if len(label) > 78:
            label = f"Build {gap} proof"

        if role_id in {
            "robotics-engineer",
            "embedded-systems-engineer",
            "mechanical-design-engineer",
            "manufacturing-engineer",
            "hardware-test-engineer",
        }:
            responsibilities = [
                (
                    f"Define one measurable {gap} requirement for "
                    f"{subject}, including constraints and pass/fail criteria."
                ),
                (
                    "Produce the relevant CAD, firmware, fabrication, wiring, "
                    "or test artifact and record each design decision."
                ),
                (
                    "Run a repeatable test, capture failures and revisions, "
                    "then request review from a club lead, instructor, or engineer."
                ),
            ]
            completion = (
                f"A reviewable {gap} artifact for {subject}, test results, "
                "revision notes, and one named reviewer’s feedback"
            )
        elif role_id in {"data-scientist", "data-analyst"}:
            responsibilities = [
                f"Frame one decision question about {subject} that requires {gap}.",
                (
                    "Create a reproducible analysis with documented inputs, "
                    "assumptions, validation, and error checks."
                ),
                (
                    "Present the result as a notebook, dashboard, or readout "
                    "and obtain feedback from one intended user."
                ),
            ]
            completion = (
                f"A reproducible {gap} analysis of {subject}, validation notes, "
                "a decision-focused readout, and reviewer feedback"
            )
        elif role_id in {
            "product-manager",
            "product-operations-specialist",
            "business-analyst",
            "operations-analyst",
            "project-coordinator",
        }:
            responsibilities = [
                (
                    f"Use {subject} to define one real stakeholder problem "
                    f"that requires {gap}."
                ),
                (
                    "Document the current workflow, measurable outcome, "
                    "constraints, and the smallest testable improvement."
                ),
                (
                    "Run the test with at least one stakeholder and record "
                    "the decision, result, and next revision."
                ),
            ]
            completion = (
                f"A {gap} brief for {subject}, measurable success criteria, "
                "test evidence, and stakeholder feedback"
            )
        else:
            responsibilities = [
                (
                    f"Define one concrete use of {gap} within {subject}, "
                    "including a measurable acceptance criterion."
                ),
                (
                    "Produce a reviewable artifact that shows the work, "
                    "decisions, and result rather than only claiming the skill."
                ),
                (
                    "Ask one informed reviewer for feedback and document "
                    "the revision made in response."
                ),
            ]
            completion = (
                f"A reviewable {gap} artifact tied to {subject}, acceptance "
                "criteria, outcome evidence, and reviewer feedback"
            )

        return {
            "label": label,
            "summary": f"{gap} proof tied to {subject} · 1-3 weeks",
            "responsibilities": responsibilities,
            "preview": (
                f"Demonstrate {gap} through a specific deliverable connected "
                f"to {subject}, with testing and external feedback."
            ),
            "completionEvidence": completion,
        }

    def _select_course(
        self,
        gaps: list[str],
        destination_skills: list[str],
        *,
        role_id: str,
        avoided_labels: set[str],
    ) -> dict[str, Any]:
        courses = [
            course
            for course in self.catalog.get("courses", [])
            if not any(
                label in str(course.get("name", "")).lower()
                or str(course.get("name", "")).lower() in label
                for label in avoided_labels
            )
        ]
        ranked: list[tuple[float, dict[str, Any]]] = []
        for course in courses:
            course_values = [
                str(course.get("name", "")),
                str(course.get("category", "")),
                *[
                    str(skill)
                    for skill in course.get("skills", [])
                ],
            ]
            course_text = " ".join(course_values)
            primary_gap = gaps[0]
            if not contains_alias(course_text, primary_gap):
                continue
            destination_matches = [
                skill
                for skill in destination_skills
                if contains_alias(course_text, skill)
            ]
            if len(destination_matches) < 2:
                continue
            ranked.append(
                (
                    float(len(destination_matches)),
                    course,
                )
            )
        if ranked:
            ranked.sort(
                key=lambda item: (
                    -item[0],
                    str(item[1].get("name", "")),
                )
            )
            selected = copy.deepcopy(ranked[0][1])
            selected["catalogSource"] = "pit"
            return selected
        return {
            "id": f"taxonomy-learning-{role_id}-{slugify(gaps[0])}",
            "name": f"Guided {gaps[0]} learning plan",
            "category": "Role preparation",
            "skills": gaps[:3],
            "length": {"value": "2-6", "unit": "hours"},
            "level": "Self-directed",
            "catalogSource": "taxonomy",
        }

    def _select_bridge_role(
        self,
        profile: dict[str, Any],
        destination_role_id: str,
        *,
        avoided_labels: set[str],
    ) -> dict[str, Any]:
        destination = ROLE_BY_ID[destination_role_id]
        candidate_ids = destination["adjacentRoleIds"]
        candidates = [
            candidate
            for candidate in self.candidates
            if candidate["id"] in candidate_ids
            and candidate["id"] != destination_role_id
            and candidate["level"] <= destination["level"]
            and not any(
                label in candidate["title"].lower()
                or candidate["title"].lower() in label
                for label in avoided_labels
            )
        ]
        if not candidates:
            candidates = [
                candidate
                for candidate in self.candidates
                if candidate["family"] != destination["family"]
                and candidate["level"] <= destination["level"]
                and not any(
                    label in candidate["title"].lower()
                    or candidate["title"].lower() in label
                    for label in avoided_labels
                )
            ]
        if not candidates:
            candidates = [
                candidate
                for candidate in self.candidates
                if candidate["id"] != destination_role_id
            ]
        candidates.sort(
            key=lambda candidate: (
                -self._retrieval_score(profile, candidate),
                candidate["level"],
                candidate["title"],
            )
        )
        return copy.deepcopy(candidates[0])

    def _edge(
        self,
        source_id: str,
        target_id: str,
        nodes: dict[str, dict[str, Any]],
        profile: dict[str, Any],
    ) -> dict[str, Any]:
        source_node = nodes[source_id]
        target_node = nodes[target_id]
        source_role_ids = (
            profile["currentRoleIds"]
            if source_id == "current"
            else [source_node.get("roleId")]
        )
        target_role_id = target_node.get("roleId")
        counts = self.catalog.get("transitionCounts", {})
        observed_count = 0
        if target_role_id:
            observed_count = max(
                [
                    int(counts.get(f"{role_id}::{target_role_id}", 0))
                    for role_id in source_role_ids
                    if role_id
                ]
                or [0]
            )

        edge = {
            "id": f"edge-{source_id}-{target_id}",
            "source": source_id,
            "target": target_id,
            "type": "recommended_transition",
            "evidenceLevel": "inferred",
            "explanation": (
                "This connection is generated from profile overlap, explicit "
                "gaps, and the maintained occupational taxonomy."
            ),
            "evidenceLabel": f"Taxonomy inference · {TAXONOMY_VERSION}",
            "privacyStatus": "not_applicable",
            "cohortSizeBucket": "not_applicable",
        }
        if observed_count >= PRIVACY_THRESHOLD:
            edge.update(
                {
                    "type": "observed_transition",
                    "evidenceLevel": "moderate",
                    "observedCount": observed_count,
                    "explanation": (
                        "This sequence appears in aggregated synthetic PIT "
                        "histories above the 20-profile privacy threshold."
                    ),
                    "evidenceLabel": "Privacy-safe aggregate PIT transition",
                    "privacyStatus": "approved",
                    "cohortSizeBucket": "20_plus",
                }
            )
        elif observed_count > 0:
            edge.update(
                {
                    "privacyStatus": "suppressed",
                    "cohortSizeBucket": "below_20",
                    "explanation": (
                        "A related synthetic PIT transition exists, but its "
                        "count is below 20 and is suppressed. The connection "
                        "is shown as a taxonomy inference."
                    ),
                    "evidenceLabel": "Sparse PIT history suppressed · taxonomy inference",
                }
            )
        elif target_node["type"] in {"course", "skill", "experience"}:
            edge.update(
                {
                    "type": "skill_bridge",
                    "evidenceLevel": "moderate",
                    "evidenceLabel": (
                        "Profile gap + PIT course"
                        if target_node["type"] == "course"
                        else "Profile gap + maintained taxonomy"
                    ),
                }
            )
        return edge

    @staticmethod
    def _frontend_profile(profile: dict[str, Any]) -> dict[str, Any]:
        headline = (
            profile.get("headline")
            or (profile["roles"][0] if profile["roles"] else "")
            or "Resume-based career explorer"
        )
        return {
            "name": profile.get("name") or "PathIn user",
            "headline": headline,
            "location": (
                profile["locationPreferences"][0]
                if profile["locationPreferences"]
                else ""
            ),
            "education": profile["education"],
            "roles": profile["roles"],
            "responsibilities": profile["responsibilities"],
            "experience": profile["roles"],
            "skills": profile["skills"],
            "interests": profile["interests"],
            "goals": profile["goals"],
        }
