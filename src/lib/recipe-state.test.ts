import { describe, expect, it } from "vitest";
import type { Recipe } from "@/types/recipe";
import { getRecipeView, type RecipeSnapshot } from "./recipe-state";

const recipe: Recipe = {
  id: "recipe-1",
  user_id: "user-1",
  title: "Sopa",
  description: null,
  ingredients: ["agua"],
  instructions: null,
  is_favorite: false,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const snapshot: RecipeSnapshot = {
  userId: "user-1",
  attempt: 0,
  recipes: [recipe],
  error: null,
};

describe("getRecipeView", () => {
  it("clears recipes and prior errors while another user's session loads", () => {
    expect(
      getRecipeView(
        { ...snapshot, error: "No se pudieron cargar tus recetas." },
        "user-2",
        0,
      ),
    ).toEqual({ recipes: [], error: null, loading: true });
  });

  it("hides stale data and errors while a retry is in progress", () => {
    expect(getRecipeView(snapshot, "user-1", 1)).toEqual({
      recipes: [],
      error: null,
      loading: true,
    });
  });

  it("shows the current user's load error without stale recipes", () => {
    expect(
      getRecipeView(
        { ...snapshot, attempt: 1, recipes: [], error: "No se pudieron cargar." },
        "user-1",
        1,
      ),
    ).toEqual({
      recipes: [],
      error: "No se pudieron cargar.",
      loading: false,
    });
  });
});
