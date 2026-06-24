from __future__ import annotations

from typing import Any

NODE_FIXTURES: dict[str, dict[str, Any]] = {
    "course-ml": {
        "type": "education_milestone",
        "label": "Machine Learning Fundamentals",
        "summary": "Build a bridge from quantitative coursework to applied data work.",
        "existingSkills": ["Programming", "Quantitative reasoning"],
        "transferableSkills": ["Python", "Data analysis"],
        "skillGaps": ["Model evaluation", "Data storytelling"],
    },
    "skill-data-analysis": {
        "type": "skill",
        "label": "Applied data analysis",
        "summary": (
            "Turn Python and quantitative reasoning into repeatable analysis, "
            "evaluation, and communication."
        ),
        "existingSkills": ["Programming", "Quantitative reasoning"],
        "transferableSkills": ["Structured analysis", "Evidence communication"],
        "skillGaps": ["Data cleaning", "Model evaluation", "Data storytelling"],
    },
    "data-project": {
        "type": "experience",
        "label": "Applied data project",
        "summary": "Frame a question, analyze a public dataset, and explain the result.",
        "existingSkills": ["Programming", "Mathematics"],
        "transferableSkills": ["Research framing", "Evidence communication"],
        "skillGaps": ["Data cleaning", "Model evaluation"],
    },
    "data-entry": {
        "type": "entry_role",
        "label": "Entry-level Data Scientist",
        "summary": "Contribute analysis and modeling with guidance from senior teammates.",
        "existingSkills": ["Python", "Quantitative reasoning"],
        "transferableSkills": ["Structured analysis", "Technical communication"],
        "skillGaps": ["Production data workflows", "Experiment design"],
    },
    "data-senior": {
        "type": "destination_role",
        "roleId": "data-scientist",
        "label": "Senior Data Scientist",
        "summary": "Lead analytical projects and communicate evidence responsibly.",
        "existingSkills": ["Technical foundation", "Quantitative reasoning"],
        "transferableSkills": ["Problem framing", "Communication"],
        "skillGaps": ["Technical leadership", "Advanced model evaluation"],
    },
    "course-cloud": {
        "type": "education_milestone",
        "label": "Cloud Computing with AWS",
        "summary": "Add cloud and delivery vocabulary to a software foundation.",
        "existingSkills": ["Programming", "Debugging"],
        "transferableSkills": ["AWS", "Automation"],
        "skillGaps": ["Infrastructure as code", "Reliability"],
    },
    "software-entry": {
        "type": "entry_role",
        "roleId": "software-engineer",
        "label": "Entry-level Software Engineer",
        "summary": "Build, test, and maintain software with a product team.",
        "existingSkills": ["Programming", "Problem solving"],
        "transferableSkills": ["Debugging", "Systems thinking"],
        "skillGaps": ["Production ownership", "Architecture"],
    },
    "devops-mid": {
        "type": "intermediate_role",
        "roleId": "devops-engineer",
        "label": "Mid-level DevOps Engineer",
        "summary": "Improve automation, reliability, and delivery systems.",
        "existingSkills": ["Software fundamentals", "Cloud concepts"],
        "transferableSkills": ["Automation", "Operational analysis"],
        "skillGaps": ["Data modeling", "Statistical evaluation"],
    },
    "course-product": {
        "type": "education_milestone",
        "label": "Project Management Basics",
        "summary": "Learn the planning language used by cross-functional teams.",
        "existingSkills": ["Technical communication", "Organization"],
        "transferableSkills": ["Agile", "Project planning"],
        "skillGaps": ["User discovery", "Prioritization"],
    },
    "skill-product-discovery": {
        "type": "skill",
        "label": "Product discovery",
        "summary": (
            "Identify a user problem, test assumptions, and make explicit "
            "priority tradeoffs."
        ),
        "existingSkills": ["Technical problem solving", "Communication"],
        "transferableSkills": ["Interviewing", "Decision making"],
        "skillGaps": ["User research", "Prioritization", "Outcome framing"],
    },
    "product-project": {
        "type": "experience",
        "label": "Product discovery sprint",
        "summary": "Interview users, prioritize a need, and ship a focused prototype.",
        "existingSkills": ["Technical execution", "Problem solving"],
        "transferableSkills": ["Decision making", "Communication"],
        "skillGaps": ["User research", "Roadmapping"],
    },
    "product-entry": {
        "type": "entry_role",
        "label": "Associate Product Manager",
        "summary": "Support discovery, prioritization, and delivery for a product area.",
        "existingSkills": ["Technical fluency", "Communication"],
        "transferableSkills": ["Cross-functional coordination", "Analysis"],
        "skillGaps": ["Product strategy", "Outcome measurement"],
    },
    "product-mid": {
        "type": "destination_role",
        "roleId": "product-manager",
        "label": "Product Manager",
        "summary": "Guide a team from user problem through measurable product outcome.",
        "existingSkills": ["Technical context", "Structured problem solving"],
        "transferableSkills": ["Communication", "Prioritization"],
        "skillGaps": ["Product strategy", "Stakeholder leadership"],
    },
    "feature-lead": {
        "type": "experience",
        "label": "Lead a cross-functional feature",
        "summary": "Own a small feature from user context through release and learning.",
        "existingSkills": ["Software delivery", "Technical communication"],
        "transferableSkills": ["Ownership", "Tradeoff decisions"],
        "skillGaps": ["User discovery", "Roadmapping"],
    },
    "course-ux": {
        "type": "education_milestone",
        "label": "UX/UI Design",
        "summary": "Add user-centered design methods to a technical foundation.",
        "existingSkills": ["Problem decomposition", "Technical context"],
        "transferableSkills": ["UX/UI", "Visual communication"],
        "skillGaps": ["Research synthesis", "Interaction design"],
    },
    "skill-user-research": {
        "type": "skill",
        "label": "User research",
        "summary": (
            "Ask useful questions, synthesize patterns, and connect evidence "
            "to design decisions."
        ),
        "existingSkills": ["Analytical thinking", "Communication"],
        "transferableSkills": ["Interviewing", "Synthesis"],
        "skillGaps": [
            "Research planning",
            "Usability testing",
            "Insight communication",
        ],
    },
    "ux-project": {
        "type": "experience",
        "label": "UX case study",
        "summary": "Research a user problem and document design decisions in a case study.",
        "existingSkills": ["Problem solving", "Communication"],
        "transferableSkills": ["Interviewing", "Prototyping"],
        "skillGaps": ["Usability testing", "Portfolio storytelling"],
    },
    "ux-entry": {
        "type": "entry_role",
        "label": "Entry-level UX Designer",
        "summary": "Support research, flows, prototypes, and implementation quality.",
        "existingSkills": ["Technical context", "Visual communication"],
        "transferableSkills": ["Facilitation", "Systems thinking"],
        "skillGaps": ["Design systems", "Research planning"],
    },
    "ux-mid": {
        "type": "destination_role",
        "roleId": "ux-designer",
        "label": "Product Designer",
        "summary": "Own user-centered design for a product area.",
        "existingSkills": ["Technical context", "Problem decomposition"],
        "transferableSkills": ["Systems thinking", "Facilitation"],
        "skillGaps": ["Design strategy", "Research leadership"],
    },
}


