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

async function uploadProfileText(
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

async function fileSha256(file: File) {
  if (
    !globalThis.crypto?.subtle ||
    typeof file.arrayBuffer !== "function"
  ) {
    return "";
  }
  try {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

async function parseProfileImage(
  file: File,
  source: "resume" | "linkedin",
): Promise<ParsedProfile> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  let text = "";
  try {
    const result = await worker.recognize(file);
    text = result.data.text.trim();
  } catch {
    throw new PathInApiError(
      "PathIn could not read text from this screenshot. Try a clearer image or upload PDF, DOCX, or TXT.",
      { code: "UNREADABLE_IMAGE" },
    );
  } finally {
    await worker.terminate();
  }

  if (text.length < 20 || text.replace(/\W/g, "").length < 10) {
    throw new PathInApiError(
      "No usable resume text was found in this screenshot. Try a higher-resolution image.",
      { code: "NO_READABLE_TEXT" },
    );
  }

  const stem = file.name.replace(/\.[^.]+$/, "") || "resume-screenshot";
  const parsed = await uploadProfileText(
    new File([text], `${stem}.txt`, { type: "text/plain" }),
    source,
  );
  const extension = file.name.split(".").pop()?.toLowerCase();
  return {
    ...parsed,
    file: {
      ...parsed.file,
      displayName: file.name,
      format: extension === "png" ? "png" : "jpeg",
      sizeBytes: file.size,
      sha256: (await fileSha256(file)) || parsed.file.sha256,
      retention:
        "OCR was performed in your browser; extracted text was processed in memory and not permanently stored.",
    },
  };
}

export async function parseProfileFile(
  file: File,
  source: "resume" | "linkedin",
): Promise<ParsedProfile> {
  if (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    /\.(png|jpe?g)$/i.test(file.name)
  ) {
    return parseProfileImage(file, source);
  }
  return uploadProfileText(file, source);
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
