import { describe, expect, it } from "vitest";
import {
  calculateRecipeAvailability,
  normalizeIngredientName,
} from "./recipe-availability";

describe("normalizeIngredientName", () => {
  it("ignores case and trims and collapses whitespace", () => {
    expect(normalizeIngredientName("  TOMATE   cherry \t")).toBe("tomate cherry");
  });

  it("normalizes whitespace-only names to an empty string", () => {
    expect(normalizeIngredientName(" \t  ")).toBe("");
  });
});

describe("calculateRecipeAvailability", () => {
  it("returns the percentage of distinct ingredients present", () => {
    expect(
      calculateRecipeAvailability(
        ["Tomate", "  aceite   de oliva ", "sal"],
        ["TOMATE", "aceite de oliva"],
      ),
    ).toBe(67);
  });

  it("returns zero when none of the recipe ingredients are available", () => {
    expect(calculateRecipeAvailability(["Tomate", "Sal"], ["Pimienta"])).toBe(0);
  });

  it("returns one hundred when all recipe ingredients are available", () => {
    expect(calculateRecipeAvailability(["Tomate", "Sal"], ["sal", "tomate"])).toBe(100);
  });

  it("returns null for a recipe without meaningful ingredients", () => {
    expect(calculateRecipeAvailability([], ["Tomate"])).toBeNull();
    expect(calculateRecipeAvailability([" ", "\t"], ["Tomate"])).toBeNull();
  });

  it("does not count duplicate recipe or pantry ingredients more than once", () => {
    expect(
      calculateRecipeAvailability(
        ["Tomate", " tomate ", "Sal"],
        ["TOMATE", "tomate", "sal", " SAL "],
      ),
    ).toBe(100);
  });

  it("treats duplicate ingredients as one requirement when partially available", () => {
    expect(
      calculateRecipeAvailability(["Tomate", "tomate", "Sal"], ["tomate"]),
    ).toBe(50);
  });
});
