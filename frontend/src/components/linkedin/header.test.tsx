import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Header } from "./header";

describe("Header", () => {
  it("keeps the full LinkedIn-style labeled navigation at the corrected height", () => {
    const { container } = render(<Header />);

    expect(container.querySelector("header")).toHaveClass("h-[66px]");
    for (const label of [
      "Home",
      "My Network",
      "Jobs",
      "Messaging",
      "Notifications",
      "Me",
      "For Business",
      "Learning",
    ]) {
      expect(
        screen.getByRole(
          label === "Home" || label === "Me" ? "link" : "button",
          { name: label },
        ),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("link", { name: "Open PathIn career explorer" }),
    ).toHaveAttribute("href", "/career-tree");
  });

  it("links the Me avatar to Winston's profile and hides badge when notifications are zero", () => {
    render(<Header active="profile" notificationCount={0} />);

    expect(screen.getByRole("link", { name: "Me" })).toHaveAttribute(
      "href",
      "/in/winstoniskandar",
    );

    const notifications = screen.getByRole("button", {
      name: "Notifications",
    });
    expect(within(notifications).queryByText("0")).toBeNull();

    fireEvent.click(notifications);
    expect(screen.getByText("You have 0 notifications.")).toBeInTheDocument();
    expect(notifications).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the notification count badge when notificationCount is greater than zero", () => {
    render(<Header notificationCount={9} />);

    const notifications = screen.getByRole("button", {
      name: "Notifications",
    });
    expect(within(notifications).getByText("9")).toBeInTheDocument();
  });

  it("keeps Jobs separate from the PathIn Career Tree", () => {
    render(<Header />);

    expect(
      screen.getByRole("link", { name: "Open PathIn career explorer" }),
    ).toHaveAttribute("href", "/career-tree");

    const jobs = screen.getByRole("button", { name: "Jobs" });
    expect(jobs.closest("a")).toBeNull();
    fireEvent.click(jobs);

    expect(
      screen.getByText(
        "Shown only as host context. PathIn does not scrape live jobs or imply access to LinkedIn job listings.",
      ),
    ).toBeInTheDocument();
    expect(jobs).toHaveAttribute("aria-expanded", "true");
  });
});