PATH_FIXTURES: dict[str, dict[str, Any]] = {
    "data-project": {
        "destinationId": "data-senior",
        "label": "Project-first data route",
        "strategy": "Lower-barrier evidence building",
        "nodeIds": [
            "current",
            "course-ml",
            "skill-data-analysis",
            "data-project",
            "data-entry",
            "data-senior",
        ],
    },
    "data-engineering": {
        "destinationId": "data-senior",
        "label": "Engineering-to-data route",
        "strategy": "Transferable technical skills",
        "nodeIds": [
            "current",
            "course-cloud",
            "software-entry",
            "devops-mid",
            "data-senior",
        ],
    },
    "product-project": {
        "destinationId": "product-mid",
        "label": "Discovery-first product route",
        "strategy": "Project-first transition",
        "nodeIds": [
            "current",
            "course-product",
            "skill-product-discovery",
            "product-project",
            "product-entry",
            "product-mid",
        ],
    },
    "product-technical": {
        "destinationId": "product-mid",
        "label": "Technical product route",
        "strategy": "Transferable technical skills",
        "nodeIds": [
            "current",
            "software-entry",
            "feature-lead",
            "product-entry",
            "product-mid",
        ],
    },
    "ux-portfolio": {
        "destinationId": "ux-mid",
        "label": "Portfolio-first design route",
        "strategy": "Portfolio evidence",
        "nodeIds": [
            "current",
            "course-ux",
            "skill-user-research",
            "ux-project",
            "ux-entry",
            "ux-mid",
        ],
    },
    "ux-technical": {
        "destinationId": "ux-mid",
        "label": "Engineering-to-design route",
        "strategy": "Adjacent-role transition",
        "nodeIds": [
            "current",
            "software-entry",
            "course-ux",
            "skill-user-research",
            "ux-entry",
            "ux-mid",
        ],
    },
}


TRANSITION_KEYS = {
    ("software-entry", "devops-mid"): (
        "Software Engineer (Entry) -> DevOps Engineer (Mid)"
    ),
    ("devops-mid", "data-senior"): (
        "DevOps Engineer (Mid) -> Data Scientist (Senior)"
    ),
    ("data-entry", "data-senior"): (
        "Data Scientist (Entry) -> Data Scientist (Mid)"
    ),
    ("product-entry", "product-mid"): (
        "Product Manager (Entry) -> Product Manager (Mid)"
    ),
    ("ux-entry", "ux-mid"): "UX Designer (Entry) -> UX Designer (Mid)",
}

