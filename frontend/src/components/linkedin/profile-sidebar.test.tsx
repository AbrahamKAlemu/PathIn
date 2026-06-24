import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileSidebar } from "./profile-sidebar";

describe("ProfileSidebar", () => {
  it("provides the dedicated Path[In] Career Explorer entry point", () => {
    render(<ProfileSidebar />);

    expect(screen.getByText("Path[In]")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore your paths" }),
    ).toHaveAttribute("href", "/career-tree");
  });
});
