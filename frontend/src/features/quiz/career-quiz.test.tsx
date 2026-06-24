import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CareerQuiz } from "./career-quiz";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response;
}

const scenario = {
  role_id: "software-engineer",
  role: "Software Engineer",
  industry: "Technology",
  shape: "building",
  setup: "Your mentor opens a problem.",
  opener: "How would you find the matching pair?",
  skip_offer: "You can skip if this is not your thing.",
  follow_ups: [
    "What would you check first?",
    "What about duplicate values?",
    "What changes for a huge list?",
    "Where could the approach fail?",
    "How would you test it?",
  ],
  closer_reflection: "How did the work feel?",
  closer_rating: "How much did you enjoy it?",
};

const connectedProfile = {
  name: "Winston Iskandar",
  headline: "CS/Math @ Stanford",
  location: "United States",
  education: [
    {
      school: "Stanford University",
      degree: "Computer Science and Mathematics",
    },
  ],
  experience: [
    {
      title: "Founder",
      company: "Similate",
      description: ["Built software products"],
    },
  ],
  skills: [{ name: "Python" }, { name: "JavaScript" }],
  careerInterests: ["Software engineering"],
  industries: ["Technology"],
  careerGoals: ["Build useful software"],
  projects: ["MIDI Coder"],
};

describe("CareerQuiz", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("combines a scenario response with the connected profile", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/quiz/roles")) {
        return Promise.resolve(
          jsonResponse({
            roles: [
              {
                role_id: "software-engineer",
                role: "Software Engineer",
                industry: "Technology",
                shape: "building",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/api/v1/profiles/current")) {
        return Promise.resolve(jsonResponse(connectedProfile));
      }
      if (url.endsWith("/api/v1/quiz/scenarios/software-engineer")) {
        return Promise.resolve(jsonResponse({ scenario }));
      }
      if (url.endsWith("/api/v1/quiz/suggestions")) {
        return Promise.resolve(
          jsonResponse({
            direction: {
              industry: "Technology",
              role: "Software Engineer",
              role_id: "software-engineer",
              readiness: "gain-experience",
              why: "You rated the work 8/10 and tested edge cases.",
              fit_score: 82,
              fit_label: "strong fit",
              confidence: "high",
              strengths: ["testing edge cases"],
              gaps: ["build a reviewable software project"],
            },
            actions: [],
            profile: {
              schema_version: 1,
              generated_at: new Date().toISOString(),
              best_fit: {
                industry: "Technology",
                role: "Software Engineer",
                role_id: "software-engineer",
                readiness: "gain-experience",
                why: "Strong current signal",
                confidence: "high",
                fit_score: 82,
              },
              strengths: ["testing edge cases"],
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
            },
            analysis_mode: "rules",
          }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CareerQuiz />);

    expect(
      await screen.findByText("Connected profile included"),
    ).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: /Software Engineer/ }),
    );

    for (let index = 0; index < 7; index += 1) {
      const input = await screen.findByLabelText("Your response");
      fireEvent.change(input, {
        target: {
          value:
            "I would use a hash set, check duplicate values, and test edge cases.",
        },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    }

    fireEvent.change(screen.getByLabelText("Enjoyment rating"), {
      target: { value: "8" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "See what this suggests" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Software Engineer" }),
    ).toBeInTheDocument();
    const suggestionCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/v1/quiz/suggestions"),
    );
    expect(suggestionCall).toBeDefined();
    const request = JSON.parse(
      String((suggestionCall?.[1] as RequestInit).body),
    );
    expect(request.user_profile).toMatchObject({
      name: "Winston Iskandar",
      stage: "college",
      skills: ["Python", "JavaScript"],
    });
    expect(request.new_responses[0]).toMatchObject({
      role_id: "software-engineer",
      rating: 8,
      skip_count: 0,
    });
    await waitFor(() =>
      expect(window.localStorage.getItem("pathin.quiz.profile")).toContain(
        "software-engineer",
      ),
    );
  });
});
