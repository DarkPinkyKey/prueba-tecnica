import type { PantryIngredient, PantryRow } from "@/types/pantry";

export function mapPantryRow(row: PantryRow): PantryIngredient {
  return {
    id: row.id,
    user_id: row.user_id,
    ingredient: row.name,
  };
}

export function mapPantryRows(rows: PantryRow[]): PantryIngredient[] {
  return rows.map(mapPantryRow);
}
