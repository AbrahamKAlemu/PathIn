import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home feed", () => {
  it("keeps the LinkedIn-style feed and messaging shell on the homepage", () => {
    const { container } = render(<Home />);

    expect(screen.getByText("Start a post")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn News")).toBeInTheDocument();
    expect(screen.getByText("Y Combinator")).toBeInTheDocument();
    expect(container.querySelector(".messaging-bar")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Turn the profile you control into career routes you can inspect.",
      ),
    ).not.toBeInTheDocument();
  });
});
