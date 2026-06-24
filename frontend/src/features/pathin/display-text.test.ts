import { describe, expect, it } from "vitest";

import {
  compactMapText,
  formatMapText,
  isUnreadableMapText,
} from "./display-text";

describe("PathIn map display text", () => {
  it("repairs character-spaced and collapsed profile labels", () => {
    expect(
      formatMapText(
        "C o l l e g e  C o n t a c t  M e n t o r  |  J a n 2 0 2 6 - P r e s e n t :",
      ),
    ).toBe("College Contact Mentor · Jan 2026 - Present:");
    expect(
      formatMapText("CollegeContactMentor|Jan2026-Present:"),
    ).toBe("College Contact Mentor · Jan 2026 - Present:");
    expect(
      formatMapText("N e w  S t u d e n t  R e p r e s e n t a t i v e"),
    ).toBe("New Student Representative");
  });

  it("preserves normal technology names", () => {
    expect(formatMapText("JavaScript, TypeScript, LinkedIn")).toBe(
      "JavaScript, TypeScript, LinkedIn",
    );
  });

  it("replaces unrecoverable run-together prose before it reaches a node", () => {
    const malformed =
      "Advisingstudentsthroughtailoredacademic,personal,andcareerguidancetoenhanceretentionandachievepost-secondarygoals.";

    expect(isUnreadableMapText(malformed)).toBe(true);
    expect(compactMapText(malformed, 80, "Imported experience")).toBe(
      "Imported experience",
    );
  });

  it("keeps compact node copy within the requested limit", () => {
    const compacted = compactMapText(
      "Built and validated a student-facing product with measurable retention outcomes",
      48,
      "Career step",
    );

    expect(compacted.length).toBeLessThanOrEqual(48);
    expect(compacted.endsWith("...")).toBe(true);
  });
});
