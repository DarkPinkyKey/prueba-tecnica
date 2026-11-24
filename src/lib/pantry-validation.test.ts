import { describe, expect, it } from "vitest";
import {
  normalizePantryIngredient,
  validatePantryIngredient,
} from "./pantry-validation";

describe("pantry ingredient validation", () => {
  it("rejects empty or whitespace-only ingredient names", () => {
    expect(validatePantryIngredient("   ")).toBe(
      "Escribe el nombre de un ingrediente.",
    );
    expect(validatePantryIngredient("Tomate")).toBeNull();
  });

  it("trims and collapses whitespace in ingredient names", () => {
    expect(normalizePantryIngredient("  TOMATE   Cherry  ")).toBe(
      "tomate cherry",
    );
  });
});
