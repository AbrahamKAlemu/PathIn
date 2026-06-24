import type { CurrentProfile, CurrentProfilePatch } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:5000";

async function parseProfileResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as
    | CurrentProfile
    | {
        error?: {
          message?: string;
        };
      };
  if (!response.ok) {
    const errorPayload = payload as {
      error?: {
        message?: string;
      };
    };
    throw new Error(
      errorPayload.error?.message ?? "PathIn could not load this profile.",
    );
  }
  return payload as CurrentProfile;
}

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const response = await fetch(`${API_URL}/api/v1/profiles/current`, {
    cache: "no-store",
  });
  return parseProfileResponse(response);
}

export async function updateCurrentProfile(
  profile: CurrentProfilePatch,
): Promise<CurrentProfile> {
  const response = await fetch(`${API_URL}/api/v1/profiles/current`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile }),
  });
  return parseProfileResponse(response);
}
