import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Header } from "./header";

describe("Header", () => {
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

  it("keeps Jobs separate from the Path[IN] Career Tree", () => {
    render(<Header />);

    expect(document.querySelector('a[href="/career-tree"]')).toBeNull();

    const jobs = screen.getByRole("button", { name: "Jobs" });
    fireEvent.click(jobs);

    expect(
      screen.getByText("Jobs is available as an interactive prototype scaffold."),
    ).toBeInTheDocument();
    expect(jobs).toHaveAttribute("aria-expanded", "true");
  });
});
