export type SupabaseErrorDetails = {
  code?: string;
  message: string;
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UUID_PATTERN = /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const SUPABASE_KEY_PATTERN = /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const CREDENTIAL_PATTERN =
  /\b(password|(?:access|refresh)[_-]?token|token|secret|(?:api|anon|service)[_-]?(?:key|role))\s*[:=]\s*["']?[^,\s"'&]+/gi;

export function formatSupabaseError(error: SupabaseErrorDetails): Error {
  const code = error.code ? ` [${error.code}]` : "";
  return new Error(`Error de Supabase${code}: ${sanitizeDiagnostic(error.message)}`);
}

export function getOperationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof Error)) return fallback;
  const diagnostic = sanitizeDiagnostic(error.message);
  return diagnostic ? `${fallback} ${diagnostic}` : fallback;
}

function sanitizeDiagnostic(message: string): string {
  return message
    .replace(EMAIL_PATTERN, "[correo oculto]")
    .replace(UUID_PATTERN, "[identificador oculto]")
    .replace(JWT_PATTERN, "[token oculto]")
    .replace(SUPABASE_KEY_PATTERN, "[clave oculta]")
    .replace(BEARER_PATTERN, "Bearer [token oculto]")
    .replace(CREDENTIAL_PATTERN, "$1=[oculto]")
    .slice(0, 240)
    .trim();
}
