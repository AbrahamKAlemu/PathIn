"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { RegenerationAction } from "./pathin-api";
import {
  compactMapText,
  formatMapText,
  isUnreadableMapText,
  safeMapText,
} from "./display-text";
import type {
  CareerEdge,
  CareerMapData,
  CareerMode,
  CareerNode,
  CareerPath,
  DetailSection,
  DreamCareer,
} from "./types";
import styles from "./career-tree.module.css";

type Direction = "previous" | "next";
type HorizontalDirection = "left" | "right";
type DetailMotion = Direction | "select";
type CareerView = "focus" | "web";
type FocusTransition = {
  direction: Direction | HorizontalDirection;
  phase: "exit" | "enter";
};

type WebPlacement = {
  key: string;
  nodeId: string;
  pathId?: string;
  x: number;
  y: number;
};

type WebConnection = {
  key: string;
  source: WebPlacement;
  target: WebPlacement;
};

type WebLayout = {
  width: number;
  height: number;
  current: WebPlacement;
  placements: WebPlacement[];
  connections: WebConnection[];
  pathLabels: Array<{
    destinationId: string;
    id: string;
    label: string;
    routeNumber: number;
    shortLabel: string;
    x: number;
    y: number;
  }>;
};

type CareerGoalOption = {
  destination: CareerNode;
  path: CareerPath;
};

type HorizontalRouteOption = {
  destination: CareerNode;
  node: CareerNode;
  path: CareerPath;
};

type SaveMapResult = {
  savedAt: string;
  storage: "backend_and_browser" | "browser";
};

type ReopenMapResult = {
  source: "backend" | "browser";
};

type CareerMapViewProps = {
  initialMap: CareerMapData;
  generationError?: string;
  onBuildToward: (destinationId: string) => Promise<void>;
  onRegenerate: (
    action: RegenerationAction,
    options?: {
      targetId?: string;
      pinnedNodeIds?: string[];
      dismissedNodeIds?: string[];
    },
  ) => Promise<void>;
  onReopenSaved: () => Promise<ReopenMapResult>;
  onSave: (
    pinnedNodeIds: string[],
    dismissedNodeIds: string[],
  ) => Promise<SaveMapResult>;
  onStartOver: () => void;
  onSubmitFeedback: (
    target: FeedbackTarget,
    category: string,
  ) => Promise<void>;
};

type SavedCareerState = {
  mapId: string;
  dataVersion: string;
  modelVersion: string;
  promptVersion: string;
  mode: CareerMode;
  viewMode?: CareerView;
  destinationId: string;
  focusedPathId?: string;
  selectedNodeId: string;
  detailSection: DetailSection;
  detailsOpen: boolean;
  explorePathIds: string[];
  pinnedNodeIds: string[];
  dismissedNodeIds: string[];
  webZoom?: number;
  savedAt: string;
  storage: SaveMapResult["storage"];
};

type FeedbackTarget = {
  id: string;
  label: string;
  type: "node" | "edge";
};

const SAVED_STATE_KEY = "pathin-career-tree-state";
const WEB_NODE_SIZE = 104;
const WEB_COLUMN_GAP = 248;
const WEB_FUTURE_ROW_GAP = 210;
const WEB_HISTORY_ROW_GAP = 142;
const WEB_X_PADDING = 150;
const WEB_Y_PADDING = 110;
const WEB_ROUTE_LABEL_OFFSET = 105;
const FOCUS_EXIT_DURATION_MS = 160;
const FOCUS_ENTER_DURATION_MS = 460;
const REDUCED_FOCUS_EXIT_DURATION_MS = 70;
const REDUCED_FOCUS_ENTER_DURATION_MS = 130;

const detailSections: Array<{ id: DetailSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "connections", label: "Path" },
];

const PROFILE_NODE_IDS = [
  "profile-interests",
  "profile-skills",
  "profile-education",
  "profile-prior-experience",
  "profile-current-experience",
] as const;

const PROFILE_NODE_ID_SET = new Set<string>(PROFILE_NODE_IDS);

function uniqueDisplayValues(values: string[]) {
  return values.reduce<string[]>((result, value) => {
    const formatted = safeMapText(value, "");
    if (formatted && !result.includes(formatted)) {
      result.push(formatted);
    }
    return result;
  }, []);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function mapEvidenceSourceLabel(initialMap: CareerMapData) {
  const sources = new Set([
    ...(initialMap.profileFingerprint?.sourcesPresent ?? []),
    ...Object.values(initialMap.exactSignalsUsed ?? {})
      .flat()
      .map((field) => field.source),
  ]);
  const hasResume = sources.has("resume");
  const hasLinkedin = sources.has("linkedin");

  if (hasResume && hasLinkedin) {
    return "your resume and LinkedIn evidence";
  }
  if (hasResume) {
    return "your resume evidence";
  }
  if (hasLinkedin) {
    return "your LinkedIn profile evidence";
  }
  return "your enabled profile evidence";
}

function profileRoleValues(initialMap: CareerMapData) {
  const roleSources = [
    initialMap.profile.roles ?? [],
    initialMap.profileSnapshot?.roles ?? [],
    initialMap.exactSignalsUsed?.roles?.map((field) => field.value) ?? [],
  ];

  for (const source of roleSources) {
    const roles = uniqueDisplayValues(source);
    if (roles.length > 0) {
      return roles;
    }
  }

  return uniqueDisplayValues(initialMap.profile.experience).filter((value) => {
    const wordCount = value.split(/\s+/).length;
    return value.length <= 96 && wordCount <= 12 && !/[.!?]$/.test(value);
  });
}

function conciseExperienceLabel(value: string) {
  const formatted = safeMapText(value, "Imported experience");
  const parts = formatted.split(/\s+·\s+/);
  const trailingPart = parts.at(-1) ?? "";
  const hasTrailingDate =
    /\b(?:19|20)\d{2}\b|\bpresent\b/i.test(trailingPart);
  const titleParts = hasTrailingDate ? parts.slice(0, -1) : parts;
  return compactMapText(
    titleParts.join(" · ") || formatted,
    72,
    "Imported experience",
  );
}

function createProfileNodes(initialMap: CareerMapData): CareerNode[] {
  const educationValues = uniqueDisplayValues(initialMap.profile.education);
  const roleValues = profileRoleValues(initialMap);
  const skillValues = uniqueDisplayValues(initialMap.profile.skills);
  const interestValues = uniqueDisplayValues(initialMap.profile.interests);
  const goalValues = uniqueDisplayValues(initialMap.profile.goals ?? []);
  const education =
    educationValues.join(", ") || "No education information supplied";
  const currentExperience =
    roleValues[0] || "No current experience supplied";
  const priorExperience =
    roleValues[1] || "No earlier experience supplied";
  const skills =
    skillValues.join(", ") || "No confirmed skills supplied";
  const interests =
    interestValues.join(", ") || "No career interests supplied";
  const goals =
    goalValues.join(", ") || "Explore evidence-supported options";

  return [
    {
      id: "profile-interests",
      type: "skill",
      label:
        interestValues.slice(0, 2).join(" + ") ||
        "Career interests",
      eyebrow: "Direction signal",
      summary: `${interests}. Current goals: ${goals}.`,
      stage: "Career interests",
      workSetting: "Enabled profile interests and goals",
      whyItFits: [
        "These interests and goals influenced destination retrieval only when their categories were enabled.",
      ],
      responsibilities: [
        "Use these interests to rank routes without treating them as fixed commitments.",
        "Return to profile inputs to revise or disable them.",
      ],
      existingSkills: skillValues,
      transferableSkills: interestValues.slice(0, 4),
      skillsToBuild: ["Goal definition", "Role comparison"],
      preview:
        "This node records stated direction signals, not a prediction about the career the user must pursue.",
      challenges: [
        "Broad interests can produce too many reasonable options without a short-term experiment.",
      ],
      sourceRecord: {
        id: "profile-interests",
        kind: "profile",
        label: "Confirmed PathIn interests",
      },
    },
    {
      id: "profile-skills",
      type: "skill",
      label: "Current skills",
      eyebrow: "Transferable strengths",
      summary: skills,
      stage: "Current skill signals",
      workSetting: "Enabled profile evidence",
      whyItFits: [
        "These enabled skills were compared with each role family's maintained skill signals.",
      ],
      responsibilities: [
        "Confirm which skills are backed by projects or work samples.",
        "Identify which strengths can reduce the cost of testing an adjacent path.",
      ],
      existingSkills: skillValues,
      transferableSkills: skillValues.slice(0, 5),
      skillsToBuild: ["Evidence through projects", "Role-specific vocabulary"],
      preview:
        "These signals may transfer across role families when supported by responsibilities or projects.",
      challenges: [
        "Self-reported skills become more credible when connected to specific outcomes and artifacts.",
      ],
      sourceRecord: {
        id: "profile-skills",
        kind: "profile",
        label: "Enabled profile skill evidence",
      },
    },
    {
      id: "profile-education",
      type: "course",
      label: educationValues[0] || "Education",
      eyebrow: "Education",
      summary: education,
      stage: "Education evidence",
      workSetting: educationValues[0] || "Not supplied",
      whyItFits: [
        "Education contributes only when it overlaps a destination's maintained education signals.",
      ],
      responsibilities: [
        "Connect relevant coursework to concrete projects and role requirements.",
        "Keep education separate from claims of professional qualification.",
      ],
      existingSkills: skillValues.slice(0, 4),
      transferableSkills: educationValues.slice(0, 3),
      skillsToBuild: ["Applied evidence", "Domain context"],
      preview: education,
      challenges: [
        "A degree provides a foundation but does not by itself demonstrate role-specific work.",
      ],
      sourceRecord: {
        id: "profile-education",
        kind: "profile",
        label: "Enabled education evidence",
      },
    },
    {
      id: "profile-prior-experience",
      type: "experience",
      label: conciseExperienceLabel(priorExperience),
      eyebrow: "Prior experience",
      summary:
        `${priorExperience}. PathIn keeps this entry factual and does not infer unsupported responsibilities or seniority.`,
      stage: "Earlier professional signal",
      workSetting: priorExperience,
      whyItFits: [
        "Earlier experience can contribute transferable responsibilities when the profile states them.",
      ],
      responsibilities: [
        "Document the actual role and responsibilities.",
        "Connect specific outcomes to transferable skills.",
      ],
      existingSkills: skillValues,
      transferableSkills: skillValues.slice(0, 4),
      skillsToBuild: ["Specific accomplishment evidence"],
      preview:
        "PathIn keeps this node factual until the user supplies more detail.",
      challenges: [
        "The current profile does not include enough detail to infer a title or achievement safely.",
      ],
      sourceRecord: {
        id: "profile-prior-experience",
        kind: "profile",
        label: "Enabled profile experience",
      },
    },
    {
      id: "profile-current-experience",
      type: "experience",
      label: conciseExperienceLabel(currentExperience),
      eyebrow: "Current experience",
      summary:
        `${currentExperience}. This is the nearest supplied experience beneath the combined current standing.`,
      stage: "Current professional signal",
      workSetting: currentExperience,
      whyItFits: [
        "Current responsibilities influence experience-adjacency scoring only when explicitly supplied.",
      ],
      responsibilities: [
        "Add the actual role, scope, dates, and measurable outcomes.",
        "Identify projects that could support data, product, design, or engineering routes.",
      ],
      existingSkills: skillValues,
      transferableSkills: skillValues.slice(0, 5),
      skillsToBuild: ["Outcome documentation", "Role-specific evidence"],
      preview:
        "This node connects the user's nearest supplied experience to the generated routes above.",
      challenges: [
        "The imported profile entry does not provide enough detail to infer responsibilities or seniority.",
      ],
      sourceRecord: {
        id: "profile-current-experience",
        kind: "profile",
        label: "Enabled profile experience",
      },
    },
  ];
}

function sanitizeTextList(values: string[], maxLength = 180) {
  return values.reduce<string[]>((result, value) => {
    const formatted = formatMapText(value);
    if (!formatted || isUnreadableMapText(formatted)) {
      return result;
    }
    const compacted = compactMapText(formatted, maxLength, "");
    if (compacted && !result.includes(compacted)) {
      result.push(compacted);
    }
    return result;
  }, []);
}

function nodeLabelFallback(node: CareerNode) {
  switch (node.type) {
    case "current":
      return "Your current standing";
    case "destination":
      return "Career destination";
    case "course":
      return "Learning step";
    case "skill":
      return "Skill-building step";
    case "experience":
      return "Imported experience";
    case "entry_role":
    case "role":
      return "Career step";
  }
}

function sanitizeCareerNode(node: CareerNode): CareerNode {
  const label = compactMapText(node.label, 120, nodeLabelFallback(node));
  const summaryFallback =
    "Open details to review the enabled evidence for this step.";
  const stepDetails = node.stepDetails
    ? {
        ...node.stepDetails,
        why: compactMapText(node.stepDetails.why, 220, summaryFallback),
        support: compactMapText(
          node.stepDetails.support,
          220,
          "No additional supporting detail was supplied.",
        ),
        skillsDeveloped: sanitizeTextList(
          node.stepDetails.skillsDeveloped,
          80,
        ),
        gapAddressed: compactMapText(
          node.stepDetails.gapAddressed,
          100,
          "Role-specific evidence",
        ),
        effort: compactMapText(
          node.stepDetails.effort,
          80,
          "Effort not estimated",
        ),
        completionEvidence: compactMapText(
          node.stepDetails.completionEvidence,
          180,
          "A reviewable work sample or verified outcome",
        ),
        sourceBlend: node.stepDetails.sourceBlend
          ? compactMapText(
              node.stepDetails.sourceBlend,
              100,
              "Enabled profile evidence",
            )
          : undefined,
        supportingEvidence: node.stepDetails.supportingEvidence
          ?.map((evidence) => ({
            ...evidence,
            value: compactMapText(
              evidence.value,
              100,
              "Imported profile evidence",
            ),
          }))
          .filter(
            (evidence) =>
              evidence.value !== "Imported profile evidence",
          ),
      }
    : undefined;

  return {
    ...node,
    label,
    eyebrow: compactMapText(node.eyebrow, 48, "Profile evidence"),
    summary: compactMapText(node.summary, 260, summaryFallback),
    stage: compactMapText(node.stage, 80, "Career step"),
    workSetting: compactMapText(
      node.workSetting,
      120,
      "Details not supplied",
    ),
    whyItFits: sanitizeTextList(node.whyItFits),
    responsibilities: sanitizeTextList(node.responsibilities),
    existingSkills: sanitizeTextList(node.existingSkills, 80),
    transferableSkills: sanitizeTextList(node.transferableSkills, 80),
    skillsToBuild: sanitizeTextList(node.skillsToBuild, 80),
    preview: compactMapText(node.preview, 220, summaryFallback),
    challenges: sanitizeTextList(node.challenges),
    sourceRecord: node.sourceRecord
      ? {
          ...node.sourceRecord,
          label: compactMapText(
            node.sourceRecord.label,
            100,
            "PathIn evidence",
          ),
        }
      : undefined,
    stepDetails,
  };
}

function sanitizeCareerPath(path: CareerPath): CareerPath {
  return {
    ...path,
    label: compactMapText(path.label, 96, "Career route"),
    shortLabel: compactMapText(path.shortLabel, 48, "Career route"),
    description: compactMapText(
      path.description,
      180,
      "A route based on enabled profile evidence.",
    ),
    strategy: compactMapText(
      path.strategy,
      100,
      "Evidence-led route",
    ),
    estimatedEffort: path.estimatedEffort
      ? compactMapText(path.estimatedEffort, 72, "Effort not estimated")
      : undefined,
  };
}

function conciseSignal(value: string) {
  const normalized = safeMapText(value, "Not provided");
  if (!normalized) {
    return "Not provided";
  }
  return normalized.length > 38 ? `${normalized.slice(0, 35)}...` : normalized;
}

function MiniIcon({
  name,
  className = "",
}: {
  name:
    | "arrow-down"
    | "arrow-left"
    | "arrow-right"
    | "arrow-up"
    | "bookmark"
    | "branch"
    | "briefcase"
    | "check"
    | "chevron-down"
    | "close"
    | "course"
    | "current"
    | "destination"
    | "expand"
    | "eye"
    | "history"
    | "info"
    | "list"
    | "map"
    | "minus"
    | "pin"
    | "plus"
    | "refresh"
    | "sparkles";
  className?: string;
}) {
  const common = {
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "arrow-down":
      return (
        <svg {...common}>
          <path d="m6 10 6 6 6-6" />
          <path d="M12 4v12" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
          <path d="M9 12h10" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
          <path d="M5 12h10" />
        </svg>
      );
    case "arrow-up":
      return (
        <svg {...common}>
          <path d="m6 14 6-6 6 6" />
          <path d="M12 20V8" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.7 6.5 21V4.5Z" />
        </svg>
      );
    case "branch":
      return (
        <svg {...common}>
          <circle cx="6" cy="5" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 5h2a4 4 0 0 1 4 4v5a4 4 0 0 0 4 4" />
          <path d="M8 5h4a6 6 0 0 1 6 1" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "course":
      return (
        <svg {...common}>
          <path d="m3 7 9-4 9 4-9 4-9-4Z" />
          <path d="M6 9.5V15c2.8 2.7 9.2 2.7 12 0V9.5M21 7v6" />
        </svg>
      );
    case "current":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    case "destination":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2V0M22 12h2M12 22v2M2 12H0" />
        </svg>
      );
    case "expand":
      return (
        <svg {...common}>
          <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5M12 7v5l3 2" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7.2h.01" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" />
          <circle cx="4.5" cy="12" r="1" />
          <circle cx="4.5" cy="18" r="1" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z" />
          <path d="M9 3v16M15 5v16" />
        </svg>
      );
    case "minus":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="m9 3 6 6M8 8l8-4-4 8 4 4-5 1-4 4v-7l-3-3 4-3Z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M18.5 9A7 7 0 0 0 6 6l-2 2M5.5 15A7 7 0 0 0 18 18l2-2" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2Z" />
          <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 13l.7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13Z" />
        </svg>
      );
  }
}

