import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CURRENT_PROFILE } from "./profile-data";
import { ProfilePage } from "./profile-page";

function jsonResponse(payload: unknown, ok = true): Response {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Winston's supplied profile sections and opens contact info", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(DEFAULT_CURRENT_PROFILE)),
    );

    render(<ProfilePage />);

    expect(
      screen.getByRole("heading", { name: "Winston Iskandar" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Similate, Inc. (SR007) | CS/Math @ Stanford"),
    ).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Experience" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Education" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Skills (25)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Honors & awards (7)" }),
    ).toBeInTheDocument();
    const dataControlsButton = screen.getByRole("button", {
      name: "Review data controls",
    });
    expect(dataControlsButton).toHaveAttribute("type", "button");
    fireEvent.click(dataControlsButton);
    expect(
      screen.getByRole("dialog", {
        name: "Edit profile and PathIn data",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(
      screen.getByRole("link", { name: "Explore career paths" }),
    ).toHaveAttribute("href", "/career-tree");

    fireEvent.click(screen.getByRole("button", { name: "Contact info" }));
    expect(
      screen.getByRole("dialog", { name: "Contact info" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("www.linkedin.com/in/winstoniskandar"),
    ).toHaveLength(2);
    expect(
      screen.getByText(/does not request LinkedIn credentials/i),
    ).toBeInTheDocument();
  });

  it("saves edited identity and PathIn category controls through Flask", async () => {
    const updated = {
      ...DEFAULT_CURRENT_PROFILE,
      headline: "Founder | CS/Math @ Stanford",
      enabledCategories: {
        ...DEFAULT_CURRENT_PROFILE.enabledCategories,
        skills: false,
      },
      pathinEvidence: {
        ...DEFAULT_CURRENT_PROFILE.pathinEvidence,
        enabledCategories: {
          ...DEFAULT_CURRENT_PROFILE.pathinEvidence.enabledCategories,
          skills: false,
        },
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEFAULT_CURRENT_PROFILE))
      .mockResolvedValueOnce(jsonResponse(updated));
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilePage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Edit profile introduction" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Edit profile and PathIn data",
    });
    fireEvent.change(within(dialog).getByLabelText("Headline"), {
      target: { value: "Founder | CS/Math @ Stanford" },
    });
    fireEvent.click(within(dialog).getByLabelText("Skills"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const patchBody = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body),
    ) as {
      profile: {
        headline: string;
        enabledCategories: Record<string, boolean>;
      };
    };
    expect(patchBody.profile.headline).toBe(
      "Founder | CS/Math @ Stanford",
    );
    expect(patchBody.profile.enabledCategories.skills).toBe(false);
    expect(
      await screen.findByText("Profile changes saved and available to PathIn."),
    ).toBeInTheDocument();
  });

  it("does not fabricate the hidden skill and award names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(DEFAULT_CURRENT_PROFILE)),
    );
    render(<ProfilePage />);

    const skillsSection = screen
      .getByRole("heading", { name: "Skills (25)" })
      .closest("section");
    expect(skillsSection).not.toBeNull();
    fireEvent.click(
      within(skillsSection as HTMLElement).getByRole("button", {
        name: "Show all",
      }),
    );
    expect(
      screen.getByText(/only 2 names were supplied/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    const honorsSection = screen
      .getByRole("heading", { name: "Honors & awards (7)" })
      .closest("section");
    expect(honorsSection).not.toBeNull();
    fireEvent.click(
      within(honorsSection as HTMLElement).getByRole("button", {
        name: "Show all 7 honors & awards",
      }),
    );
    expect(
      screen.getByText(/only 2 were supplied/i),
    ).toBeInTheDocument();
  });
});
