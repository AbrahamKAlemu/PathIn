import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileSidebar } from "./profile-sidebar";

describe("ProfileSidebar", () => {
  it("provides the dedicated PathIn Career Explorer entry point", () => {
    render(<ProfileSidebar />);

    expect(
      screen.getByRole("link", { name: "Explore your paths" }),
    ).toHaveAttribute("href", "/career-tree");
  });
});