function PathInLogo() {
  return (
    <Image
      alt="PathIn"
      className={styles.pathinLogo}
      height={48}
      src="/pathin-logo.png"
      width={48}
    />
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || isNaN(value)) {
    return "Not available";
  }

  return `$${Math.round(value / 1000)}K`;
}

function nodeIcon(node: CareerNode) {
  if (node.type === "current") {
    return "current";
  }
  if (node.type === "course") {
    return "course";
  }
  if (node.type === "skill") {
    return "sparkles";
  }
  if (node.type === "destination") {
    return "destination";
  }
  return "briefcase";
}

function edgeKey(source: string, target: string) {
  return `${source}::${target}`;
}

function readSavedCareerState(): SavedCareerState | null {
  const serialized = window.localStorage.getItem(SAVED_STATE_KEY);
  if (!serialized) {
    return null;
  }
  try {
    return JSON.parse(serialized) as SavedCareerState;
  } catch {
    window.localStorage.removeItem(SAVED_STATE_KEY);
    return null;
  }
}

function savedTimeLabel(value: string) {
  const savedAt = new Date(value);
  if (Number.isNaN(savedAt.getTime())) {
    return "recently";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(savedAt);
}

function calculateWebLayout(paths: CareerPath[]): WebLayout {
  const pathCount = Math.max(paths.length, 1);
  const futureDepth = Math.max(
    ...paths.map((path) => Math.max(path.nodeIds.length - 1, 1)),
    1,
  );
  const width = Math.max(
    980,
    WEB_X_PADDING * 2 + pathCount * WEB_COLUMN_GAP,
  );
  const currentX = width / 2;
  const currentY =
    WEB_Y_PADDING + PROFILE_NODE_IDS.length * WEB_HISTORY_ROW_GAP;
  const height =
    currentY +
    futureDepth * WEB_FUTURE_ROW_GAP +
    WEB_Y_PADDING +
    WEB_NODE_SIZE;
  const current: WebPlacement = {
    key: "web-current",
    nodeId: "current",
    x: currentX,
    y: currentY,
  };
  const placements: WebPlacement[] = [current];
  const connections: WebConnection[] = [];
  const pathLabels: WebLayout["pathLabels"] = [];
  const columnStartX =
    currentX - ((pathCount - 1) * WEB_COLUMN_GAP) / 2;
  const pathColumns = paths.map(
    (_path, pathIndex) => columnStartX + pathIndex * WEB_COLUMN_GAP,
  );
  const destinationGroups = new Map<
    string,
    { depths: number[]; pathIndexes: number[] }
  >();
  paths.forEach((path, pathIndex) => {
    const current = destinationGroups.get(path.destinationId) ?? {
      depths: [],
      pathIndexes: [],
    };
    current.depths.push(Math.max(1, path.nodeIds.length - 1));
    current.pathIndexes.push(pathIndex);
    destinationGroups.set(path.destinationId, current);
  });
  const sharedDestinationPlacements = new Map<string, WebPlacement>();

  paths.forEach((path, pathIndex) => {
    const columnX = pathColumns[pathIndex] ?? currentX;
    pathLabels.push({
      destinationId: path.destinationId,
      id: path.id,
      label: path.label,
      routeNumber: pathIndex + 1,
      shortLabel: path.shortLabel,
      x: columnX,
      y: currentY + WEB_ROUTE_LABEL_OFFSET,
    });

    let source = current;
    path.nodeIds.slice(1).forEach((nodeId, stepIndex) => {
      const isDestination = nodeId === path.destinationId;
      let placement = isDestination
        ? sharedDestinationPlacements.get(nodeId)
        : undefined;
      if (!placement) {
        const destinationGroup = destinationGroups.get(nodeId);
        const destinationX =
          destinationGroup && isDestination
            ? destinationGroup.pathIndexes.reduce(
                (total, index) => total + pathColumns[index],
                0,
              ) / destinationGroup.pathIndexes.length
            : columnX;
        const destinationDepth =
          destinationGroup && isDestination
            ? Math.max(...destinationGroup.depths)
            : stepIndex + 1;
        placement = {
          key: isDestination
            ? `web-destination-${nodeId}`
            : `web-${path.id}-${nodeId}`,
          nodeId,
          pathId: isDestination ? undefined : path.id,
          x: destinationX,
          y: currentY + destinationDepth * WEB_FUTURE_ROW_GAP,
        };
        placements.push(placement);
        if (isDestination) {
          sharedDestinationPlacements.set(nodeId, placement);
        }
      }
      connections.push({
        key: `web-edge-${path.id}-${source.nodeId}-${nodeId}-${stepIndex}`,
        source,
        target: placement,
      });
      source = placement;
    });
  });

  let historySource: WebPlacement | null = null;
  for (const [index, nodeId] of PROFILE_NODE_IDS.entries()) {
    const placement: WebPlacement = {
      key: `web-history-${nodeId}`,
      nodeId,
      x: currentX,
      y: WEB_Y_PADDING + index * WEB_HISTORY_ROW_GAP,
    };
    placements.push(placement);
    if (historySource) {
      connections.push({
        key: `web-history-edge-${historySource.nodeId}-${nodeId}`,
        source: historySource,
        target: placement,
      });
    }
    historySource = placement;
  }
  if (historySource) {
    connections.push({
      key: `web-history-edge-${historySource.nodeId}-${current.nodeId}`,
      source: historySource,
      target: current,
    });
  }

  return {
    width,
    height,
    current,
    placements,
    connections,
    pathLabels,
  };
}

export function CareerMapView({
  initialMap,
  generationError,
  onBuildToward,
  onRegenerate,
  onReopenSaved,
  onSave,
  onStartOver,
  onSubmitFeedback,
}: CareerMapViewProps) {
  const evidenceSourceLabel = mapEvidenceSourceLabel(initialMap);
  const initialDestinationId =
    initialMap.dreamCareer?.destinationId ??
    initialMap.destinationIds[0];
  const initialFocusedPathId =
    initialMap.buildPathIdsByDestination[initialDestinationId]?.[0] ??
    initialMap.explorePathIds[0];
  const profileNodes = useMemo(
    () => createProfileNodes(initialMap),
    [initialMap],
  );
  const nodeById = useMemo(
    () =>
      new Map(
        [...initialMap.nodes, ...profileNodes].map((node) => {
          const sanitizedNode = sanitizeCareerNode(node);
          return [sanitizedNode.id, sanitizedNode];
        }),
      ),
    [initialMap.nodes, profileNodes],
  );
  const edgeByKey = useMemo(
    () =>
      new Map(
        initialMap.edges.map((edge) => [
          edgeKey(edge.source, edge.target),
          edge,
        ]),
      ),
    [initialMap.edges],
  );
  const paths = useMemo(
    () => initialMap.paths.map(sanitizeCareerPath),
    [initialMap.paths],
  );
  const pathById = useMemo(
    () => new Map(paths.map((path) => [path.id, path])),
    [paths],
  );

  const [mode, setMode] = useState<CareerMode>(
    initialMap.mode ?? "explore",
  );
  const [viewMode, setViewMode] = useState<CareerView>("focus");
  const [destinationId, setDestinationId] = useState(
    initialDestinationId,
  );
  const [explorePathIds, setExplorePathIds] = useState(
    initialMap.explorePathIds,
  );
  const [focusedPathId, setFocusedPathId] = useState(
    initialFocusedPathId,
  );
  const [selectedNodeId, setSelectedNodeId] = useState("current");
  const [detailSection, setDetailSection] =
    useState<DetailSection>("overview");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailMotion, setDetailMotion] =
    useState<DetailMotion>("select");
  const [focusTransition, setFocusTransition] =
    useState<FocusTransition | null>(null);
  const [webZoom, setWebZoom] = useState(0.9);
  const [pinnedNodeIds, setPinnedNodeIds] = useState<string[]>(
    initialMap.pinnedNodeIds ?? [],
  );
  const [dismissedNodeIds, setDismissedNodeIds] = useState<string[]>(
    initialMap.dismissedNodeIds ?? [],
  );
  const [lastDismissedNodeId, setLastDismissedNodeId] = useState<string | null>(
    null,
  );
  const [lastDismissedPathIds, setLastDismissedPathIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [hasSavedMap, setHasSavedMap] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [savedStorage, setSavedStorage] =
    useState<SaveMapResult["storage"]>("browser");
  const [persistenceError, setPersistenceError] = useState("");
  const [feedbackTarget, setFeedbackTarget] =
    useState<FeedbackTarget | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Current standing is focused. Use the connected previews above and below or open the complete path web.",
  );

  const feedbackCloseRef = useRef<HTMLButtonElement>(null);
  const focusedNodeRef = useRef<HTMLButtonElement>(null);
  const focusTransitionLockRef = useRef(false);
  const focusTransitionSequenceRef = useRef(0);
  const focusTransitionTimerRef = useRef<number | null>(null);
  const webViewportRef = useRef<HTMLDivElement>(null);
  const webDragState = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      focusTransitionSequenceRef.current += 1;
      focusTransitionLockRef.current = false;
      if (focusTransitionTimerRef.current !== null) {
        window.clearTimeout(focusTransitionTimerRef.current);
      }
    };
  }, []);

  const activePathIds = useMemo(() => {
    if (mode === "explore") {
      return explorePathIds;
    }
    return initialMap.buildPathIdsByDestination[destinationId] ?? [];
  }, [
    destinationId,
    explorePathIds,
    initialMap.buildPathIdsByDestination,
    mode,
  ]);

  const activePaths = useMemo(() => {
    return activePathIds
      .map((pathId) => pathById.get(pathId))
      .filter((path): path is CareerPath => Boolean(path))
      .map((path) => {
        return {
          ...path,
          nodeIds: path.nodeIds.filter(
            (nodeId) =>
              !dismissedNodeIds.includes(nodeId) ||
              pinnedNodeIds.includes(nodeId) ||
              nodeId === "current" ||
              nodeId === path.destinationId,
          ),
        };
      });
  }, [activePathIds, dismissedNodeIds, pathById, pinnedNodeIds]);

  const selectedNode = nodeById.get(selectedNodeId) ?? nodeById.get("current")!;
  const focusNodeSummary =
    selectedNode.type === "destination"
      ? [
          ...selectedNode.transferableSkills,
          ...selectedNode.existingSkills,
        ]
          .filter((skill, index, skills) => skills.indexOf(skill) === index)
          .slice(0, 3)
          .join(" · ") || selectedNode.stage
      : selectedNode.stepDetails
        ? `${selectedNode.stepDetails.gapAddressed} · ${selectedNode.stepDetails.effort}`
      : selectedNode.summary;
  const focusedPath = useMemo(
    () =>
      activePaths.find((path) => path.id === focusedPathId) ?? activePaths[0],
    [activePaths, focusedPathId],
  );
  const goalOptions = useMemo<CareerGoalOption[]>(() => {
    return initialMap.destinationIds.flatMap((goalId) => {
      const destination = nodeById.get(goalId);
      if (!destination) {
        return [];
      }

      const candidatePathIds =
        mode === "build"
          ? initialMap.buildPathIdsByDestination[goalId] ?? []
          : initialMap.explorePathIds;
      const path =
        (focusedPath?.destinationId === goalId ? focusedPath : undefined) ??
        activePaths.find((candidate) => candidate.destinationId === goalId) ??
        candidatePathIds
          .map((pathId) => pathById.get(pathId))
          .find((candidate) => candidate?.destinationId === goalId) ??
        paths.find(
          (candidate) => candidate.destinationId === goalId,
        );

      return path ? [{ destination, path }] : [];
    });
  }, [
    activePaths,
    focusedPath,
    initialMap.buildPathIdsByDestination,
    initialMap.destinationIds,
    initialMap.explorePathIds,
    mode,
    nodeById,
    pathById,
    paths,
  ]);
  const activeGoal =
    goalOptions.find(
      (goal) =>
        goal.destination.id ===
        (focusedPath?.destinationId ?? destinationId),
    ) ?? goalOptions[0];
  const alternativeGoals = goalOptions.filter(
    (goal) => goal.destination.id !== activeGoal?.destination.id,
  );
  const focusSequence = useMemo(
    () => [
      ...PROFILE_NODE_IDS,
      "current",
      ...(focusedPath?.nodeIds.slice(1) ?? []),
    ],
    [focusedPath],
  );
  const focusIndex = focusSequence.indexOf(selectedNode.id);
  const focusedPathIndex = focusedPath
    ? activePaths.findIndex((path) => path.id === focusedPath.id)
    : -1;
  const horizontalDepth =
    selectedNode.id === "current"
      ? 0
      : focusedPath?.nodeIds.indexOf(selectedNode.id) ?? -1;
  const horizontalNodeForPath = (path: CareerPath) => {
    if (PROFILE_NODE_ID_SET.has(selectedNode.id)) {
      return selectedNode;
    }
    const targetIndex = Math.max(
      0,
      Math.min(
        horizontalDepth >= 0 ? horizontalDepth : 0,
        path.nodeIds.length - 1,
      ),
    );
    return (
      nodeById.get(path.nodeIds[targetIndex]) ??
      nodeById.get("current")!
    );
  };
  const previousHorizontalRoute: HorizontalRouteOption | null =
    focusedPathIndex > 0
      ? {
          destination:
            nodeById.get(
              activePaths[focusedPathIndex - 1].destinationId,
            ) ?? nodeById.get("current")!,
          node: horizontalNodeForPath(activePaths[focusedPathIndex - 1]),
          path: activePaths[focusedPathIndex - 1],
        }
      : null;
  const nextHorizontalRoute: HorizontalRouteOption | null =
    focusedPathIndex >= 0 && focusedPathIndex < activePaths.length - 1
      ? {
          destination:
            nodeById.get(
              activePaths[focusedPathIndex + 1].destinationId,
            ) ?? nodeById.get("current")!,
          node: horizontalNodeForPath(activePaths[focusedPathIndex + 1]),
          path: activePaths[focusedPathIndex + 1],
        }
      : null;
  const previousFocusNode =
    focusIndex > 0
      ? nodeById.get(focusSequence[focusIndex - 1]) ?? null
      : null;
  const nextFocusNode =
    focusIndex >= 0 && focusIndex < focusSequence.length - 1
      ? nodeById.get(focusSequence[focusIndex + 1]) ?? null
      : null;
  const positionLabel =
    PROFILE_NODE_ID_SET.has(selectedNode.id)
      ? "Profile foundation"
      : selectedNode.id === "current"
        ? "Current standing"
        : focusedPath
          ? `Step ${Math.max(1, focusedPath.nodeIds.indexOf(selectedNode.id))} on ${focusedPath.shortLabel}`
          : selectedNode.stage;
  const focusPathForDetails = useMemo<CareerPath>(
    () => ({
      id: `vertical-focus-${focusedPath?.id ?? "profile"}`,
      label: focusedPath?.label ?? "Profile-to-career route",
      shortLabel: focusedPath?.shortLabel ?? "Focus route",
      destinationId:
        focusedPath?.destinationId ??
        focusSequence[focusSequence.length - 1] ??
        "current",
      nodeIds: focusSequence,
      description:
        focusedPath?.description ??
        "A profile-to-future route from imported evidence to possible careers.",
      strategy: focusedPath?.strategy ?? "Profile foundation",
    }),
    [focusSequence, focusedPath],
  );
  const isProfileNode = PROFILE_NODE_ID_SET.has(selectedNode.id);
  const futurePreviewNodes = useMemo<Array<CareerNode | null>>(
    () =>
      [focusIndex + 2, focusIndex + 1].map((index) => {
        if (focusIndex < 0 || index >= focusSequence.length) {
          return null;
        }
        return nodeById.get(focusSequence[index]) ?? null;
      }),
    [focusIndex, focusSequence, nodeById],
  );
  const historyPreviewNodes = useMemo<Array<CareerNode | null>>(
    () =>
      [focusIndex - 1, focusIndex - 2].map((index) => {
        if (focusIndex < 0 || index < 0) {
          return null;
        }
        return nodeById.get(focusSequence[index]) ?? null;
      }),
    [focusIndex, focusSequence, nodeById],
  );
  const webLayout = useMemo(
    () => calculateWebLayout(activePaths),
    [activePaths],
  );
  const isFocusTransitioning = focusTransition !== null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const state = readSavedCareerState();
      setHasSavedMap(Boolean(state));
      setSavedAt(state?.savedAt ?? "");
      setSavedStorage(state?.storage ?? "browser");
      if (!state || state.mapId !== initialMap.id) {
        setSaved(false);
        return;
      }
      const versionsMatch =
        state.dataVersion === initialMap.generation.dataVersion &&
        state.modelVersion === initialMap.generation.modelVersion &&
        state.promptVersion === initialMap.generation.promptVersion;
      if (!versionsMatch) {
        setSaved(false);
        return;
      }

      const restoredMode =
        state.mode === "build" || state.mode === "explore"
          ? state.mode
          : "explore";
      const restoredDestination = initialMap.destinationIds.includes(
        state.destinationId,
      )
        ? state.destinationId
        : initialDestinationId;
      const restoredActivePathIds =
        restoredMode === "build"
          ? initialMap.buildPathIdsByDestination[restoredDestination] ?? []
          : state.explorePathIds.filter((pathId) => pathById.has(pathId));
      const restoredPathId = restoredActivePathIds.includes(
        state.focusedPathId ?? "",
      )
        ? state.focusedPathId
        : restoredActivePathIds[0];
      const restoredPath = restoredPathId
        ? pathById.get(restoredPathId)
        : undefined;
      const restoredNodeId =
        nodeById.has(state.selectedNodeId) &&
        (PROFILE_NODE_ID_SET.has(state.selectedNodeId) ||
          state.selectedNodeId === "current" ||
          restoredPath?.nodeIds.includes(state.selectedNodeId))
          ? state.selectedNodeId
          : "current";

      setMode(restoredMode);
      setViewMode(state.viewMode === "web" ? "web" : "focus");
      setDestinationId(restoredDestination);
      setExplorePathIds(
        restoredMode === "explore" && restoredActivePathIds.length > 0
          ? restoredActivePathIds
          : initialMap.explorePathIds,
      );
      setFocusedPathId(restoredPathId ?? initialFocusedPathId);
      setSelectedNodeId(restoredNodeId);
      setDetailSection(state.detailSection);
      setDetailsOpen(Boolean(state.detailsOpen));
      setPinnedNodeIds(
        state.pinnedNodeIds.filter((nodeId) => nodeById.has(nodeId)),
      );
      setDismissedNodeIds(
        state.dismissedNodeIds.filter((nodeId) => nodeById.has(nodeId)),
      );
      setWebZoom(Math.max(0.6, Math.min(1.2, state.webZoom ?? 0.9)));
      setSaved(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    initialDestinationId,
    initialFocusedPathId,
    initialMap.buildPathIdsByDestination,
    initialMap.destinationIds,
    initialMap.explorePathIds,
    initialMap.generation.dataVersion,
    initialMap.generation.modelVersion,
    initialMap.generation.promptVersion,
    initialMap.id,
    nodeById,
    pathById,
  ]);

  function cancelFocusTransition() {
    focusTransitionSequenceRef.current += 1;
    focusTransitionLockRef.current = false;
    if (focusTransitionTimerRef.current !== null) {
      window.clearTimeout(focusTransitionTimerRef.current);
      focusTransitionTimerRef.current = null;
    }
    setFocusTransition(null);
  }

  function selectNode(
    nodeId: string,
    openDetails = true,
    pathId?: string,
    motion: DetailMotion = "select",
  ) {
    if (!nodeById.has(nodeId)) {
      return;
    }

    const matchingPath = activePaths.find((path) => path.id === pathId);
    if (matchingPath) {
      setFocusedPathId(matchingPath.id);
    }
    setDetailMotion(motion);
    setSelectedNodeId(nodeId);
    setDetailsOpen(openDetails);
    setStatusMessage(`${nodeById.get(nodeId)?.label} selected.`);
  }

  function selectAndFocusNode(nodeId: string, pathId?: string) {
    selectNode(nodeId, true, pathId);
    window.requestAnimationFrame(() => {
      focusedNodeRef.current?.focus({ preventScroll: true });
    });
  }

  function selectGoal(goal: CareerGoalOption) {
    cancelFocusTransition();
    setDestinationId(goal.destination.id);
    if (mode === "explore" && !explorePathIds.includes(goal.path.id)) {
      setExplorePathIds((current) => {
        const matchingIndex = current.findIndex(
          (pathId) =>
            pathById.get(pathId)?.destinationId === goal.destination.id,
        );
        if (matchingIndex < 0) {
          return [...current, goal.path.id];
        }

        const next = [...current];
        next[matchingIndex] = goal.path.id;
        return next;
      });
    }
    setFocusedPathId(goal.path.id);
    setSelectedNodeId(goal.destination.id);
    setDetailsOpen(false);
    setStatusMessage(
      `${goal.destination.label} selected as the career goal. Showing ${goal.path.label.toLowerCase()}.`,
    );
    window.requestAnimationFrame(() => {
      focusedNodeRef.current?.focus({ preventScroll: true });
    });
  }

  function transitionToNode(
    target: CareerNode,
    direction: Direction,
    openDetails = false,
  ) {
    if (focusTransitionLockRef.current) {
      return;
    }

    const transitionSequence = focusTransitionSequenceRef.current + 1;
    const reduceMotion = prefersReducedMotion();
    const exitDuration = reduceMotion
      ? REDUCED_FOCUS_EXIT_DURATION_MS
      : FOCUS_EXIT_DURATION_MS;
    const enterDuration = reduceMotion
      ? REDUCED_FOCUS_ENTER_DURATION_MS
      : FOCUS_ENTER_DURATION_MS;

    focusTransitionSequenceRef.current = transitionSequence;
    focusTransitionLockRef.current = true;
    setDetailMotion(direction);
    setFocusTransition({ direction, phase: "exit" });
    setStatusMessage(
      `Moving ${direction === "next" ? "up" : "down"} to ${target.label}.`,
    );

    focusTransitionTimerRef.current = window.setTimeout(() => {
      if (focusTransitionSequenceRef.current !== transitionSequence) {
        return;
      }

      selectNode(target.id, openDetails, focusedPath?.id, direction);
      setFocusTransition({ direction, phase: "enter" });

      if (!openDetails) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            focusedNodeRef.current?.focus({ preventScroll: true });
          });
        });
      }

      focusTransitionTimerRef.current = window.setTimeout(() => {
        if (focusTransitionSequenceRef.current !== transitionSequence) {
          return;
        }
        focusTransitionLockRef.current = false;
        focusTransitionTimerRef.current = null;
        setFocusTransition(null);
      }, enterDuration);
    }, exitDuration);
  }

  function navigate(direction: Direction, openDetails = false) {
    const target = direction === "next" ? nextFocusNode : previousFocusNode;
    if (!target) {
      setStatusMessage(
        direction === "next"
          ? "This scenario currently ends here. Future recommendations are reserved above."
          : "You are back at the profile starting point.",
      );
      return;
    }

    transitionToNode(target, direction, openDetails);
  }

  function switchHorizontalRoute(
    option: HorizontalRouteOption,
    direction: HorizontalDirection,
  ) {
    if (focusTransitionLockRef.current) {
      return;
    }

    const transitionSequence = focusTransitionSequenceRef.current + 1;
    const reduceMotion = prefersReducedMotion();
    const exitDuration = reduceMotion
      ? REDUCED_FOCUS_EXIT_DURATION_MS
      : FOCUS_EXIT_DURATION_MS;
    const enterDuration = reduceMotion
      ? REDUCED_FOCUS_ENTER_DURATION_MS
      : FOCUS_ENTER_DURATION_MS;

    focusTransitionSequenceRef.current = transitionSequence;
    focusTransitionLockRef.current = true;
    setDetailMotion("select");
    setFocusTransition({ direction, phase: "exit" });
    setStatusMessage(
      `Moving ${direction} to ${option.path.label}. ${option.node.label} will stay at the comparable route stage.`,
    );

    focusTransitionTimerRef.current = window.setTimeout(() => {
      if (focusTransitionSequenceRef.current !== transitionSequence) {
        return;
      }

      setFocusedPathId(option.path.id);
      setDestinationId(option.path.destinationId);
      setSelectedNodeId(option.node.id);
      setFocusTransition({ direction, phase: "enter" });
      setStatusMessage(
        `Moved ${direction} to ${option.path.label}. ${option.node.label} is focused at the comparable route stage.`,
      );

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusedNodeRef.current?.focus({ preventScroll: true });
        });
      });

      focusTransitionTimerRef.current = window.setTimeout(() => {
        if (focusTransitionSequenceRef.current !== transitionSequence) {
          return;
        }
        focusTransitionLockRef.current = false;
        focusTransitionTimerRef.current = null;
        setFocusTransition(null);
      }, enterDuration);
    }, exitDuration);
  }

  function handleNodeKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDetailsOpen(true);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction =
        event.key === "ArrowUp" ? "next" : "previous";
      navigate(direction);
      return;
    }

    if (event.key === "ArrowLeft" && previousHorizontalRoute) {
      event.preventDefault();
      switchHorizontalRoute(previousHorizontalRoute, "left");
      return;
    }

    if (event.key === "ArrowRight" && nextHorizontalRoute) {
      event.preventDefault();
      switchHorizontalRoute(nextHorizontalRoute, "right");
    }
  }

  function focusPreview(node: CareerNode) {
    const targetIndex = focusSequence.indexOf(node.id);
    if (targetIndex < 0 || targetIndex === focusIndex) {
      return;
    }

    transitionToNode(
      node,
      targetIndex > focusIndex ? "next" : "previous",
    );
  }

  function returnToCurrent() {
    cancelFocusTransition();
    selectNode("current", false, focusedPath?.id);
    setStatusMessage("Returned to your current standing.");
    window.requestAnimationFrame(() => {
      focusedNodeRef.current?.focus({ preventScroll: true });
    });
  }

  function centerWebView(behavior: ScrollBehavior = "smooth") {
    const viewport = webViewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({
      left: Math.max(
        0,
        webLayout.current.x * webZoom - viewport.clientWidth / 2,
      ),
      top: Math.max(
        0,
        webLayout.current.y * webZoom - viewport.clientHeight / 2,
      ),
      behavior,
    });
  }

  function showWebView() {
    cancelFocusTransition();
    setViewMode("web");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const viewport = webViewportRef.current;
        if (!viewport) {
          return;
        }
        viewport.scrollTo({
          left: Math.max(
            0,
            webLayout.current.x * webZoom - viewport.clientWidth / 2,
          ),
          top: 0,
          behavior: "auto",
        });
      });
    });
  }

  function handleWebPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) {
      return;
    }
    const viewport = webViewportRef.current;
    if (!viewport) {
      return;
    }
    webDragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
    viewport.dataset.dragging = "true";
  }

  function handleWebPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = webDragState.current;
    const viewport = webViewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) {
      return;
    }
    viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    viewport.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  }

  function handleWebPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const viewport = webViewportRef.current;
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    if (viewport) {
      delete viewport.dataset.dragging;
    }
    webDragState.current = null;
  }

  function togglePinned() {
    setPinnedNodeIds((current) => {
      if (current.includes(selectedNode.id)) {
        setStatusMessage(`${selectedNode.label} unpinned.`);
        return current.filter((id) => id !== selectedNode.id);
      }
      setStatusMessage(`${selectedNode.label} pinned for regeneration.`);
      return [...current, selectedNode.id];
    });
  }

  async function dismissSelectedNode() {
    if (selectedNode.type === "current" || pinnedNodeIds.includes(selectedNode.id)) {
      setStatusMessage(
        pinnedNodeIds.includes(selectedNode.id)
          ? "Unpin this step before dismissing it."
          : "The current standing remains visible as the start of every route.",
      );
      return;
    }
    setStatusMessage(
      `Regenerating without ${selectedNode.label}. Your inputs will be preserved.`,
    );
    await onRegenerate("not_for_me", {
      targetId: selectedNode.id,
      pinnedNodeIds,
      dismissedNodeIds: [
        ...dismissedNodeIds,
        selectedNode.id,
      ],
    });
  }

  function undoDismissal() {
    if (!lastDismissedNodeId) {
      return;
    }
    const restored = nodeById.get(lastDismissedNodeId);
    if (lastDismissedPathIds.length > 0) {
      setExplorePathIds((current) =>
        paths
          .map((path) => path.id)
          .filter(
          (pathId) =>
            current.includes(pathId) || lastDismissedPathIds.includes(pathId),
          ),
      );
    }
    setDismissedNodeIds((current) =>
      current.filter((id) => id !== lastDismissedNodeId),
    );
    setLastDismissedNodeId(null);
    setLastDismissedPathIds([]);
    setStatusMessage(`${restored?.label ?? "Step"} restored.`);
  }

  async function regenerate() {
    setStatusMessage(
      `Regenerating this map with ${evidenceSourceLabel} and pinned steps.`,
    );
    await onRegenerate("regenerate", {
      pinnedNodeIds,
      dismissedNodeIds,
    });
  }

  async function saveMap() {
    setPersistenceError("");
    let result: SaveMapResult;
    try {
      result = await onSave(pinnedNodeIds, dismissedNodeIds);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "PathIn could not save this generated map.";
      setPersistenceError(message);
      setStatusMessage(message);
      return;
    }
    const state: SavedCareerState = {
      mapId: initialMap.id,
      dataVersion: initialMap.generation.dataVersion,
      modelVersion: initialMap.generation.modelVersion,
      promptVersion: initialMap.generation.promptVersion,
      mode,
      viewMode,
      destinationId,
      focusedPathId: focusedPath?.id,
      selectedNodeId,
      detailSection,
      detailsOpen,
      explorePathIds,
      pinnedNodeIds,
      dismissedNodeIds,
      webZoom,
      savedAt: result.savedAt,
      storage: result.storage,
    };
    window.localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(state));
    setSaved(true);
    setHasSavedMap(true);
    setSavedAt(result.savedAt);
    setSavedStorage(result.storage);
    setStatusMessage(
      result.storage === "backend_and_browser"
        ? "Path saved in this browser with a server copy."
        : "Path saved in this browser.",
    );
  }

  async function reopenSavedMap() {
    setPersistenceError("");
    try {
      const result = await onReopenSaved();
      setStatusMessage(
        result.source === "backend"
          ? "Saved path reopened from the server copy."
          : "Saved path reopened from this browser.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The saved generated map could not be reopened.";
      setPersistenceError(message);
      setStatusMessage(message);
    }
  }

  function closeDetails() {
    setDetailsOpen(false);
    window.requestAnimationFrame(() => {
      focusedNodeRef.current?.focus({ preventScroll: true });
    });
  }

  async function requestAlternative() {
    if (pinnedNodeIds.includes(selectedNode.id)) {
      setStatusMessage(
        "Unpin this step before replacing its route with an alternative.",
      );
      return;
    }

    const currentPath =
      focusedPath ??
      activePaths.find((path) => path.nodeIds.includes(selectedNode.id));
    if (!currentPath) {
      setStatusMessage("No route alternative is available from this step.");
      return;
    }

    const alternatives =
      initialMap.buildPathIdsByDestination[currentPath.destinationId] ?? [];
    if (alternatives.length < 2) {
      setStatusMessage("No route alternative is available for this destination.");
      return;
    }
    setStatusMessage(
      `Requesting another route toward ${nodeById.get(currentPath.destinationId)?.label ?? "this destination"}.`,
    );
    await onRegenerate("alternative_route", {
      targetId: currentPath.destinationId,
      pinnedNodeIds,
      dismissedNodeIds,
    });
  }

  async function buildSelectedDestination() {
    if (selectedNode.type !== "destination") {
      return;
    }
    setStatusMessage(`Building two routes toward ${selectedNode.label}.`);
    await onBuildToward(selectedNode.id);
  }

  function closeFeedback() {
    setFeedbackTarget(null);
    window.requestAnimationFrame(() => {
      focusedNodeRef.current?.focus({ preventScroll: true });
    });
  }

  async function submitFeedback(category: string) {
    if (!feedbackTarget) {
      return;
    }
    try {
      await onSubmitFeedback(feedbackTarget, category);
      setStatusMessage(
        `Feedback recorded for ${feedbackTarget.label} with this map's generation versions.`,
      );
      closeFeedback();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "PathIn could not record this feedback.",
      );
    }
  }

  return (
    <div
      className={styles.page}
      onKeyDown={(event) => {
        if (event.key !== "Escape") {
          return;
        }
        if (feedbackTarget) {
          event.preventDefault();
          closeFeedback();
        } else if (detailsOpen) {
          event.preventDefault();
          closeDetails();
        }
      }}
    >
      <section className={styles.featureHeader}>
        <div className={styles.featureIdentity}>
          <PathInLogo />
          <div>
            <div className={styles.featureTitleLine}>
              <h1>PathIn</h1>
              <span className={styles.betaBadge}>Beta</span>
            </div>
            <p>
              Explore AI-generated career routes from your enabled profile evidence.
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={regenerate}
            type="button"
          >
            <MiniIcon name="refresh" />
            Regenerate
          </button>
          <button
            className={saved ? styles.savedButton : styles.primaryButton}
            onClick={saveMap}
            type="button"
          >
            <MiniIcon name={saved ? "check" : "bookmark"} />
            {saved ? "Saved" : "Save path"}
          </button>
          <button
            className={styles.secondaryButton}
            onClick={onStartOver}
            type="button"
          >
            <MiniIcon name="refresh" />
            Start over
          </button>
        </div>
      </section>

      {persistenceError ? (
        <div className={styles.persistenceError} role="alert">
          <MiniIcon name="info" />
          <span>{persistenceError}</span>
        </div>
      ) : null}

      {generationError ? (
        <div className={styles.mapErrorBanner} role="alert">
          <strong>Last backend action failed.</strong>
          <span>{generationError}</span>
          <button onClick={onStartOver} type="button">
            Start over
          </button>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <aside className={styles.profileRail}>
          <section className={styles.profileCard}>
            <div className={styles.profileCover} />
            <Image
              alt={initialMap.profile.name}
              className={styles.profileAvatar}
              height={96}
              src="/linkedin/profile.png"
              width={96}
            />
            <div className={styles.profileBody}>
              <p className={styles.profileOverline}>Current profile</p>
              <h2>{initialMap.profile.name}</h2>
              <p className={styles.profileHeadline}>
                {conciseSignal(initialMap.profile.experience.join(", ")) ||
                  initialMap.profile.headline}
              </p>
              <p className={styles.profileLocation}>
                {initialMap.profile.location || "No location preference"}
              </p>
            </div>
          </section>

          <section className={styles.dataCard}>
            <div className={styles.dataCardHeader}>
              <MiniIcon name="branch" />
              <div>
                <p className={styles.railEyebrow}>Evidence source</p>
                <h2>PIT career data</h2>
              </div>
              <span
                className={styles.sourceStatus}
                data-live={initialMap.source.status === "live"}
              >
                {initialMap.source.status === "live" ? "Live" : "Snapshot"}
              </span>
            </div>
            <div className={styles.dataStats}>
              <span>
                <strong>
                  {initialMap.source.memberCount.toLocaleString("en-US")}
                </strong>
                members
              </span>
              <span>
                <strong>
                  {initialMap.source.jobCount.toLocaleString("en-US")}
                </strong>
                jobs
              </span>
              <span>
                <strong>
                  {initialMap.source.courseCount.toLocaleString("en-US")}
                </strong>
                courses
              </span>
            </div>
            <p>
              {initialMap.source.cohortCount} synthetic profiles contribute
              aggregate career-history evidence. Exact transitions appear only
              when at least 20 matching profiles support them.
            </p>
            <a
              href={initialMap.source.url}
              rel="noreferrer"
              target="_blank"
            >
              Review the synthetic dataset
              <MiniIcon name="arrow-right" />
            </a>
          </section>
        </aside>

        <main className={styles.mapColumn}>
          <section className={styles.mapCard}>
            <div className={styles.mapToolbar}>
              <div className={styles.modeTabs} role="tablist" aria-label="Path mode">
                <button
                  aria-selected={mode === "explore"}
                  className={styles.modeTab}
                  onClick={() => {
                    cancelFocusTransition();
                    setMode("explore");
                    setFocusedPathId(explorePathIds[0] ?? "");
                    setSelectedNodeId("current");
                    setDetailsOpen(false);
                    setStatusMessage(
                      "Explore mode selected. Current standing is focused.",
                    );
                  }}
                  role="tab"
                  type="button"
                >
                  <MiniIcon name="sparkles" />
                  Explore
                </button>
                <button
                  aria-selected={mode === "build"}
                  className={styles.modeTab}
                  onClick={() => {
                    cancelFocusTransition();
                    setMode("build");
                    setFocusedPathId(
                      initialMap.buildPathIdsByDestination[destinationId]?.[0] ??
                        "",
                    );
                    setSelectedNodeId("current");
                    setDetailsOpen(false);
                    setStatusMessage(
                      "Build My Path mode selected. Current standing is focused.",
                    );
                  }}
                  role="tab"
                  type="button"
                >
                  <MiniIcon name="destination" />
                  Build My Path
                </button>
              </div>
              <div className={styles.mapToolbarActions}>
                {selectedNode.id !== "current" ? (
                  <button
                    aria-label="Return focus to current standing"
                    className={styles.returnToCurrent}
                    onClick={returnToCurrent}
                    type="button"
                  >
                    <MiniIcon name="current" />
                    Return to current
                  </button>
                ) : null}
                <div className={styles.viewControls} aria-label="Career map view">
                  <button
                    aria-pressed={viewMode === "focus"}
                    onClick={() => {
                      cancelFocusTransition();
                      setViewMode("focus");
                    }}
                    type="button"
                  >
                    <MiniIcon name="current" />
                    Focus
                  </button>
                  <button
                    aria-pressed={viewMode === "web"}
                    onClick={showWebView}
                    type="button"
                  >
                    <MiniIcon name="branch" />
                    Web
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.mapContext}>
              <div>
                <p className={styles.mapEyebrow}>
                  {mode === "explore"
                    ? "Explore · Compare different careers"
                    : "Build My Path · One goal, multiple routes"}
                </p>
                <h2>
                  {mode === "explore"
                    ? viewMode === "focus"
                      ? "Compare career directions one step at a time"
                      : "See every suggested career and its route"
                    : viewMode === "focus"
                      ? `Build toward ${activeGoal?.destination.label ?? "one career goal"}`
                      : `Compare ways to reach ${activeGoal?.destination.label ?? "your selected goal"}`}
                </h2>
                <p>
                  {mode === "explore"
                    ? viewMode === "focus"
                      ? "Up and down move through one path. Left and right switch to a different career suggestion at the comparable stage."
                      : "Each column is a different career destination. Profile evidence flows into your current standing, then branches into possible futures."
                    : viewMode === "focus"
                      ? "Up and down move through the selected path. Left and right compare another strategy for reaching the same destination."
                      : "Each column is an alternate route to the same destination. Shared destinations merge into one final bubble."}
                </p>
              </div>

              {mode === "build" ? (
                <label className={styles.destinationSelect}>
                  <span>Destination</span>
                  <span className={styles.selectWrap}>
                    <select
                      onChange={(event) => {
                        cancelFocusTransition();
                        const nextDestinationId = event.target.value;
                        setDestinationId(nextDestinationId);
                        setFocusedPathId(
                          initialMap.buildPathIdsByDestination[
                            nextDestinationId
                          ]?.[0] ?? "",
                        );
                        setSelectedNodeId("current");
                        setDetailsOpen(false);
                        setStatusMessage(
                          `Building routes toward ${nodeById.get(nextDestinationId)?.label}.`,
                        );
                      }}
                      value={destinationId}
                    >
                      {initialMap.destinationIds.map((id) => (
                        <option key={id} value={id}>
                          {nodeById.get(id)?.label}
                        </option>
                      ))}
                    </select>
                    <MiniIcon name="chevron-down" />
                  </span>
                  <small>
                    Route {Math.max(1, focusedPathIndex + 1)} of{" "}
                    {activePaths.length} ·{" "}
                    {focusedPath?.shortLabel ?? "Generated route"}
                  </small>
                </label>
              ) : (
                <div className={styles.scenarioStatus}>
                  <span>Current career suggestion</span>
                  <strong>
                    {activeGoal?.destination.label ??
                      focusedPath?.shortLabel ??
                      "Career route"}
                  </strong>
                  <small>
                    Career {Math.max(1, focusedPathIndex + 1)} of{" "}
                    {activePaths.length} · {focusedPath?.shortLabel}. Left and
                    right switch careers.
                  </small>
                </div>
              )}
            </div>

            {viewMode === "focus" ? (
              <section
                aria-label="Focused career bubble navigator"
                aria-busy={isFocusTransitioning}
                className={styles.focusStage}
                data-transition-direction={
                  focusTransition?.direction ?? "none"
                }
                data-transition-phase={focusTransition?.phase ?? "idle"}
                data-transitioning={
                  isFocusTransitioning ? "true" : "false"
                }
              >
                <div
                  className={styles.focusNavigator}
                  data-transition-direction={
                    focusTransition?.direction ?? "none"
                  }
                  data-transition-phase={focusTransition?.phase ?? "idle"}
                  data-transitioning={
                    isFocusTransitioning ? "true" : "false"
                  }
                >
                  {activeGoal ? (
                    <>
                      <CareerGoals
                        activeGoal={activeGoal}
                        alternativeGoals={alternativeGoals}
                        dreamCareer={initialMap.dreamCareer}
                        onSelect={selectGoal}
                      />
                      <FocusPreviewConnector direction="future" />
                    </>
                  ) : null}

                  {nextFocusNode ? (
                    <div
                      className={styles.focusPreviewStack}
                      data-direction="future"
                    >
                      {futurePreviewNodes[0] ? (
                        <FocusPreview
                          distance={2}
                          node={futurePreviewNodes[0]}
                          onSelect={focusPreview}
                          relation="Two steps ahead"
                        />
                      ) : null}
                      {futurePreviewNodes[0] && futurePreviewNodes[1] ? (
                        <FocusPreviewConnector direction="future" />
                      ) : null}
                      {futurePreviewNodes[1] ? (
                        <FocusPreview
                          distance={1}
                          node={futurePreviewNodes[1]}
                          onSelect={focusPreview}
                          relation="Next step"
                        />
                      ) : null}
                      <button
                        aria-label={`Move focus up to ${nextFocusNode.label}`}
                        className={styles.focusMoveButton}
                        data-active={
                          focusTransition?.direction === "next" &&
                          focusTransition.phase === "exit"
                            ? "true"
                            : "false"
                        }
                        data-direction="next"
                        disabled={isFocusTransitioning}
                        onClick={() => navigate("next")}
                        type="button"
                      >
                        <MiniIcon name="arrow-up" />
                        <span>Move focus up</span>
                      </button>
                    </div>
                  ) : null}

                  <div className={styles.focusCenterRow}>
                    <HorizontalRouteControl
                      active={
                        focusTransition?.direction === "left" &&
                        focusTransition.phase === "exit"
                      }
                      activeRouteIndex={Math.max(0, focusedPathIndex)}
                      direction="left"
                      disabled={isFocusTransitioning}
                      mode={mode}
                      onSelect={switchHorizontalRoute}
                      option={previousHorizontalRoute}
                      routeCount={activePaths.length}
                    />

                    <button
                      aria-label={`${selectedNode.label}, focused node. Open details.`}
                      className={styles.focusNode}
                      data-kind={selectedNode.type}
                      onClick={() => setDetailsOpen(true)}
                      onKeyDown={handleNodeKeyDown}
                      ref={focusedNodeRef}
                      type="button"
                    >
                      <span className={styles.focusNodeTopline}>
                        <span className={styles.focusNodeIcon}>
                          <MiniIcon name={nodeIcon(selectedNode)} />
                        </span>
                        <span>{selectedNode.eyebrow}</span>
                        {pinnedNodeIds.includes(selectedNode.id) ? (
                          <MiniIcon
                            className={styles.focusNodePin}
                            name="pin"
                          />
                        ) : null}
                      </span>
                      <strong>{selectedNode.label}</strong>
                      <small>{positionLabel}</small>
                      <p>{focusNodeSummary}</p>
                      <span className={styles.focusNodeAction}>
                        Open focused details
                        <MiniIcon name="arrow-right" />
                      </span>
                    </button>

                    <HorizontalRouteControl
                      active={
                        focusTransition?.direction === "right" &&
                        focusTransition.phase === "exit"
                      }
                      activeRouteIndex={Math.max(0, focusedPathIndex)}
                      direction="right"
                      disabled={isFocusTransitioning}
                      mode={mode}
                      onSelect={switchHorizontalRoute}
                      option={nextHorizontalRoute}
                      routeCount={activePaths.length}
                    />
                  </div>

                  {previousFocusNode ? (
                    <div
                      className={styles.focusPreviewStack}
                      data-direction="history"
                    >
                      <button
                        aria-label={`Move focus down to ${previousFocusNode.label}`}
                        className={styles.focusMoveButton}
                        data-active={
                          focusTransition?.direction === "previous" &&
                          focusTransition.phase === "exit"
                            ? "true"
                            : "false"
                        }
                        data-direction="previous"
                        disabled={isFocusTransitioning}
                        onClick={() => navigate("previous")}
                        type="button"
                      >
                        <span>Move focus down</span>
                        <MiniIcon name="arrow-down" />
                      </button>
                      {historyPreviewNodes[0] ? (
                        <FocusPreview
                          distance={1}
                          node={historyPreviewNodes[0]}
                          onSelect={focusPreview}
                          relation="Previous step"
                        />
                      ) : null}
                      {historyPreviewNodes[0] && historyPreviewNodes[1] ? (
                        <FocusPreviewConnector direction="history" />
                      ) : null}
                      {historyPreviewNodes[1] ? (
                        <FocusPreview
                          distance={2}
                          node={historyPreviewNodes[1]}
                          onSelect={focusPreview}
                          relation="Two steps back"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : (
              <section
                aria-label="Complete connected career path web"
                className={styles.webStage}
              >
                <div className={styles.webToolbar}>
                  <span>
                    <MiniIcon name="branch" />
                    {mode === "explore"
                      ? `${activePaths.length} career suggestions`
                      : `${activePaths.length} routes to ${activeGoal?.destination.label ?? "one destination"}`}
                    {" · "}
                    {webLayout.placements.length} visible bubbles
                  </span>
                  <div>
                    <button
                      aria-label="Zoom out of path web"
                      disabled={webZoom <= 0.6}
                      onClick={() =>
                        setWebZoom((current) =>
                          Math.max(0.6, current - 0.1),
                        )
                      }
                      type="button"
                    >
                      <MiniIcon name="minus" />
                    </button>
                    <strong>{Math.round(webZoom * 100)}%</strong>
                    <button
                      aria-label="Zoom in to path web"
                      disabled={webZoom >= 1.2}
                      onClick={() =>
                        setWebZoom((current) =>
                          Math.min(1.2, current + 0.1),
                        )
                      }
                      type="button"
                    >
                      <MiniIcon name="plus" />
                    </button>
                    <button
                      aria-label="Center path web on current standing"
                      onClick={() => centerWebView()}
                      type="button"
                    >
                      <MiniIcon name="current" />
                    </button>
                  </div>
                </div>

                <div
                  className={styles.webViewport}
                  onPointerCancel={handleWebPointerEnd}
                  onPointerDown={handleWebPointerDown}
                  onPointerMove={handleWebPointerMove}
                  onPointerUp={handleWebPointerEnd}
                  ref={webViewportRef}
                  role="region"
                  tabIndex={0}
                >
                  <div
                    className={styles.webSizer}
                    style={{
                      height: webLayout.height * webZoom,
                      width: webLayout.width * webZoom,
                    }}
                  >
                    <div
                      className={styles.webCanvas}
                      style={{
                        height: webLayout.height,
                        transform: `scale(${webZoom})`,
                        width: webLayout.width,
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        className={styles.webConnections}
                        height={webLayout.height}
                        viewBox={`0 0 ${webLayout.width} ${webLayout.height}`}
                        width={webLayout.width}
                      >
                        <defs>
                          <marker
                            id="pathin-web-arrow"
                            markerHeight="8"
                            markerWidth="8"
                            orient="auto"
                            refX="6"
                            refY="3"
                            viewBox="0 0 7 6"
                          >
                            <path d="M0 0 7 3 0 6Z" />
                          </marker>
                        </defs>
                        {webLayout.connections.map((connection) => {
                          const sourceRadius =
                            connection.source.nodeId === "current" ? 59 : 52;
                          const targetRadius =
                            connection.target.nodeId === "current" ? 59 : 52;
                          const sourceY = connection.source.y + sourceRadius;
                          const targetY = connection.target.y - targetRadius;
                          const middleY =
                            (sourceY + targetY) / 2;
                          const curve = `M ${connection.source.x} ${sourceY} C ${connection.source.x} ${middleY}, ${connection.target.x} ${middleY}, ${connection.target.x} ${targetY}`;
                          return (
                            <path
                              d={curve}
                              key={connection.key}
                              markerEnd="url(#pathin-web-arrow)"
                            />
                          );
                        })}
                      </svg>

                      {webLayout.pathLabels.map((pathLabel) => (
                        <span
                          className={styles.webPathLabel}
                          data-route-label="true"
                          data-route-number={pathLabel.routeNumber}
                          key={pathLabel.id}
                          style={{
                            left: pathLabel.x,
                            top: pathLabel.y,
                          }}
                          title={pathLabel.label}
                        >
                          <small>
                            {mode === "explore"
                              ? `Career ${pathLabel.routeNumber}`
                              : `Route ${pathLabel.routeNumber}`}
                          </small>
                          <strong>
                            {nodeById.get(pathLabel.destinationId)?.label ??
                              "Career destination"}
                          </strong>
                          <span>{pathLabel.shortLabel}</span>
                        </span>
                      ))}

                      {webLayout.placements.map((placement) => {
                        const node = nodeById.get(placement.nodeId);
                        if (!node) {
                          return null;
                        }
                        return (
                          <button
                            aria-label={`${node.label}, ${node.eyebrow}. Open details.`}
                            className={styles.webNode}
                            data-kind={node.type}
                            data-selected={
                              selectedNode.id === node.id ? "true" : "false"
                            }
                            key={placement.key}
                            onClick={() =>
                              selectNode(node.id, true, placement.pathId)
                            }
                            style={{
                              left: placement.x - WEB_NODE_SIZE / 2,
                              top: placement.y - WEB_NODE_SIZE / 2,
                            }}
                            type="button"
                          >
                            <span>
                              <MiniIcon name={nodeIcon(node)} />
                            </span>
                            <strong>{node.label}</strong>
                            <small>{node.eyebrow}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className={styles.mapFooter}>
              <span>
                <MiniIcon name="info" />
                {viewMode === "focus"
                  ? "Up and down move one step. Left and right switch the focused route without losing your stage."
                  : "Drag or scroll the web, zoom as needed, and click any connected bubble."}
              </span>
              <span>
                Data refreshed {initialMap.source.fetchedAt.slice(0, 10)}
              </span>
            </div>
          </section>

          {lastDismissedNodeId ? (
            <div className={styles.undoBanner} role="status">
              <span>
                {nodeById.get(lastDismissedNodeId)?.label} was hidden from the
                scenario.
              </span>
              <button onClick={undoDismissal} type="button">
                Undo
              </button>
            </div>
          ) : null}

          <section className={styles.pathSummaryCard}>
            <div>
              <p className={styles.railEyebrow}>How to read this</p>
              <h2>
                {viewMode === "focus"
                  ? "Navigate both axes without losing your place"
                  : "See every active route together"}
              </h2>
            </div>
            <p>
              {viewMode === "focus"
                ? "Compact previews show what comes next above and what came before below. The side route cards move horizontally to a comparable step on another generated path."
                : "Profile evidence flows downward into your current standing, then each possible future continues through practical steps to a destination. Drag, scroll, zoom, and select any bubble to inspect the full route."}
            </p>
            <Link href="/" className={styles.backToFeed}>
              <MiniIcon name="arrow-left" />
              Back to feed
            </Link>
          </section>
        </main>

        <aside
          aria-label="Selected career step details"
          className={styles.detailPanel}
          data-open={detailsOpen ? "true" : "false"}
        >
          <div className={styles.detailHeader}>
            <div
              className={styles.detailHeaderCopy}
              data-motion={detailMotion}
              key={`detail-header-${selectedNode.id}`}
            >
              <p>{selectedNode.eyebrow}</p>
              <h2>{selectedNode.label}</h2>
              <span>{positionLabel}</span>
            </div>
            <button
              aria-label="Close details"
              className={styles.mobileClose}
              onClick={closeDetails}
              type="button"
            >
              <MiniIcon name="close" />
            </button>
          </div>

          <div className={styles.previousNext}>
            <button
              aria-label={
                previousFocusNode
                  ? `Move down to ${previousFocusNode.label}`
                  : "No earlier step"
              }
              data-direction="previous"
              data-active={
                focusTransition?.direction === "previous" &&
                focusTransition.phase === "exit"
                  ? "true"
                  : "false"
              }
              disabled={!previousFocusNode || isFocusTransitioning}
              onClick={() => navigate("previous", true)}
              type="button"
            >
              <MiniIcon name="arrow-down" />
              <span>
                <small>Down</small>
                <strong>
                  {previousFocusNode?.label ?? "Earlier step"}
                </strong>
              </span>
            </button>
            <button
              aria-label={
                nextFocusNode
                  ? `Move up to ${nextFocusNode.label}`
                  : "No later step"
              }
              data-direction="next"
              data-active={
                focusTransition?.direction === "next" &&
                focusTransition.phase === "exit"
                  ? "true"
                  : "false"
              }
              disabled={!nextFocusNode || isFocusTransitioning}
              onClick={() => navigate("next", true)}
              type="button"
            >
              <span>
                <small>Up</small>
                <strong>{nextFocusNode?.label ?? "Later step"}</strong>
              </span>
              <MiniIcon name="arrow-up" />
            </button>
          </div>

          <nav
            aria-label="Detail sections"
            className={styles.detailTabs}
          >
            {detailSections.map((section) => (
              <button
                aria-current={
                  detailSection === section.id ? "page" : undefined
                }
                key={section.id}
                onClick={() => setDetailSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className={styles.detailContent}>
            <div
              className={styles.detailContentMotion}
              data-motion={detailMotion}
              key={`detail-content-${selectedNode.id}`}
            >
              <NodeDetailSection
                activePaths={[focusPathForDetails]}
                edgeByKey={edgeByKey}
                node={selectedNode}
                nodeById={nodeById}
                onSelectNode={selectAndFocusNode}
                section={detailSection}
                source={initialMap.source}
              />
            </div>
          </div>

          {isProfileNode ? (
            <div className={styles.scaffoldDetailActions}>
              <span>
                <MiniIcon name="current" />
                Resume evidence used to establish your starting point.
              </span>
            </div>
          ) : (
            <div className={styles.detailActions}>
              <button
                aria-pressed={pinnedNodeIds.includes(selectedNode.id)}
                onClick={togglePinned}
                type="button"
              >
                <MiniIcon name="pin" />
                {pinnedNodeIds.includes(selectedNode.id)
                  ? "Unpin step"
                  : "Pin step"}
              </button>
              {selectedNode.type === "destination" ? (
                <>
                  <button onClick={buildSelectedDestination} type="button">
                    <MiniIcon name="destination" />
                    Build toward this
                  </button>
                </>
              ) : (
                <button onClick={requestAlternative} type="button">
                  <MiniIcon name="branch" />
                  Show alternative
                </button>
              )}
              <button onClick={dismissSelectedNode} type="button">
                <MiniIcon name="eye" />
                Not for me
              </button>
            </div>
          )}
        </aside>
      </div>

      {feedbackTarget ? (
        <div className={styles.feedbackBackdrop}>
          <section
            aria-labelledby="pathin-feedback-title"
            aria-modal="true"
            className={styles.feedbackDialog}
            role="dialog"
          >
            <div className={styles.feedbackHeading}>
              <div>
                <p>Recommendation feedback</p>
                <h2 id="pathin-feedback-title">What should PathIn review?</h2>
              </div>
              <button
                aria-label="Close feedback dialog"
                onClick={closeFeedback}
                ref={feedbackCloseRef}
                type="button"
              >
                <MiniIcon name="close" />
              </button>
            </div>
            <p className={styles.feedbackTarget}>
              Reporting: <strong>{feedbackTarget.label}</strong>
            </p>
            <div className={styles.feedbackChoices}>
              <button onClick={() => submitFeedback("helpful")} type="button">
                Helpful
              </button>
              <button
                onClick={() => submitFeedback("not_helpful")}
                type="button"
              >
                Not helpful
              </button>
              <button onClick={() => submitFeedback("incorrect")} type="button">
                Incorrect or misleading
              </button>
              <button onClick={() => submitFeedback("biased")} type="button">
                Biased or unsafe
              </button>
            </div>
            <p className={styles.feedbackPrivacy}>
              Feedback is submitted to the PathIn backend with the map and
              generation-version identifiers. It does not include raw PIT
              member histories.
            </p>
          </section>
        </div>
      ) : null}

      <p aria-live="polite" className={styles.srStatus}>
        {statusMessage}
      </p>
    </div>
  );
}

function CareerGoals({
  activeGoal,
  alternativeGoals,
  dreamCareer,
  onSelect,
}: {
  activeGoal: CareerGoalOption;
  alternativeGoals: CareerGoalOption[];
  dreamCareer?: DreamCareer;
  onSelect: (goal: CareerGoalOption) => void;
}) {
  const directionLabel = (goal: CareerGoalOption) => {
    const recommendation = goal.destination.recommendation;
    if (recommendation?.isDreamCareer) {
      return recommendation.aspirationSource === "user_selected"
        ? "User-selected North Star"
        : "North Star";
    }
    if (recommendation?.careerPosition === "ready_now") {
      return "Ready now";
    }
    if (recommendation?.careerPosition === "next_move") {
      return "Credible next move";
    }
    return "Longer-term option";
  };
  const activeRecommendation = activeGoal.destination.recommendation;

  return (
    <section aria-label="Career directions" className={styles.careerGoals}>
      <div className={styles.careerGoalsHeading}>
        <span>
          <MiniIcon name="destination" />
          Career directions
        </span>
        <small>
          Grounded in {dreamCareer?.sourceBlend ?? "your uploaded evidence"}
        </small>
      </div>

      <div className={styles.careerGoalAlternatives}>
        {alternativeGoals.map((goal) => (
          <button
            aria-label={`Switch to ${goal.destination.label} goal using ${goal.path.label}`}
            className={styles.careerGoalAlternative}
            key={goal.destination.id}
            onClick={() => onSelect(goal)}
            type="button"
          >
            <span>{directionLabel(goal)}</span>
            <strong>{goal.destination.label}</strong>
            {goal.destination.recommendation ? (
              <small>
                {goal.destination.recommendation.careerHorizon} ·{" "}
                {goal.destination.recommendation.canonicalRole}
              </small>
            ) : null}
          </button>
        ))}
      </div>

      <button
        aria-current="true"
        aria-label={`Focus selected goal ${activeGoal.destination.label}`}
        className={styles.careerGoalActive}
        onClick={() => onSelect(activeGoal)}
        type="button"
      >
        <span>
          <MiniIcon name="sparkles" />
          {directionLabel(activeGoal)}
        </span>
        <strong>{activeGoal.destination.label}</strong>
        <small>
          {activeRecommendation
            ? `${activeRecommendation.careerHorizon} · ${activeRecommendation.canonicalRole} · `
            : ""}
          {activeRecommendation?.sourceBlend ?? activeGoal.path.shortLabel}
        </small>
      </button>
    </section>
  );
}

function HorizontalRouteControl({
  active,
  activeRouteIndex,
  direction,
  disabled,
  mode,
  onSelect,
  option,
  routeCount,
}: {
  active: boolean;
  activeRouteIndex: number;
  direction: HorizontalDirection;
  disabled: boolean;
  mode: CareerMode;
  onSelect: (
    option: HorizontalRouteOption,
    direction: HorizontalDirection,
  ) => void;
  option: HorizontalRouteOption | null;
  routeCount: number;
}) {
  const isLeft = direction === "left";
  const noun = mode === "explore" ? "career" : "route";
  const boundaryLabel =
    routeCount <= 1
      ? `Only ${noun}`
      : isLeft
        ? `First ${noun}`
        : `Last ${noun}`;
  const accessibleLabel = option
    ? mode === "explore"
      ? `Switch ${direction} to ${option.destination.label} career at ${option.node.label}`
      : `Switch ${direction} to ${option.path.shortLabel} route at ${option.node.label}`
    : `${boundaryLabel}; no ${isLeft ? "previous" : "next"} ${noun}`;
  const primaryLabel =
    mode === "explore"
      ? option?.destination.label
      : option?.path.shortLabel;
  const secondaryLabel =
    mode === "explore"
      ? option
        ? `${option.path.shortLabel} · ${option.node.label}`
        : `${activeRouteIndex + 1} of ${routeCount}`
      : option?.node.label ?? `${activeRouteIndex + 1} of ${routeCount}`;

  return (
    <button
      aria-label={accessibleLabel}
      className={styles.horizontalRoute}
      data-active={active ? "true" : "false"}
      data-direction={direction}
      disabled={!option || disabled}
      onClick={() => (option ? onSelect(option, direction) : undefined)}
      type="button"
    >
      {isLeft ? <MiniIcon name="arrow-left" /> : null}
      <span className={styles.horizontalRouteCopy}>
        <span>
          {option
            ? `${isLeft ? "Previous" : "Next"} ${noun}`
            : boundaryLabel}
        </span>
        <strong>
          {primaryLabel ??
            `${mode === "explore" ? "Career" : "Route"} ${activeRouteIndex + 1}`}
        </strong>
        <small>{secondaryLabel}</small>
      </span>
      {!isLeft ? <MiniIcon name="arrow-right" /> : null}
    </button>
  );
}

function FocusPreview({
  distance,
  node,
  onSelect,
  relation,
}: {
  distance: 1 | 2;
  node: CareerNode;
  onSelect: (node: CareerNode) => void;
  relation: string;
}) {
  return (
    <button
      aria-label={`Focus ${node.label}, ${relation.toLowerCase()}`}
      className={styles.focusPreview}
      data-distance={distance}
      data-kind={node.type}
      onClick={() => onSelect(node)}
      type="button"
    >
      <span>{relation}</span>
      <strong>{node.label}</strong>
      <small>{node.stage}</small>
    </button>
  );
}

function FocusPreviewConnector({
  direction,
}: {
  direction: "future" | "history";
}) {
  return (
    <span className={styles.focusPreviewConnector} aria-hidden="true">
      <MiniIcon
        name={direction === "future" ? "arrow-up" : "arrow-down"}
      />
    </span>
  );
}

function NodeDetailSection({
  activePaths,
  edgeByKey,
  node,
  nodeById,
  onSelectNode,
  section,
  source,
}: {
  activePaths: CareerPath[];
  edgeByKey: Map<string, CareerEdge>;
  node: CareerNode;
  nodeById: Map<string, CareerNode>;
  onSelectNode: (nodeId: string) => void;
  section: DetailSection;
  source: CareerMapData["source"];
}) {
  const connections = useMemo(() => {
    const previous: Array<{ node: CareerNode; edge?: CareerEdge }> = [];
    const next: Array<{ node: CareerNode; edge?: CareerEdge }> = [];

    for (const path of activePaths) {
      const index = path.nodeIds.indexOf(node.id);
      if (index > 0) {
        const previousNode = nodeById.get(path.nodeIds[index - 1]);
        if (previousNode) {
          previous.push({
            node: previousNode,
            edge: edgeByKey.get(edgeKey(previousNode.id, node.id)),
          });
        }
      }
      if (index >= 0 && index < path.nodeIds.length - 1) {
        const nextNode = nodeById.get(path.nodeIds[index + 1]);
        if (nextNode) {
          next.push({
            node: nextNode,
            edge: edgeByKey.get(edgeKey(node.id, nextNode.id)),
          });
        }
      }
    }

    return {
      previous: Array.from(
        new Map(previous.map((item) => [item.node.id, item])).values(),
      ),
      next: Array.from(
        new Map(next.map((item) => [item.node.id, item])).values(),
      ),
    };
  }, [activePaths, edgeByKey, node.id, nodeById]);

  if (section === "fit") {
    return (
      <div className={styles.detailSection}>
        {node.recommendation ? (
          <>
            <div className={styles.recommendationSummary}>
              <span>
                <small>Weighted match</small>
                <strong>
                  {Math.round(node.recommendation.overallScore)}%
                </strong>
              </span>
              <span>
                <small>Confidence</small>
                <strong>{node.recommendation.confidence}</strong>
              </span>
              <span>
                <small>Transition</small>
                <strong>
                  {node.recommendation.transitionDifficulty}
                </strong>
              </span>
            </div>
            <p className={styles.recommendationExplanation}>
              {node.recommendation.explanation}
            </p>
          </>
        ) : null}
        <h3>Why it may fit</h3>
        <ul className={styles.checkList}>
          {node.whyItFits.slice(0, 2).map((reason) => (
            <li key={reason}>
              <MiniIcon name="check" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        {node.recommendation?.topMatchingSignals.length ? (
          <>
            <h3>Profile evidence used</h3>
            <div className={styles.profileEvidenceList}>
              {node.recommendation.topMatchingSignals
                .slice(0, 2)
                .map((signal) => (
                  <span key={`${signal.category}-${signal.value}`}>
                    <strong>{signal.value}</strong>
                    <small>{signal.category}</small>
                  </span>
                ))}
            </div>
          </>
        ) : null}
        <p className={styles.microNote}>
          {node.recommendation?.uncertainty ??
            "Possible match, not a hiring prediction."}
        </p>
      </div>
    );
  }

  if (section === "skills") {
    const skillsYouBring = [
      ...node.existingSkills,
      ...node.transferableSkills,
    ]
      .filter((skill, index, skills) => skills.indexOf(skill) === index)
      .slice(0, 4);

    return (
      <div className={styles.detailSection}>
        <SkillGroup
          label="You bring"
          skills={skillsYouBring}
        />
        <SkillGroup
          label="Build next"
          skills={node.skillsToBuild.slice(0, 3)}
          tone="amber"
        />
      </div>
    );
  }

  if (section === "connections") {
    return (
      <div className={styles.detailSection}>
        <ConnectionGroup
          items={connections.previous}
          label="Comes before"
          onSelectNode={onSelectNode}
        />
        <ConnectionGroup
          items={connections.next}
          label="Comes next"
          onSelectNode={onSelectNode}
        />
        {connections.previous.length === 0 ? (
          <p className={styles.emptyConnection}>
            This is the start of the visible route.
          </p>
        ) : null}
        {connections.next.length === 0 ? (
          <p className={styles.emptyConnection}>
            This is the end of the visible route.
          </p>
        ) : null}
      </div>
    );
  }

  if (section === "evidence") {
    return (
      <div className={styles.detailSection}>
        <div className={styles.evidenceHero}>
          <span>
            <strong>{source.cohortCount}</strong>
            privacy-screened PIT profiles
          </span>
          <span>
            <strong>{node.market?.postingCount ?? 0}</strong>
            related PIT postings
          </span>
        </div>
        <div className={styles.compactEvidence}>
          <small>Why it appears</small>
          <p>{node.whyItFits[0]}</p>
        </div>
        {node.recommendation ? (
          <>
            <h3>Top score factors</h3>
            <div className={styles.scoreBreakdown}>
              {Object.entries(
                node.recommendation.componentScores,
              )
                .sort(
                  ([, first], [, second]) =>
                    second.contribution - first.contribution,
                )
                .slice(0, 3)
                .map(([component, score]) => (
                  <span key={component}>
                    <small>
                      {component
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (value) => value.toUpperCase())}
                    </small>
                    <strong>{Math.round(score.score)}%</strong>
                  </span>
                ))}
            </div>
            <div className={styles.historyEvidence}>
              <small>Historical evidence</small>
              <strong>
                {node.recommendation.historicalEvidence.strength}
              </strong>
              <p>
                {node.recommendation.historicalEvidence.explanation}
              </p>
            </div>
          </>
        ) : null}
        {node.market ? (
          <p className={styles.microNote}>
            PIT listed range: {formatCurrency(node.market.averageSalaryFrom)}
            {" – "}
            {formatCurrency(node.market.averageSalaryTo)}. Demo data only.
          </p>
        ) : null}
      </div>
    );
  }

  const overviewSkills = [
    ...node.transferableSkills,
    ...node.existingSkills,
  ]
    .filter((skill, index, skills) => skills.indexOf(skill) === index)
    .slice(0, 3);
  const overviewFacts = node.recommendation
    ? [
        ["Timeline", node.stage],
        ["Base role", node.recommendation.canonicalRole],
        [
          "Build next",
          node.recommendation.gaps[0] ?? "Role-specific proof",
        ],
      ]
    : node.stepDetails
      ? [
          ["Builds", node.stepDetails.gapAddressed],
          ["Time", node.stepDetails.effort],
          ["Proof", node.stepDetails.completionEvidence],
        ]
      : [
          ["Stage", node.stage],
          ["Start with", node.responsibilities[0]],
        ];

  return (
    <div className={styles.detailSection}>
      {overviewSkills.length ? (
        <div className={styles.overviewSignals}>
          <small>
            {node.recommendation ? "Already in your profile" : "Uses"}
          </small>
          <div>
            {overviewSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.detailQuickFacts}>
        {overviewFacts.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillGroup({
  label,
  skills,
  tone = "green",
}: {
  label: string;
  skills: string[];
  tone?: "green" | "blue" | "amber";
}) {
  return (
    <section className={styles.skillGroup}>
      <h3>{label}</h3>
      <div className={styles.skillPills} data-tone={tone}>
        {skills.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
    </section>
  );
}

function ConnectionGroup({
  items,
  label,
  onSelectNode,
}: {
  items: Array<{ node: CareerNode; edge?: CareerEdge }>;
  label: string;
  onSelectNode: (nodeId: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={styles.connectionGroup}>
      <h3>{label}</h3>
      {items.map(({ node, edge }) => (
        <button
          key={node.id}
          onClick={() => onSelectNode(node.id)}
          type="button"
        >
          <span className={styles.connectionIcon}>
            <MiniIcon name={nodeIcon(node)} />
          </span>
          <span>
            <small>{node.eyebrow}</small>
            <strong>{node.label}</strong>
            <em>
              {edge?.explanation ??
                "Open this step to inspect the route connection."}
            </em>
          </span>
          <MiniIcon name="arrow-right" />
        </button>
      ))}
    </section>
  );
}
