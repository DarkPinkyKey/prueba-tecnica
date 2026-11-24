import { describe, expect, it } from "vitest";
import { mapPantryRow, mapPantryRows } from "./pantry-mapping";
import type { PantryRow } from "@/types/pantry";

const row: PantryRow = {
  id: "pantry-1",
  user_id: "user-1",
  name: "Tomate",
  created_at: "2026-01-01",
};

describe("pantry row mapping", () => {
  it("maps the live name column to the ingredient UI field", () => {
    expect(mapPantryRow(row)).toEqual({
      id: row.id,
      user_id: row.user_id,
      ingredient: "Tomate",
    });
  });

  it("maps every row without dropping legacy pantry entries", () => {
    expect(mapPantryRows([row, { ...row, id: "pantry-2", name: "Pera" }])).toEqual([
      { id: row.id, user_id: row.user_id, ingredient: "Tomate" },
      { id: "pantry-2", user_id: row.user_id, ingredient: "Pera" },
    ]);
  });
});
