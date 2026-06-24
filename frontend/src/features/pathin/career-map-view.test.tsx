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
import type { RegenerationAction } from "./pathin-api";
import type { CareerMapData } from "./types";

type RegenerateHandler = (
  action: RegenerationAction,
  options?: {
    targetId?: string;
    pinnedNodeIds?: string[];
    dismissedNodeIds?: string[];
  },
) => Promise<void>;

type ReopenHandler = () => Promise<{
  source: "backend" | "browser";
}>;

type SaveHandler = (map: CareerMapData) => Promise<{
  savedAt: string;
  storage: "backend_and_browser" | "browser";
}>;

type FeedbackHandler = (
  target: { id: string; label: string; type: "node" | "edge" },
  category: string,
) => Promise<void>;

function renderCareerMap({
  initialMap = createCareerMap(),
  onRegenerate = vi.fn().mockResolvedValue(undefined),
  onReopenSaved = vi.fn().mockResolvedValue({ source: "browser" }),
  onSave = vi.fn().mockResolvedValue({
    savedAt: "2026-06-24T08:00:00.000Z",
    storage: "browser",
  }),
  onSubmitFeedback = vi.fn().mockResolvedValue(undefined),
}: {
  initialMap?: CareerMapData;
  onRegenerate?: RegenerateHandler;
  onReopenSaved?: ReopenHandler;
  onSave?: SaveHandler;
  onSubmitFeedback?: FeedbackHandler;
} = {}) {
  return render(
    <CareerMapView
      initialMap={initialMap}
      onRegenerate={onRegenerate}
      onReopenSaved={onReopenSaved}
      onSave={onSave}
      onStartOver={vi.fn()}
      onSubmitFeedback={onSubmitFeedback}
    />,
  );
}

function createDirectDestinationMap(): CareerMapData {
  const map = createCareerMap();
  const pathId = map.explorePathIds[0];
  const path = map.paths.find((candidate) => candidate.id === pathId);
  if (!path) {
    throw new Error("Expected the default career map to include an explore path.");
  }

  return {
    ...map,
    explorePathIds: [path.id],
    paths: map.paths.map((candidate) =>
      candidate.id === path.id
        ? {
            ...candidate,
            nodeIds: ["current", candidate.destinationId],
          }
        : candidate,
    ),
  };
}

