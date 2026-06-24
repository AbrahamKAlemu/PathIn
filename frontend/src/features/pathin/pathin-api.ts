import type {
  CareerMapData,
  NormalizedProfile,
  ParsedProfile,
  ProfileSubmission,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:5000";

export class PathInApiError extends Error {
  code: string;
  details: Record<string, unknown>;
  retryable: boolean;

  constructor(
    message: string,
    {
      code = "REQUEST_FAILED",
      details = {},
      retryable = false,
    }: {
      code?: string;
      details?: Record<string, unknown>;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "PathInApiError";
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: {
      code?: string;
      message?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    };
  };
  if (!response.ok) {
    throw new PathInApiError(
      payload.error?.message ??
        "PathIn could not complete this request.",
      {
        code: payload.error?.code,
        details: payload.error?.details,
        retryable: payload.error?.retryable,
      },
    );
  }
  return payload as T;
}

export async function parseProfileFile(
  file: File,
  source: "resume" | "linkedin",
): Promise<ParsedProfile> {
  const body = new FormData();
  body.append("file", file);
  body.append("source", source);
  const response = await fetch(`${API_URL}/api/v1/resumes/parse`, {
    method: "POST",
    body,
  });
  return parseResponse<ParsedProfile>(response);
}

export async function normalizeProfile(
  profile: ProfileSubmission,
): Promise<NormalizedProfile> {
  const response = await fetch(`${API_URL}/api/v1/profiles/normalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile }),
  });
  return parseResponse<NormalizedProfile>(response);
}

export async function generateCareerMap(
  profile: ProfileSubmission | NormalizedProfile,
): Promise<CareerMapData> {
  const response = await fetch(`${API_URL}/api/v1/maps/explore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile,
      resultCount: 4,
    }),
  });
  return parseResponse<CareerMapData>(response);
}

export async function buildCareerMap(
  profile: ProfileSubmission | NormalizedProfile,
  destinationId: string,
): Promise<CareerMapData> {
  const response = await fetch(`${API_URL}/api/v1/maps/build`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile,
      destinationId,
    }),
  });
  return parseResponse<CareerMapData>(response);
}

export type RegenerationAction =
  | "regenerate"
  | "not_for_me"
  | "more_like_this"
  | "something_different"
  | "alternative_route";

export async function regenerateCareerMap(
  mapId: string,
  {
    profile,
    action = "regenerate",
    targetId,
    pinnedNodeIds,
    dismissedNodeIds,
  }: {
    profile: ProfileSubmission | NormalizedProfile;
    action?: RegenerationAction;
    targetId?: string;
    pinnedNodeIds?: string[];
    dismissedNodeIds?: string[];
  },
): Promise<CareerMapData> {
  const response = await fetch(
    `${API_URL}/api/v1/maps/${encodeURIComponent(mapId)}/regenerate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile,
        action,
        targetId,
        pinnedNodeIds,
        dismissedNodeIds,
      }),
    },
  );
  return parseResponse<CareerMapData>(response);
}

export async function saveCareerMap(
  mapId: string,
  {
    pinnedNodeIds,
    dismissedNodeIds,
  }: {
    pinnedNodeIds: string[];
    dismissedNodeIds: string[];
  },
): Promise<CareerMapData> {
  const response = await fetch(
    `${API_URL}/api/v1/maps/${encodeURIComponent(mapId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinnedNodeIds,
        dismissedNodeIds,
      }),
    },
  );
  return parseResponse<CareerMapData>(response);
}

export async function reopenCareerMap(mapId: string): Promise<CareerMapData> {
  const response = await fetch(
    `${API_URL}/api/v1/maps/${encodeURIComponent(mapId)}`,
  );
  return parseResponse<CareerMapData>(response);
}

export async function submitCareerFeedback(
  mapId: string,
  {
    target,
    category,
    comment = "",
  }: {
    target: { id: string; label: string; type: "node" | "edge" };
    category: string;
    comment?: string;
  },
): Promise<{ accepted: boolean; feedbackId: string; message: string }> {
  const response = await fetch(
    `${API_URL}/api/v1/maps/${encodeURIComponent(mapId)}/feedback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        category,
        comment,
      }),
    },
  );
  return parseResponse<{
    accepted: boolean;
    feedbackId: string;
    message: string;
  }>(response);
}
