import { describe, expect, it } from "vitest";
import {
  normalizeRecipeDraft,
  validateRecipeDraft,
} from "./recipe-validation";
import type { RecipeDraft } from "../types/recipe";

const validDraft: RecipeDraft = {
  title: " Pasta ",
  description: " Simple ",
  ingredients: [" pasta ", "", "tomate"],
  instructions: " Hervir ",
};

describe("validateRecipeDraft", () => {
  it("requires a title and at least one non-empty ingredient", () => {
    expect(validateRecipeDraft({ ...validDraft, title: " " })).toBe(
      "El título es obligatorio.",
    );
    expect(validateRecipeDraft({ ...validDraft, ingredients: [" ", ""] })).toBe(
      "Añade al menos un ingrediente.",
    );
  });

  it("accepts a complete draft", () => {
    expect(validateRecipeDraft(validDraft)).toBeNull();
  });
});

describe("normalizeRecipeDraft", () => {
  it("trims text and removes empty ingredients", () => {
    expect(normalizeRecipeDraft(validDraft)).toEqual({
      title: "Pasta",
      description: "Simple",
      ingredients: ["pasta", "tomate"],
      instructions: "Hervir",
    });
  });
});
