import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCareerMap } from "./career-map-data";
import { CareerMapView } from "./career-map-view";

function renderCareerMap() {
  return render(
    <CareerMapView
      initialMap={createCareerMap()}
      onBuildToward={vi.fn().mockResolvedValue(undefined)}
      onRegenerate={vi.fn().mockResolvedValue(undefined)}
      onReopenSaved={vi.fn().mockResolvedValue(undefined)}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onStartOver={vi.fn()}
      onSubmitFeedback={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

describe("CareerMapView navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.requestAnimationFrame = (callback) => {
      return window.setTimeout(() => callback(0), 0);
    };
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("uses the approved PathIn logo and returns directly to current standing", () => {
    renderCareerMap();

    const logo = screen.getByRole("img", { name: "PathIn" });
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("pathin-logo.png");
    expect(
      screen.queryByRole("button", {
        name: "Return focus to current standing",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus selected goal Senior Data Scientist/,
      }),
    );

    const returnButton = screen.getByRole("button", {
      name: "Return focus to current standing",
    });
    expect(returnButton).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Senior Data Scientist, focused node/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(returnButton);

    expect(
      screen.getByRole("button", {
        name: /Your current standing, focused node/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Return focus to current standing",
      }),
    ).not.toBeInTheDocument();
  });

  it("does not render placeholder blocks when the focused route ends", () => {
    const { container } = renderCareerMap();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus selected goal Senior Data Scientist/,
      }),
    );

    expect(screen.queryByText("End of current route")).not.toBeInTheDocument();
    expect(screen.queryByText("No second later step")).not.toBeInTheDocument();
    expect(screen.queryByText("No connected node")).not.toBeInTheDocument();
    expect(container.querySelector("[data-empty='true']")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Move focus up to/ }),
    ).not.toBeInTheDocument();
  });

  it("lays out the complete Web view from profile evidence to destinations", async () => {
    renderCareerMap();

    fireEvent.click(screen.getByRole("button", { name: "Web" }));

    const web = screen.getByRole("region", {
      name: "Complete connected career path web",
    });
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0 }),
      ),
    );
    const current = within(web).getByRole("button", {
      name: /Your current standing/,
    });
    const profileFoundation = within(web).getByRole("button", {
      name: /Current skills/,
    });
    const destinations = web.querySelectorAll<HTMLButtonElement>(
      "button[data-kind='destination']",
    );
    const currentTop = Number.parseFloat(current.style.top);
    const profileTop = Number.parseFloat(profileFoundation.style.top);

    expect(profileTop).toBeLessThan(currentTop);
    expect(destinations.length).toBeGreaterThan(0);
    for (const destination of destinations) {
      expect(Number.parseFloat(destination.style.top)).toBeGreaterThan(
        currentTop,
      );
    }
    expect(
      screen.getByRole("heading", {
        name: "Follow every route from top to bottom",
      }),
    ).toBeInTheDocument();
  });

  it("animates vertical travel without allowing repeated clicks to skip steps", async () => {
    renderCareerMap();

    const navigator = screen.getByRole("region", {
      name: "Focused career bubble navigator",
    });
    const upButton = screen.getByRole("button", {
      name: /Move focus up to Machine Learning Fundamentals/,
    });

    fireEvent.click(upButton);

    expect(navigator).toHaveAttribute("aria-busy", "true");
    expect(navigator).toHaveAttribute("data-transition-direction", "next");
    expect(navigator).toHaveAttribute("data-transition-phase", "exit");
    expect(upButton).toBeDisabled();

    fireEvent.click(upButton);

    await waitFor(() =>
      expect(navigator).toHaveAttribute("data-transition-phase", "enter"),
    );
    expect(
      screen.getByRole("button", {
        name: /Machine Learning Fundamentals, focused node/,
      }),
    ).toBeInTheDocument();

    await waitFor(
      () => expect(navigator).toHaveAttribute("aria-busy", "false"),
      { timeout: 1_200 },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Move focus down to Your current standing/,
      }),
    );

    expect(navigator).toHaveAttribute(
      "data-transition-direction",
      "previous",
    );
    await waitFor(
      () => expect(navigator).toHaveAttribute("aria-busy", "false"),
      { timeout: 1_200 },
    );
    expect(
      screen.getByRole("button", {
        name: /Your current standing, focused node/,
      }),
    ).toBeInTheDocument();
  });

  it("switches horizontally between generated routes at the same depth", async () => {
    renderCareerMap();

    const navigator = screen.getByRole("region", {
      name: "Focused career bubble navigator",
    });
    expect(screen.getByText(/Route 1 of 3\./)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Switch right to Discovery-First route at Your current standing/,
      }),
    );

    expect(screen.getByText(/Route 2 of 3\./)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Your current standing, focused node/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Move focus up to Project Management Basics/,
      }),
    );
    await waitFor(
      () => expect(navigator).toHaveAttribute("aria-busy", "false"),
      { timeout: 1_200 },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Switch left to Project-first route at Machine Learning Fundamentals/,
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /Machine Learning Fundamentals, focused node/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Route 1 of 3\./)).toBeInTheDocument();
  });
});
