// ============================================================================
// NEW FILE: src/features/pathin/sim-to-profile.ts
// Converts the career-sim's stored profile (from localStorage) into profile
// fields the existing recommendation engine understands. This is what merges
// the two halves: sim signals become engine input, combined with resume/Winston.
// ============================================================================

import type { ParsedProfileField, ProfileCategory } from "./types";

const SIM_PROFILE_KEY = "pathin.quiz.profile";

// The synthesizer stores roughly this shape (see backend synthesizer prompt).
type SimProfile = {
  best_fit?: {
    industry?: string;
    role?: string;
    readiness?: string;
    why?: string;
  };
  strengths?: string[];
  gaps?: string[];
};

function field(
  category: string,
  value: string,
  confidence: number,
): ParsedProfileField {
  return {
    id: `sim-${category}-${value}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    value,
    source: "inferred",
    confidence,
    explicit: false,
    enabled: true,
    evidence: "From your career simulation",
  };
}

// Read sim results from localStorage. Returns null if the user hasn't played.
export function readSimProfile(): SimProfile | null {
  try {
    const stored = window.localStorage.getItem(SIM_PROFILE_KEY);
    return stored ? (JSON.parse(stored) as SimProfile) : null;
  } catch {
    return null;
  }
}

export function clearSimProfile(): void {
  window.localStorage.removeItem(SIM_PROFILE_KEY);
}

// Convert sim signals into engine profile fields. Empty object if no sim data,
// which makes the merge a no-op and the engine falls back to resume/Winston.
export function simProfileToFields(): Partial<
  Record<ProfileCategory, ParsedProfileField[]>
> {
  const sim = readSimProfile();
  if (!sim?.best_fit) return {};

  const fields: Partial<Record<ProfileCategory, ParsedProfileField[]>> = {};

  if (sim.best_fit.industry) {
    fields.industries = [field("industries", sim.best_fit.industry, 0.8)];
  }
  if (sim.best_fit.role) {
    fields.interests = [field("interests", sim.best_fit.role, 0.85)];
    fields.goals = [
      field("goals", `Explore a path toward ${sim.best_fit.role}`, 0.8),
    ];
  }
  if (sim.strengths?.length) {
    fields.skills = sim.strengths.map((s) => field("skills", s, 0.7));
  }

  return fields;
}
