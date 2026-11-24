import type { AddPantryIngredientResult } from "./supabase";

export function getPantryAddFeedback(
  result: Extract<AddPantryIngredientResult, { status: "already-exists" }>,
): string;
export function getPantryAddFeedback(
  result: Extract<AddPantryIngredientResult, { status: "added" }>,
): null;
export function getPantryAddFeedback(
  result: AddPantryIngredientResult,
): string | null;
export function getPantryAddFeedback(
  result: AddPantryIngredientResult,
): string | null {
  return result.status === "already-exists"
    ? "Ese ingrediente ya está en tu despensa."
    : null;
}
