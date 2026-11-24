"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { validateAuthCredentials } from "@/lib/auth-validation";
import {
  authenticateUser,
  getCurrentSession,
  isSupabaseConfigured,
  signOutCurrentUser,
  subscribeToAuthChanges,
} from "@/lib/supabase";
import { RecipesScreen } from "@/components/recipes-screen";
import { PantryScreen } from "@/components/pantry-screen";

type AuthMode = "login" | "register";
type ErrorSetter = (message: string) => void;
type SessionSubscription = ReturnType<typeof subscribeToAuthChanges>;

function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const subscription = listenForAuthChanges(() => isMounted, setSession, setError);
    void loadCurrentSession(() => isMounted, setSession, setError, setInitializing);
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { session, error, setError, initializing };
}

function listenForAuthChanges(
  isMounted: () => boolean,
  setSession: (session: Session | null) => void,
  setError: ErrorSetter,
): SessionSubscription | null {
  try {
    return subscribeToAuthChanges((nextSession) => {
      if (!isMounted()) return;
      try {
        setSession(nextSession);
      } catch {
        setError("No se pudo actualizar el estado de la sesión.");
      }
    });
  } catch {
    void Promise.resolve().then(() => {
      if (isMounted()) setError("No se pudo escuchar los cambios de sesión.");
    });
    return null;
  }
}

async function loadCurrentSession(
  isMounted: () => boolean,
  setSession: (session: Session | null) => void,
  setError: ErrorSetter,
  setInitializing: (initializing: boolean) => void,
): Promise<void> {
  try {
    const session = await getCurrentSession();
    if (!isMounted()) return;
    setSession(session);
  } catch {
    if (isMounted()) setError("No se pudo comprobar el estado de la sesión.");
  } finally {
    if (isMounted()) setInitializing(false);
  }
}

async function submitCredentials(
  event: FormEvent<HTMLFormElement>,
  mode: AuthMode,
  email: string,
  password: string,
  setError: (message: string | null) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  event.preventDefault();
  setError(null);
  const validationError = validateAuthCredentials({ email, password });
  if (validationError) return setError(validationError);
  if (!isSupabaseConfigured) {
    return setError("La conexión con Supabase no está configurada.");
  }

  setLoading(true);
  try {
    await authenticateUser(mode, email.trim(), password);
  } catch {
    setError(authFailureMessage(mode));
  } finally {
    setLoading(false);
  }
}

function authFailureMessage(mode: AuthMode): string {
  return mode === "login"
    ? "No se pudo iniciar sesión. Revisa tus datos."
    : "No se pudo completar el registro.";
}

async function signOut(
  setError: (message: string | null) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  setLoading(true);
  setError(null);
  try {
    await signOutCurrentUser();
  } catch {
    setError("No se pudo cerrar la sesión.");
  } finally {
    setLoading(false);
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, error, setError, initializing } = useAuthSession();

  if (initializing) return <LoadingScreen />;
  if (session) {
    return (
      <SignedInScreen
        session={session}
        error={error}
        loading={loading}
        onSignOut={() => signOut(setError, setLoading)}
      />
    );
  }

  return (
    <AuthCard
      mode={mode}
      email={email}
      password={password}
      error={error}
      loading={loading}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={(event) =>
        submitCredentials(event, mode, email, password, setError, setLoading)
      }
      onSwitchMode={() => {
        setMode((current) => (current === "login" ? "register" : "login"));
        setError(null);
      }}
    />
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <p role="status" className="text-sm font-semibold text-stone-700">
        Comprobando sesión...
      </p>
    </main>
  );
}

type SignedInScreenProps = {
  session: Session;
  error: string | null;
  loading: boolean;
  onSignOut: () => void;
};

function SignedInScreen({ session, error, loading, onSignOut }: SignedInScreenProps) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-5 rounded-3xl border border-amber-200/70 bg-white p-6 shadow-xl shadow-amber-950/10 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <BrandName />
            <h1 className="mt-3 text-3xl font-bold text-stone-950">Sesión iniciada</h1>
            <p className="mt-2 break-all text-stone-600">
              Has iniciado sesión como <strong>{session.user.email}</strong>.
            </p>
          </div>
          <SignOutButton loading={loading} onClick={onSignOut} />
        </header>
        <ErrorMessage error={error} className="mt-5" />
        <PantryScreen userId={session.user.id} />
        <RecipesScreen userId={session.user.id} />
      </div>
    </main>
  );
}

function BrandName() {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
      ¿Qué cocino hoy?
    </p>
  );
}

type AuthCardProps = {
  mode: AuthMode;
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchMode: () => void;
};

function AuthCard(props: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200/70 bg-white shadow-xl shadow-amber-950/10">
        <AuthHeader mode={props.mode} />
        <AuthForm {...props} />
      </section>
    </main>
  );
}

function AuthHeader({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  return (
    <header className="bg-amber-100 px-6 py-7 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">
        ¿Qué cocino hoy?
      </p>
      <h1 className="mt-2 text-3xl font-bold text-stone-950">
        {isLogin ? "Bienvenido" : "Crear cuenta"}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        {isLogin
          ? "Inicia sesión para preparar tus próximas comidas."
          : "Regístrate para guardar tus recetas y tu despensa."}
      </p>
    </header>
  );
}

function AuthForm(props: AuthCardProps) {
  return (
    <form className="space-y-5 p-6 sm:p-8" onSubmit={props.onSubmit}>
      <EmailField value={props.email} disabled={props.loading} onChange={props.onEmailChange} />
      <PasswordField
        mode={props.mode}
        value={props.password}
        disabled={props.loading}
        onChange={props.onPasswordChange}
      />
      <ErrorMessage error={props.error} />
      <SubmitButton mode={props.mode} loading={props.loading} />
      <ModeToggle mode={props.mode} loading={props.loading} onClick={props.onSwitchMode} />
    </form>
  );
}

type FieldProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function EmailField({ value, disabled, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor="email" className="mb-2 block text-sm font-semibold text-stone-800">
        Correo electrónico
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
        placeholder="tu@correo.com"
      />
    </div>
  );
}

function PasswordField({
  mode,
  value,
  disabled,
  onChange,
}: FieldProps & { mode: AuthMode }) {
  return (
    <div>
      <label htmlFor="password" className="mb-2 block text-sm font-semibold text-stone-800">
        Contraseña
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
        placeholder="Mínimo 6 caracteres"
      />
    </div>
  );
}

function ErrorMessage({
  error,
  className = "",
}: {
  error: string | null;
  className?: string;
}) {
  if (!error) return null;
  return (
    <p role="alert" className={`${className} rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700`}>
      {error}
    </p>
  );
}

function SubmitButton({ mode, loading }: { mode: AuthMode; loading: boolean }) {
  const isLogin = mode === "login";
  return (
    <button
      type="submit"
      disabled={loading}
      className="h-12 w-full rounded-xl bg-amber-700 px-5 font-semibold text-white shadow-md shadow-amber-800/20 transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Procesando..." : isLogin ? "Iniciar sesión" : "Registrarse"}
    </button>
  );
}

function ModeToggle({
  mode,
  loading,
  onClick,
}: {
  mode: AuthMode;
  loading: boolean;
  onClick: () => void;
}) {
  const isLogin = mode === "login";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full text-sm font-semibold text-amber-800 hover:text-amber-950 disabled:opacity-60"
    >
      {isLogin ? "¿No tienes cuenta? Crear una cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
    </button>
  );
}

function SignOutButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-6 h-12 w-full rounded-xl bg-stone-900 px-5 font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:w-auto"
    >
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
