import type { RecipeDraft } from "../types/recipe";

export function validateRecipeDraft(draft: RecipeDraft): string | null {
  if (!draft.title.trim()) return "El título es obligatorio.";
  if (!draft.ingredients.some((ingredient) => ingredient.trim())) {
    return "Añade al menos un ingrediente.";
  }
  return null;
}

export function normalizeRecipeDraft(draft: RecipeDraft): RecipeDraft {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    ingredients: draft.ingredients.map((item) => item.trim()).filter(Boolean),
    instructions: draft.instructions.trim(),
  };
}
