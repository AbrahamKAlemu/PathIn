import { describe, expect, it } from "vitest";

import type { QuizProfile } from "@/features/quiz/types";

import {
  readSimulationProfile,
  simulationProfileToFields,
  writeSimulationProfile,
} from "./sim-to-profile";

function profile(generatedAt = new Date().toISOString()): QuizProfile {
  return {
    schema_version: 1,
    generated_at: generatedAt,
    best_fit: {
      industry: "Technology",
      role: "Software Engineer",
      role_id: "software-engineer",
      readiness: "gain-experience",
      why: "The scenario showed structured problem solving.",
      confidence: "high",
      fit_score: 82,
    },
    strengths: ["structured problem solving", "testing edge cases"],
    gaps: ["build a reviewable software project"],
    roles_explored: [
      {
        role_id: "software-engineer",
        role: "Software Engineer",
        industry: "Technology",
        sessions_seen: 1,
        fit_score: 82,
        last_rating: 8,
        last_skip_count: 0,
        confidence: "high",
      },
    ],
  };
}

describe("career simulation evidence", () => {
  it("stores valid results and converts them into optional inferred fields", () => {
    writeSimulationProfile(profile());

    const stored = readSimulationProfile();
    expect(stored?.best_fit.role).toBe("Software Engineer");

    const fields = simulationProfileToFields(stored);
    expect(fields.interests?.[0]).toMatchObject({
      value: "Software Engineer",
      source: "inferred",
      explicit: false,
      importBatch: "career-simulation",
    });
    expect(fields.skills?.map((field) => field.value)).toEqual([
      "structured problem solving",
      "testing edge cases",
    ]);
  });

  it("ignores simulation profiles older than 30 days", () => {
    writeSimulationProfile(profile("2025-01-01T00:00:00.000Z"));
    expect(readSimulationProfile()).toBeNull();
  });
});
