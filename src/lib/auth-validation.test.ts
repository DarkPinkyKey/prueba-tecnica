import { describe, expect, it } from "vitest";
import { validateAuthCredentials } from "./auth-validation";

describe("validateAuthCredentials", () => {
  it("accepts valid credentials", () => {
    expect(
      validateAuthCredentials({
        email: "persona@example.com",
        password: "secreto123",
      }),
    ).toBeNull();
  });

  it("rejects missing values", () => {
    expect(
      validateAuthCredentials({ email: "", password: "" }),
    ).not.toBeNull();
  });

  it("rejects invalid email addresses", () => {
    expect(
      validateAuthCredentials({
        email: "correo-invalido",
        password: "secreto123",
      }),
    ).toBe("Introduce un correo electrónico válido.");
  });

  it("rejects short passwords", () => {
    expect(
      validateAuthCredentials({
        email: "persona@example.com",
        password: "123",
      }),
    ).toBe("La contraseña debe tener al menos 6 caracteres.");
  });
});
