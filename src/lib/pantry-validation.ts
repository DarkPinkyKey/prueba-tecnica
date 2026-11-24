export function normalizePantryIngredient(ingredient: string): string {
  return ingredient.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validatePantryIngredient(ingredient: string): string | null {
  if (!normalizePantryIngredient(ingredient)) {
    return "Escribe el nombre de un ingrediente.";
  }
  return null;
}
