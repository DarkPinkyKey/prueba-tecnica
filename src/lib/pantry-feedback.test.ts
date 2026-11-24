import { describe, expect, it } from "vitest";
import { getPantryAddFeedback } from "./pantry-feedback";

describe("pantry add feedback", () => {
  it("returns the message displayed for an existing ingredient", () => {
    expect(getPantryAddFeedback({ status: "already-exists" })).toBe(
      "Ese ingrediente ya está en tu despensa.",
    );
  });

  it("does not produce duplicate feedback for a successful addition", () => {
    expect(
      getPantryAddFeedback({
        status: "added",
        ingredient: {
          id: "pantry-1",
          user_id: "user-1",
          ingredient: "Tomate",
        },
      }),
    ).toBeNull();
  });
});
