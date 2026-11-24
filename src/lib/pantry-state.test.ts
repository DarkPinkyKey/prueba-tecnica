import { describe, expect, it } from "vitest";
import type { PantryIngredient } from "@/types/pantry";
import { getPantryView, type PantrySnapshot } from "./pantry-state";

const ingredient: PantryIngredient = {
  id: "ingredient-1",
  user_id: "user-1",
  ingredient: "Tomate",
};

const snapshot: PantrySnapshot = {
  userId: "user-1",
  attempt: 0,
  ingredients: [ingredient],
  error: null,
};

describe("getPantryView", () => {
  it("hides another user's ingredients while the requested pantry loads", () => {
    expect(getPantryView(snapshot, "user-2", 0)).toEqual({
      ingredients: [],
      error: null,
      loading: true,
    });
  });

  it("does not expose the previous user's load error during a session switch", () => {
    expect(
      getPantryView(
        { ...snapshot, error: "No se pudo cargar." },
        "user-2",
        0,
      ),
    ).toEqual({ ingredients: [], error: null, loading: true });
  });

  it("hides stale pantry data while a retry is loading", () => {
    expect(getPantryView(snapshot, "user-1", 1)).toEqual({
      ingredients: [],
      error: null,
      loading: true,
    });
  });

  it("does not keep prior ingredients visible after a failed reload", () => {
    expect(
      getPantryView(
        { ...snapshot, attempt: 1, ingredients: [], error: "No se pudo cargar." },
        "user-1",
        1,
      ),
    ).toEqual({
      ingredients: [],
      error: "No se pudo cargar.",
      loading: false,
    });
  });
});
