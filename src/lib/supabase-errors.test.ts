import { describe, expect, it } from "vitest";
import {
  formatSupabaseError,
  getOperationErrorMessage,
} from "./supabase-errors";

describe("Supabase error diagnostics", () => {
  it("keeps the database code and message while redacting sensitive values", () => {
    const error = formatSupabaseError({
      code: "42703",
      message:
        'column "description" missing for user@example.com with access_token=private-token and key sb_secret_test-key',
    });

    expect(error.message).toBe(
      "Error de Supabase [42703]: column \"description\" missing for [correo oculto] with access_token=[oculto] and key [clave oculta]",
    );
  });

  it("adds safe diagnostics to a contextual message and falls back for unknown errors", () => {
    expect(
      getOperationErrorMessage(
        new Error("Request failed: password=hunter2"),
        "No se pudo guardar.",
      ),
    ).toBe("No se pudo guardar. Request failed: password=[oculto]");
    expect(getOperationErrorMessage("private details", "No se pudo guardar.")).toBe(
      "No se pudo guardar.",
    );
  });
});
