import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CareerTree } from "./career-tree";

function jsonResponse(
  payload: unknown,
  {
    ok = true,
    status = 200,
  }: {
    ok?: boolean;
    status?: number;
  } = {},
): Response {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response;
}

function parsedResumeResponse() {
  return {
    file: {
      displayName: "resume.txt",
      format: "txt",
      sizeBytes: 128,
      sha256: "test-resume",
      retention: "memory-only",
    },
    fields: {
      roles: [
        {
          id: "role-1",
          value: "Product design intern",
          source: "resume",
          confidence: 0.98,
          explicit: true,
          enabled: true,
        },
      ],
      skills: [
        {
          id: "skill-1",
          value: "User research",
          source: "resume",
          confidence: 0.96,
          explicit: true,
          enabled: true,
        },
      ],
    },
    summary: {
      characterCount: 128,
      fieldCount: 2,
      explicitFactCount: 2,
      inferredSkillCount: 0,
    },
    warnings: [],
  };
}

function parsedLinkedinResponse() {
  return {
    file: {
      displayName: "linkedin-profile.txt",
      format: "txt",
      sizeBytes: 156,
      sha256: "test-linkedin",
      retention: "memory-only",
    },
    fields: {
      roles: [
        {
          id: "linkedin-role-1",
          value: "Software engineering intern",
          source: "linkedin",
          confidence: 0.96,
          explicit: true,
          enabled: true,
        },
      ],
      skills: [
        {
          id: "linkedin-skill-1",
          value: "React",
          source: "linkedin",
          confidence: 0.94,
          explicit: true,
          enabled: true,
        },
      ],
    },
    summary: {
      characterCount: 156,
      fieldCount: 2,
      explicitFactCount: 2,
      inferredSkillCount: 0,
    },
    warnings: [],
  };
}

function currentProfileResponse() {
  return {
    id: "winstoniskandar",
    name: "Winston Iskandar",
    headline: "Similate, Inc. (SR007) | CS/Math @ Stanford",
    profilePhoto: "/linkedin/profile.png",
    pathinEvidence: {
      fields: {
        roles: [
          {
            id: "profile-role-1",
            value: "CEO at Similate",
            source: "linkedin",
            confidence: 0.99,
            explicit: true,
            enabled: true,
            importBatch: "authorized-profile",
          },
        ],
        skills: [
          {
            id: "profile-skill-1",
            value: "Software Development",
            source: "linkedin",
            confidence: 0.99,
            explicit: true,
            enabled: true,
            importBatch: "authorized-profile",
          },
        ],
      },
      enabledCategories: {
        roles: true,
        skills: true,
      },
      source: "linkedin",
      sourceLabel: "User-authorized LinkedIn-style profile",
      privacy: "Only enabled categories are used.",
    },
  };
}

