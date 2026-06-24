import { fireEvent, render, screen, within } from "@testing-library/react";
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
      callback(0);
      return 1;
    };
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("uses the approved PathIn logo and returns directly to current standing", () => {
    renderCareerMap();

    expect(screen.getByAltText("PathIn")).toHaveAttribute(
      "src",
      expect.stringContaining("pathin-logo.png"),
    );
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

  it("lays out the complete Web view from profile evidence to destinations", () => {
    renderCareerMap();

    fireEvent.click(screen.getByRole("button", { name: "Web" }));

    const web = screen.getByRole("region", {
      name: "Complete connected career path web",
    });
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
});
