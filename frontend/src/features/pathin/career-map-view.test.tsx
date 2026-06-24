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
import type { CareerMapData } from "./types";

function renderCareerMap({
  initialMap = createCareerMap(),
  onBuildToward = vi.fn().mockResolvedValue(undefined),
  onExplore = vi.fn().mockResolvedValue(undefined),
  onRegenerate = vi.fn().mockResolvedValue(undefined),
  onReopenSaved = vi.fn().mockResolvedValue({ source: "browser" }),
  onSave = vi.fn().mockResolvedValue({
    savedAt: "2026-06-24T08:00:00.000Z",
    storage: "browser",
  }),
}: {
  initialMap?: CareerMapData;
  onBuildToward?: ReturnType<typeof vi.fn>;
  onExplore?: ReturnType<typeof vi.fn>;
  onRegenerate?: ReturnType<typeof vi.fn>;
  onReopenSaved?: ReturnType<typeof vi.fn>;
  onSave?: ReturnType<typeof vi.fn>;
} = {}) {
  return render(
    <CareerMapView
      initialMap={initialMap}
      onBuildToward={onBuildToward}
      onExplore={onExplore}
      onRegenerate={onRegenerate}
      onReopenSaved={onReopenSaved}
      onSave={onSave}
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
      screen.getByRole("heading", { name: "Path[In]" }),
    ).toBeInTheDocument();
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
    const routeLabels = web.querySelectorAll<HTMLElement>(
      "[data-route-label='true']",
    );

    expect(profileTop).toBeLessThan(currentTop);
    expect(routeLabels).toHaveLength(3);
    for (const routeLabel of routeLabels) {
      expect(Number.parseFloat(routeLabel.style.top)).toBeGreaterThan(
        currentTop + 120,
      );
    }
    expect(destinations.length).toBeGreaterThan(0);
    for (const destination of destinations) {
      expect(Number.parseFloat(destination.style.top)).toBeGreaterThan(
        currentTop,
      );
    }
    expect(
      screen.getByRole("heading", {
        name: "See every suggested career and its route",
      }),
    ).toBeInTheDocument();
  });

  it("asks Flask to build personalized routes for the selected career", async () => {
    const onBuildToward = vi.fn().mockResolvedValue(undefined);
    renderCareerMap({ onBuildToward });

    fireEvent.click(screen.getByRole("tab", { name: "Build My Path" }));

    await waitFor(() =>
      expect(onBuildToward).toHaveBeenCalledWith("data-senior"),
    );
  });

  it("renders a returned build map as one goal with multiple routes", async () => {
    const initialMap: CareerMapData = {
      ...createCareerMap(),
      mode: "build",
      destinationIds: ["data-senior"],
    };
    renderCareerMap({ initialMap });

    fireEvent.click(screen.getByRole("button", { name: "Web" }));

    const web = screen.getByRole("region", {
      name: "Complete connected career path web",
    });
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0 }),
      ),
    );

    expect(
      within(web).getAllByRole("button", {
        name: /Senior Data Scientist/,
      }),
    ).toHaveLength(1);
    expect(
      web.querySelectorAll("[data-route-label='true']"),
    ).toHaveLength(2);
    expect(
      screen.getByText(/2 personalized routes generated from your evidence/),
    ).toBeInTheDocument();
  });

  it("returns to Flask-powered career exploration from a build map", async () => {
    const onExplore = vi.fn().mockResolvedValue(undefined);
    const initialMap: CareerMapData = {
      ...createCareerMap(),
      mode: "build",
      destinationIds: ["data-senior"],
    };
    renderCareerMap({ initialMap, onExplore });

    fireEvent.click(screen.getByRole("tab", { name: "Explore" }));

    await waitFor(() => expect(onExplore).toHaveBeenCalledTimes(1));
  });

  it("shows LinkedIn Learning courses matched to the skills to build", () => {
    const initialMap = createCareerMap();
    const mapWithCrmGap: CareerMapData = {
      ...initialMap,
      nodes: initialMap.nodes.map((node) =>
        node.id === "current"
          ? { ...node, skillsToBuild: ["CRM"] }
          : node,
      ),
    };
    renderCareerMap({ initialMap: mapWithCrmGap });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Your current standing, focused node/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Skills" }));

    expect(
      screen.getByRole("heading", { name: "LinkedIn Learning" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Customer Success Management Fundamentals/,
      }),
    ).toHaveAttribute(
      "href",
      "https://www.linkedin.com/learning/customer-success-management-fundamentals",
    );
    expect(
      screen.getByRole("link", {
        name: /Onboarding and Adoption Best Practices/,
      }),
    ).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", {
        name: /Salesforce Essential Training/,
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

  it("animates direct preview clicks when skipping between nodes", async () => {
    renderCareerMap();

    const navigator = screen.getByRole("region", {
      name: "Focused career bubble navigator",
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus Applied data analysis, two steps ahead/,
      }),
    );

    expect(navigator).toHaveAttribute("aria-busy", "true");
    expect(navigator).toHaveAttribute("data-transition-direction", "next");
    expect(navigator).toHaveAttribute("data-transition-phase", "exit");
    expect(
      screen.getByRole("button", {
        name: /Your current standing, focused node/,
      }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(navigator).toHaveAttribute("data-transition-phase", "enter"),
    );
    expect(
      screen.getByRole("button", {
        name: /Applied data analysis, focused node/,
      }),
    ).toBeInTheDocument();
    await waitFor(
      () => expect(navigator).toHaveAttribute("aria-busy", "false"),
      { timeout: 1_200 },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus Your current standing, two steps back/,
      }),
    );
    expect(navigator).toHaveAttribute(
      "data-transition-direction",
      "previous",
    );
    expect(navigator).toHaveAttribute("data-transition-phase", "exit");

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
    expect(screen.getByText(/Career 1 of 3/)).toBeInTheDocument();
    const rightRouteButton = screen.getByRole("button", {
      name: /Switch right to Product Manager career at Your current standing/,
    });
    fireEvent.click(rightRouteButton);

    expect(navigator).toHaveAttribute("aria-busy", "true");
    expect(navigator).toHaveAttribute("data-transition-direction", "right");
    expect(navigator).toHaveAttribute("data-transition-phase", "exit");
    expect(rightRouteButton).toHaveAttribute("data-active", "true");
    expect(rightRouteButton).toBeDisabled();
    await waitFor(
      () => expect(navigator).toHaveAttribute("aria-busy", "false"),
      { timeout: 1_200 },
    );
    expect(screen.getByText(/Career 2 of 3/)).toBeInTheDocument();
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
    const leftRouteButton = screen.getByRole("button", {
      name: /Switch left to Senior Data Scientist career at Machine Learning Fundamentals/,
    });
    fireEvent.click(leftRouteButton);

    expect(navigator).toHaveAttribute("data-transition-direction", "left");
    expect(leftRouteButton).toHaveAttribute("data-active", "true");
    await waitFor(
      () => expect(navigator).toHaveAttribute("aria-busy", "false"),
      { timeout: 1_200 },
    );
    expect(
      screen.getByRole("button", {
        name: /Machine Learning Fundamentals, focused node/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Career 1 of 3/)).toBeInTheDocument();
  });

  it("requests a new backend set when Regenerate is clicked", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    renderCareerMap({ onRegenerate });

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    await waitFor(() =>
      expect(onRegenerate).toHaveBeenCalledWith("regenerate", {
        dismissedNodeIds: [],
        pinnedNodeIds: [],
      }),
    );
  });

  it("shows where a saved path is stored and reopens it", async () => {
    const onReopenSaved = vi.fn().mockResolvedValue({ source: "browser" });
    const onSave = vi.fn().mockResolvedValue({
      savedAt: "2026-06-24T08:00:00.000Z",
      storage: "browser",
    });
    renderCareerMap({ onReopenSaved, onSave });

    fireEvent.click(screen.getByRole("button", { name: "Save path" }));

    expect(
      await screen.findByText("This path is saved"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Stored in this browser so it survives backend restarts/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Saved paths/ }),
    ).toHaveTextContent("1");

    fireEvent.click(
      screen.getByRole("button", { name: "Open saved path" }),
    );
    await waitFor(() => expect(onReopenSaved).toHaveBeenCalledTimes(1));
  });
});
