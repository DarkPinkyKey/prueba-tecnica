import type { PantryIngredient } from "@/types/pantry";

export type PantrySnapshot = {
  userId: string;
  attempt: number;
  ingredients: PantryIngredient[];
  error: string | null;
};

export type PantryView = Pick<PantrySnapshot, "ingredients" | "error"> & {
  loading: boolean;
};

export function getPantryView(
  snapshot: PantrySnapshot | null,
  userId: string,
  attempt: number,
): PantryView {
  if (!snapshot || snapshot.userId !== userId || snapshot.attempt !== attempt) {
    return { ingredients: [], error: null, loading: true };
  }
  return { ingredients: snapshot.ingredients, error: snapshot.error, loading: false };
}
