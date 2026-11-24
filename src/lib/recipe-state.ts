import type { Recipe } from "@/types/recipe";

export type RecipeSnapshot = {
  userId: string;
  attempt: number;
  recipes: Recipe[];
  error: string | null;
};

export type RecipeView = Pick<RecipeSnapshot, "recipes" | "error"> & {
  loading: boolean;
};

export function getRecipeView(
  snapshot: RecipeSnapshot | null,
  userId: string,
  attempt: number,
): RecipeView {
  if (!snapshot || snapshot.userId !== userId || snapshot.attempt !== attempt) {
    return { recipes: [], error: null, loading: true };
  }
  return { recipes: snapshot.recipes, error: snapshot.error, loading: false };
}
