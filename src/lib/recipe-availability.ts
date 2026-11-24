export function normalizeIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function calculateRecipeAvailability(
  recipeIngredients: string[],
  pantryIngredients: string[],
): number | null {
  const required = new Set(
    recipeIngredients.map(normalizeIngredientName).filter(Boolean),
  );
  if (required.size === 0) return null;

  const available = new Set(
    pantryIngredients.map(normalizeIngredientName).filter(Boolean),
  );
  const matches = [...required].filter((ingredient) => available.has(ingredient));
  return Math.round((matches.length / required.size) * 100);
}