describe("CareerTree evidence-first onboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows only onboarding controls before generation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(currentProfileResponse())),
    );
    render(<CareerTree />);

    expect(
      screen.getByRole("heading", { name: "Build your career path" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Generate from your connected profile. Add a resume for stronger, more personalized recommendations.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Winston Iskandar")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload resume")).toHaveAttribute(
      "type",
      "file",
    );
    expect(
      screen.getByLabelText("Upload LinkedIn profile export"),
    ).toHaveAttribute("type", "file");
    expect(
      screen.getByRole("button", { name: "Generate career path" }),
    ).toBeEnabled();

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
    expect(document.querySelectorAll("input")).toHaveLength(2);
    expect(
      screen.queryByText("Review LinkedIn-style profile information"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Review and correct imported information"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Possible career goals")).not.toBeInTheDocument();
  });

  it("rejects an unsupported resume without blocking the connected profile", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(currentProfileResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);
    await screen.findByText("Winston Iskandar");

    const file = new File(["resume"], "resume.rtf", {
      type: "text/rtf",
    });
    fireEvent.change(screen.getByLabelText("Upload resume"), {
      target: { files: [file] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a PDF, DOCX, or TXT resume.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/profiles/current");
    expect(
      screen.getByRole("button", { name: "Generate career path" }),
    ).toBeEnabled();
  });

  it("generates from the connected profile without requiring a resume", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(currentProfileResponse()))
      .mockResolvedValueOnce(jsonResponse({ id: "normalized-profile" }))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);

    await screen.findByText("Winston Iskandar");
    expect(screen.queryByText("Resume ready")).not.toBeInTheDocument();

    const generate = screen.getByRole("button", {
      name: "Generate career path",
    });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);

    expect(
      await screen.findByRole("heading", {
        name: "Reading your experience",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Creating recommendations from your LinkedIn profile",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const normalizeBody = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body),
    ) as {
      profile: {
        fields: {
          roles: Array<{ source: string }>;
          skills: Array<{ source: string }>;
        };
      };
    };
    expect(normalizeBody.profile.fields.roles.map((field) => field.source))
      .toEqual(["linkedin"]);
    expect(normalizeBody.profile.fields.skills.map((field) => field.source))
      .toEqual(["linkedin"]);
  });

  it("replaces the dropzone with a compact file row after parsing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(currentProfileResponse()))
      .mockResolvedValueOnce(jsonResponse(parsedResumeResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);

    const file = new File(["resume content"], "resume.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Upload resume"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("resume.txt")).toBeInTheDocument();
    expect(
      screen.getByText(`${file.size} B · Resume ready`),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove resume.txt" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate career path" }),
    ).toBeEnabled();
    expect(screen.queryByText("Drag and drop here, or choose a file"))
      .not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the concise loading state after generation starts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(currentProfileResponse()))
      .mockResolvedValueOnce(jsonResponse(parsedResumeResponse()))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);

    const file = new File(["resume content"], "resume.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Upload resume"), {
      target: { files: [file] },
    });

    const generate = screen.getByRole("button", {
      name: "Generate career path",
    });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    expect(
      await screen.findByRole("heading", {
        name: "Reading your experience",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Creating recommendations from your resume and LinkedIn evidence",
    );
    expect(
      screen.queryByLabelText("Upload LinkedIn profile export"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Upload resume")).not.toBeInTheDocument();
  });

  it("merges resume and LinkedIn provenance before generation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(currentProfileResponse()))
      .mockResolvedValueOnce(jsonResponse(parsedResumeResponse()))
      .mockResolvedValueOnce(jsonResponse(parsedLinkedinResponse()))
      .mockResolvedValueOnce(jsonResponse({ id: "normalized-profile" }))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);

    fireEvent.change(screen.getByLabelText("Upload resume"), {
      target: {
        files: [
          new File(["resume content"], "resume.txt", {
            type: "text/plain",
          }),
        ],
      },
    });
    await screen.findByText("resume.txt");

    fireEvent.change(screen.getByLabelText("Upload LinkedIn profile export"), {
      target: {
        files: [
          new File(["linkedin content"], "linkedin-profile.txt", {
            type: "text/plain",
          }),
        ],
      },
    });
    await screen.findByText("linkedin-profile.txt");

    const generate = screen.getByRole("button", {
      name: "Generate career path",
    });
    fireEvent.click(generate);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

    const resumeBody = fetchMock.mock.calls[1][1]?.body as FormData;
    const linkedinBody = fetchMock.mock.calls[2][1]?.body as FormData;
    expect(resumeBody.get("source")).toBe("resume");
    expect(linkedinBody.get("source")).toBe("linkedin");

    const normalizeBody = JSON.parse(
      String(fetchMock.mock.calls[3][1]?.body),
    ) as {
      profile: {
        fields: {
          roles: Array<{ source: string }>;
          skills: Array<{ source: string }>;
        };
      };
    };
    expect(normalizeBody.profile.fields.roles.map((field) => field.source))
      .toEqual(["resume", "linkedin", "linkedin"]);
    expect(normalizeBody.profile.fields.skills.map((field) => field.source))
      .toEqual(["resume", "linkedin", "linkedin"]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Creating recommendations from your resume and LinkedIn evidence",
    );
  });

  it("keeps the parsed resume when backend generation fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(currentProfileResponse()))
      .mockResolvedValueOnce(jsonResponse(parsedResumeResponse()))
      .mockResolvedValueOnce(jsonResponse({ id: "normalized-profile" }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "GENERATION_FAILED",
              message: "The recommendation service is temporarily unavailable.",
              retryable: true,
              details: {},
            },
          },
          { ok: false, status: 503 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);

    const file = new File(["resume content"], "resume.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Upload resume"), {
      target: { files: [file] },
    });

    const generate = screen.getByRole("button", {
      name: "Generate career path",
    });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    expect(
      await screen.findByText(
        "The recommendation service is temporarily unavailable.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("resume.txt")).toBeInTheDocument();
    expect(generate).toBeEnabled();
    expect(screen.queryByText("Possible career goals")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("removes connected-profile evidence from the backend request when disabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(currentProfileResponse()))
      .mockResolvedValueOnce(jsonResponse(parsedResumeResponse()))
      .mockResolvedValueOnce(jsonResponse({ id: "normalized-profile" }))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    render(<CareerTree />);

    const profileToggle = await screen.findByRole("button", {
      name: "Using profile",
    });
    fireEvent.click(profileToggle);
    expect(
      screen.getByRole("button", { name: "Use profile" }),
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.change(screen.getByLabelText("Upload resume"), {
      target: {
        files: [
          new File(["resume content"], "resume.txt", {
            type: "text/plain",
          }),
        ],
      },
    });
    await screen.findByText("resume.txt");
    fireEvent.click(
      screen.getByRole("button", { name: "Generate career path" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    const normalizeBody = JSON.parse(
      String(fetchMock.mock.calls[2][1]?.body),
    ) as {
      profile: {
        fields: {
          roles: Array<{ source: string }>;
          skills: Array<{ source: string }>;
        };
      };
    };
    expect(normalizeBody.profile.fields.roles.map((field) => field.source))
      .toEqual(["resume"]);
    expect(normalizeBody.profile.fields.skills.map((field) => field.source))
      .toEqual(["resume"]);
  });
});
