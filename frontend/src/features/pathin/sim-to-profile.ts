import type { QuizProfile } from "@/features/quiz/types";

import type { ParsedProfileField, ProfileCategory } from "./types";

export const SIMULATION_PROFILE_KEY = "pathin.quiz.profile";
const MAX_PROFILE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function isQuizProfile(value: unknown): value is QuizProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const profile = value as Partial<QuizProfile>;
  return Boolean(
    profile.best_fit?.role &&
      profile.best_fit?.industry &&
      Array.isArray(profile.strengths) &&
      Array.isArray(profile.gaps) &&
      Array.isArray(profile.roles_explored),
  );
}

export function readSimulationProfile(): QuizProfile | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(SIMULATION_PROFILE_KEY);
    if (!stored) {
      return null;
    }
    const profile = JSON.parse(stored) as unknown;
    if (!isQuizProfile(profile)) {
      return null;
    }
    const generatedAt = Date.parse(profile.generated_at);
    if (
      Number.isFinite(generatedAt) &&
      Date.now() - generatedAt > MAX_PROFILE_AGE_MS
    ) {
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

export function writeSimulationProfile(profile: QuizProfile): void {
  window.localStorage.setItem(
    SIMULATION_PROFILE_KEY,
    JSON.stringify(profile),
  );
}

export function clearSimulationProfile(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SIMULATION_PROFILE_KEY);
  }
}

function field(
  category: ProfileCategory,
  value: string,
  confidence: number,
  evidence: string,
): ParsedProfileField {
  return {
    id: `simulation-${category}-${value}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    value,
    source: "inferred",
    confidence,
    explicit: false,
    enabled: true,
    evidence,
    originalSource: "career_simulation",
    importBatch: "career-simulation",
  };
}

export function simulationProfileToFields(
  profile: QuizProfile | null = readSimulationProfile(),
): Partial<Record<ProfileCategory, ParsedProfileField[]>> {
  if (!profile) {
    return {};
  }

  const role = profile.best_fit.role;
  const evidence = `Career simulation result for ${role}`;
  return {
    industries: [
      field(
        "industries",
        profile.best_fit.industry,
        0.68,
        evidence,
      ),
    ],
    interests: [field("interests", role, 0.74, evidence)],
    goals: [
      field(
        "goals",
        `Explore work related to ${role}`,
        0.68,
        evidence,
      ),
    ],
    skills: profile.strengths.slice(0, 6).map((strength) =>
      field(
        "skills",
        strength,
        0.62,
        `${evidence}; inferred from scenario responses`,
      ),
    ),
  };
}
