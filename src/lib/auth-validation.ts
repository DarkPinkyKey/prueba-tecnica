export type AuthCredentials = {
  email: string;
  password: string;
};

export function validateAuthCredentials({
  email,
  password,
}: AuthCredentials): string | null {
  const normalizedEmail = email.trim();

  if (!normalizedEmail || !password) {
    return "Completa el correo electrónico y la contraseña.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return "Introduce un correo electrónico válido.";
  }

  if (password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  return null;
}
