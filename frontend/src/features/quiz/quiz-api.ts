import type {
  Role,
  Scenario,
  ScenarioResponse,
  SuggestionResult,
  QuizUserProfile,
  QuizProfile,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:5000";

export class QuizApiError extends Error {
  code: string;
  details: Record<string, unknown>;
  constructor(
    message: string,
    { code = "REQUEST_FAILED", details = {} }: {
      code?: string;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "QuizApiError";
    this.code = code;
    this.details = details;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string; details?: Record<string, unknown> };
  };
  if (!response.ok) {
    throw new QuizApiError(
      payload.error?.message ?? "The career quiz request could not be completed.",
      { code: payload.error?.code, details: payload.error?.details },
    );
  }
  return payload as T;
}

export async function fetchRoles(): Promise<{ roles: Role[] }> {
  const response = await fetch(`${API_URL}/api/v1/quiz/roles`);
  return parseResponse(response);
}

export async function fetchScenario(roleId: string): Promise<{ scenario: Scenario }> {
  const response = await fetch(
    `${API_URL}/api/v1/quiz/scenarios/${encodeURIComponent(roleId)}`,
  );
  return parseResponse(response);
}

export async function generateSuggestions(input: {
  profile: QuizProfile | null;
  user_profile: QuizUserProfile;
  new_responses: ScenarioResponse[];
}): Promise<SuggestionResult> {
  const response = await fetch(`${API_URL}/api/v1/quiz/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}