describe("CareerMapView navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.requestAnimationFrame = (callback) => {
      return window.setTimeout(() => callback(0), 0);
    };
    HTMLElement.prototype.scrollTo = vi.fn();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("uses the approved PathIn logo and returns directly to current standing", async () => {
    renderCareerMap({ initialMap: createDirectDestinationMap() });

    const logo = screen.getByRole("img", { name: "PathIn" });
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("pathin-logo.png");
    expect(
      screen.getByRole("heading", { name: "PathIn" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Return focus to current standing",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus Senior Data Scientist, next step/,
      }),
    );

    const returnButton = await screen.findByRole("button", {
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

  it("repairs split years and separates experience dates from role titles", () => {
    const baseMap = createCareerMap();
    const malformedRole =
      "Incoming Summer Analyst June 202 6 - August 20 26";
    const initialMap: CareerMapData = {
      ...baseMap,
      profile: {
        ...baseMap.profile,
        roles: [malformedRole, "Software Engineering Intern May 2 0 2 5"],
        experience: [malformedRole],
      },
    };

    renderCareerMap({ initialMap });

    const navigator = screen.getByRole("region", {
      name: "Focused career bubble navigator",
    });
    expect(
      within(navigator).getByText("Incoming Summer Analyst"),
    ).toBeInTheDocument();
    expect(
      within(navigator).getByText("June 2026 - August 2026"),
    ).toBeInTheDocument();
    expect(navigator).not.toHaveTextContent(/202\s+6|20\s+26|2\s+0\s+2\s+5/);
    expect(navigator).not.toHaveTextContent(
      /PathIn keeps this entry factual/,
    );
  });

  it("does not render placeholder blocks when the focused route ends", async () => {
    const { container } = renderCareerMap({
      initialMap: createDirectDestinationMap(),
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus Senior Data Scientist, next step/,
      }),
    );

    await screen.findByRole("button", {
      name: /Senior Data Scientist, focused node/,
    });
    expect(screen.queryByText("End of current route")).not.toBeInTheDocument();
    expect(screen.queryByText("No second later step")).not.toBeInTheDocument();
    expect(screen.queryByText("No connected node")).not.toBeInTheDocument();
    expect(container.querySelector("[data-empty='true']")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Move focus up to/ }),
    ).not.toBeInTheDocument();
  });

  it("uses the side controls instead of repeating career destination bubbles", () => {
    renderCareerMap();

    expect(
      screen.getByRole("region", { name: "Career directions" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Focus selected goal/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Switch to .* goal using/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Switch right to .* career at/,
      }),
    ).toBeInTheDocument();
  });

  it("explains the rendered map vocabulary and closes the legend accessibly", () => {
    renderCareerMap();

    const legendButton = screen.getByRole("button", { name: "Legend" });
    expect(legendButton).toHaveAttribute("aria-expanded", "false");
    expect(legendButton).toHaveAttribute(
      "aria-controls",
      "pathin-map-legend",
    );

    fireEvent.click(legendButton);

    const legend = screen.getByRole("region", { name: "Map legend" });
    expect(legendButton).toHaveAttribute("aria-expanded", "true");
    expect(within(legend).getByText("Node colors")).toBeInTheDocument();
    expect(
      within(legend).getByText(
        "Arrows show a suggested progression between steps.",
      ),
    ).toBeInTheDocument();
    expect(
      within(legend).getByText(
        "Branches compare careers in Explore and routes in Build.",
      ),
    ).toBeInTheDocument();
    expect(
      within(legend).getByText(
        "Open a step, then use Path and Evidence for rationale and confidence.",
      ),
    ).toBeInTheDocument();
    expect(
      within(legend).queryByText("Observed career transition"),
    ).not.toBeInTheDocument();
    expect(
      within(legend).queryByText("Limited historical evidence"),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(legendButton, { key: "Escape" });
    expect(
      screen.queryByRole("region", { name: "Map legend" }),
    ).not.toBeInTheDocument();

    fireEvent.click(legendButton);
    fireEvent.mouseDown(document.body);
    expect(
      screen.queryByRole("region", { name: "Map legend" }),
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

  it("switches between Explore and Build My Path without regenerating", () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    renderCareerMap({ onRegenerate });

    fireEvent.click(screen.getByRole("tab", { name: "Build My Path" }));

    expect(
      screen.getByRole("tab", { name: "Build My Path" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("region", { name: "Build path editor" }),
    ).toBeInTheDocument();
    expect(onRegenerate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "Explore" }));

    expect(screen.getByRole("tab", { name: "Explore" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("region", { name: "Build path editor" }),
    ).not.toBeInTheDocument();
    expect(onRegenerate).not.toHaveBeenCalled();
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

  it("returns to career exploration locally from a build map", () => {
    const initialMap: CareerMapData = {
      ...createCareerMap(),
      mode: "build",
      destinationIds: ["data-senior"],
    };
    renderCareerMap({ initialMap });

    fireEvent.click(screen.getByRole("tab", { name: "Explore" }));

    expect(screen.getByRole("tab", { name: "Explore" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("region", { name: "Build path editor" }),
    ).not.toBeInTheDocument();
  });

  it("reorders generated build steps with controls and drag-and-drop", () => {
    renderCareerMap();
    fireEvent.click(screen.getByRole("tab", { name: "Build My Path" }));

    const editor = screen.getByRole("region", {
      name: "Build path editor",
    });
    const stepLabels = () =>
      within(editor)
        .getAllByRole("button", { name: /^Select / })
        .map((button) => button.getAttribute("aria-label"));

    expect(stepLabels()).toEqual([
      "Select Your current standing",
      "Select Machine Learning Fundamentals",
      "Select Applied data analysis",
      "Select Applied data project",
      "Select Data Scientist",
      "Select Senior Data Scientist",
    ]);

    fireEvent.click(
      within(editor).getByRole("button", {
        name: "Move Applied data analysis earlier",
      }),
    );
    expect(stepLabels().slice(0, 3)).toEqual([
      "Select Your current standing",
      "Select Applied data analysis",
      "Select Machine Learning Fundamentals",
    ]);

    const dataTransfer = {
      dropEffect: "move",
      effectAllowed: "move",
      getData: vi.fn(() => "course-ml"),
      setData: vi.fn(),
    };
    const source = within(editor)
      .getByRole("button", {
        name: "Select Machine Learning Fundamentals",
      })
      .closest("article");
    const target = within(editor)
      .getByRole("button", { name: "Select Data Scientist" })
      .closest("article");
    expect(source).toHaveAttribute("draggable", "true");

    fireEvent.dragStart(source!, { dataTransfer });
    fireEvent.dragOver(target!, { dataTransfer });
    fireEvent.drop(target!, { dataTransfer });

    const reordered = stepLabels();
    expect(reordered.indexOf("Select Machine Learning Fundamentals")).toBe(
      reordered.indexOf("Select Data Scientist") + 1,
    );
  });

  it("adds recommended nodes and custom steps to the active route", () => {
    renderCareerMap();
    fireEvent.click(screen.getByRole("tab", { name: "Build My Path" }));

    const editor = screen.getByRole("region", {
      name: "Build path editor",
    });
    fireEvent.click(
      within(editor).getByRole("button", {
        name: "Add Cloud Computing with AWS",
      }),
    );
    expect(
      within(editor).getByRole("button", {
        name: "Select Cloud Computing with AWS",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(editor).getByRole("button", { name: "Add custom step" }),
    );
    fireEvent.change(
      within(editor).getByLabelText("Step title"),
      { target: { value: "Ship an observability dashboard" } },
    );
    fireEvent.change(
      within(editor).getByLabelText("What this step proves"),
      {
        target: {
          value: "Show production ownership with measurable service signals.",
        },
      },
    );
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add to route" }),
    );

    expect(
      within(editor).getByRole("button", {
        name: "Select Ship an observability dashboard",
      }),
    ).toBeInTheDocument();
  });

  it("edits a generated node without changing the source map", () => {
    const initialMap = createCareerMap();
    renderCareerMap({ initialMap });
    fireEvent.click(screen.getByRole("tab", { name: "Build My Path" }));

    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit Machine Learning Fundamentals",
      }),
    );
    fireEvent.change(screen.getByLabelText("Step title"), {
      target: { value: "Build an ML evaluation pipeline" },
    });
    fireEvent.change(screen.getByLabelText("What this step proves"), {
      target: {
        value: "Evaluate a model and document the tradeoffs.",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save changes" }),
    );

    expect(
      screen.getByRole("button", {
        name: "Select Build an ML evaluation pipeline",
      }),
    ).toBeInTheDocument();
    expect(
      initialMap.nodes.find((node) => node.id === "course-ml")?.label,
    ).toBe("Machine Learning Fundamentals");
  });

  it("materializes route edits and custom steps when saving", async () => {
    const initialMap = createCareerMap();
    const onSave = vi.fn().mockResolvedValue({
      savedAt: "2026-06-24T08:00:00.000Z",
      storage: "browser",
    });
    renderCareerMap({ initialMap, onSave });
    fireEvent.click(screen.getByRole("tab", { name: "Build My Path" }));

    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit Machine Learning Fundamentals",
      }),
    );
    fireEvent.change(screen.getByLabelText("Step title"), {
      target: { value: "Build an ML evaluation pipeline" },
    });
    fireEvent.change(screen.getByLabelText("What this step proves"), {
      target: {
        value: "Evaluate a model and document the tradeoffs.",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save changes" }),
    );

    const editor = screen.getByRole("region", {
      name: "Build path editor",
    });
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add custom step" }),
    );
    fireEvent.change(within(editor).getByLabelText("Step title"), {
      target: { value: "Present an evaluation review" },
    });
    fireEvent.change(
      within(editor).getByLabelText("What this step proves"),
      {
        target: {
          value: "Explain model tradeoffs to a technical reviewer.",
        },
      },
    );
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add to route" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save path" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const savedMap = onSave.mock.calls[0][0] as CareerMapData;
    expect(
      savedMap.nodes.find((node) => node.id === "course-ml")?.label,
    ).toBe("Build an ML evaluation pipeline");
    const customNode = savedMap.nodes.find(
      (node) => node.label === "Present an evaluation review",
    );
    expect(customNode?.id).toMatch(/^custom-step-/);
    expect(
      savedMap.paths.some((path) =>
        path.nodeIds.includes(customNode?.id ?? ""),
      ),
    ).toBe(true);
  });

  it("builds live LinkedIn Learning searches from skills to build", () => {
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
        name: /Find CRM courses/,
      }),
    ).toHaveAttribute(
      "href",
      "https://www.linkedin.com/learning/search?keywords=CRM",
    );
    expect(
      screen.getByText("Live LinkedIn Learning search · For CRM"),
    ).toBeInTheDocument();
  });

  it("submits explicit recommendation feedback with its node identity", async () => {
    const onSubmitFeedback = vi.fn().mockResolvedValue(undefined);
    renderCareerMap({ onSubmitFeedback });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus Machine Learning Fundamentals, next step/,
      }),
    );
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", {
            name: /Machine Learning Fundamentals, focused node/,
          }),
        ).toBeInTheDocument(),
      { timeout: 1_200 },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Machine Learning Fundamentals, focused node/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Give feedback" }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "What should PathIn review?",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Incorrect or misleading" }),
    );

    await waitFor(() =>
      expect(onSubmitFeedback).toHaveBeenCalledWith(
        {
          id: "course-ml",
          label: "Machine Learning Fundamentals",
          type: "node",
        },
        "incorrect",
      ),
    );
    expect(
      screen.queryByRole("dialog", {
        name: "What should PathIn review?",
      }),
    ).not.toBeInTheDocument();
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

  it("shows existing alternative steps without regenerating the map", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    renderCareerMap({ onRegenerate });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Focus Machine Learning Fundamentals, next step",
      }),
    );
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", {
            name: /Machine Learning Fundamentals, focused node/,
          }),
        ).toBeInTheDocument(),
      { timeout: 1_200 },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Machine Learning Fundamentals, focused node/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Show alternatives" }),
    );

    const alternatives = screen.getByRole("region", {
      name: "Alternative route options",
    });
    expect(
      within(alternatives).getByText("Choose an existing route step"),
    ).toBeInTheDocument();
    expect(
      within(alternatives).getByText("Machine Learning Fundamentals"),
    ).toBeInTheDocument();
    expect(
      within(alternatives).getByText("Cloud Computing with AWS"),
    ).toBeInTheDocument();
    expect(onRegenerate).not.toHaveBeenCalled();

    fireEvent.click(
      within(alternatives).getByRole("button", {
        name: /Cloud Computing with AWS/,
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /Cloud Computing with AWS, focused node/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", {
        name: "Alternative route options",
      }),
    ).not.toBeInTheDocument();
    expect(onRegenerate).not.toHaveBeenCalled();
  });

  it("shows that the current saved path is already open", async () => {
    const onReopenSaved = vi.fn().mockResolvedValue({ source: "browser" });
    const onSave = vi.fn().mockResolvedValue({
      savedAt: "2026-06-24T08:00:00.000Z",
      storage: "browser",
    });
    renderCareerMap({ onReopenSaved, onSave });

    expect(
      screen.getByRole("button", { name: /Saved paths/ }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save path" }));

    expect(
      await screen.findByText("Path saved"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Stored in this browser so it survives backend restarts/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Saved paths/ }),
    ).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: "Currently open" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Saved" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Hide saved paths" }),
    );
    expect(
      screen.queryByText("Path saved"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Saved paths/ }),
    );
    expect(
      await screen.findByText("Path saved"),
    ).toBeInTheDocument();
    expect(onReopenSaved).not.toHaveBeenCalled();
  });

  it("restores a saved path after the current map changes", async () => {
    const savedMap = createCareerMap();
    const currentMap: CareerMapData = {
      ...savedMap,
      id: "map-regenerated",
      generation: {
        ...savedMap.generation,
        generatedAt: "2026-06-24T09:30:00.000Z",
      },
    };
    let resolveReopen:
      | ((result: { source: "browser" }) => void)
      | undefined;
    const onReopenSaved = vi.fn(
      () =>
        new Promise<{ source: "browser" }>((resolve) => {
          resolveReopen = resolve;
        }),
    );
    const onSave = vi.fn().mockResolvedValue({
      savedAt: "2026-06-24T08:00:00.000Z",
      storage: "browser",
    });
    const view = renderCareerMap({
      initialMap: savedMap,
      onReopenSaved,
      onSave,
    });

    fireEvent.click(screen.getByRole("button", { name: "Save path" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Hide saved paths" }),
    );

    view.rerender(
      <CareerMapView
        initialMap={currentMap}
        onRegenerate={vi.fn().mockResolvedValue(undefined)}
        onReopenSaved={onReopenSaved}
        onSave={onSave}
        onStartOver={vi.fn()}
        onSubmitFeedback={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Saved paths/ }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Saved paths/ }),
    );
    expect(
      await screen.findByText("One saved path is ready to restore"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Restore saved path" }),
    );
    expect(
      screen.getByRole("button", { name: "Restoring..." }),
    ).toBeDisabled();
    expect(onReopenSaved).toHaveBeenCalledTimes(1);
    const savedStateBeforeRestore = window.localStorage.getItem(
      "pathin-career-tree-state",
    );

    resolveReopen?.({ source: "browser" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Restore saved path" }),
      ).toBeEnabled(),
    );
    expect(
      window.localStorage.getItem("pathin-career-tree-state"),
    ).toBe(savedStateBeforeRestore);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
