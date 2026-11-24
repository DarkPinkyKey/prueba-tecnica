"use client";

import type { FormEvent, Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import {
  addPantryIngredient,
  deletePantryIngredient,
  listPantryIngredients,
} from "@/lib/supabase";
import { getPantryAddFeedback } from "@/lib/pantry-feedback";
import { getPantryView, type PantrySnapshot } from "@/lib/pantry-state";
import { validatePantryIngredient } from "@/lib/pantry-validation";
import type { PantryIngredient } from "@/types/pantry";

type PantryState = {
  ingredients: PantryIngredient[];
  setIngredients: Dispatch<SetStateAction<PantryIngredient[]>>;
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  retry: () => void;
};

function usePantry(userId: string): PantryState {
  const [snapshot, setSnapshot] = useState<PantrySnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const saveResult = (ingredients: PantryIngredient[], error: string | null) => {
      if (active) setSnapshot({ userId, attempt, ingredients, error });
    };
    void listPantryIngredients(userId).then(
      (items) => saveResult(items, null),
      () => saveResult([], "No se pudo cargar tu despensa. Inténtalo de nuevo."),
    );
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const view = getPantryView(snapshot, userId, attempt);
  return {
    ...view,
    setIngredients: (update) =>
      setSnapshot((current) => {
        if (!matchesPantryRequest(current, userId, attempt)) return current;
        const ingredients =
          typeof update === "function" ? update(current.ingredients) : update;
        return { ...current, ingredients };
      }),
    setError: (error) =>
      setSnapshot((current) =>
        matchesPantryRequest(current, userId, attempt) ? { ...current, error } : current,
      ),
    retry: () => {
      setAttempt((current) => current + 1);
    },
  };
}

function matchesPantryRequest(
  snapshot: PantrySnapshot | null,
  userId: string,
  attempt: number,
): snapshot is PantrySnapshot {
  return snapshot?.userId === userId && snapshot.attempt === attempt;
}

export function PantryScreen({ userId }: { userId: string }) {
  return <PantryScreenForUser key={userId} userId={userId} />;
}

function PantryScreenForUser({ userId }: { userId: string }) {
  const state = usePantry(userId);
  const [ingredient, setIngredient] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<PantryIngredient | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section aria-labelledby="pantry-heading" className="mt-8">
      <PantryHeading />
      <PantryForm
        ingredient={ingredient}
        busy={busy || state.loading}
        onChange={setIngredient}
        onSubmit={(event) =>
          submitPantryForm(event, ingredient, state, setIngredient, setBusy)
        }
      />
      {busy && (
        <p role="status" className="mt-3 text-sm text-stone-600">
          {pendingRemoval ? "Quitando ingrediente..." : "Guardando ingrediente..."}
        </p>
      )}
      <PantryErrorNotice error={state.error} onRetry={state.retry} />
      <PantryContent
        state={state}
        busy={busy}
        onRemoveRequest={setPendingRemoval}
      />
      <PendingRemovalDialog
        ingredient={pendingRemoval}
        state={state}
        busy={busy}
        setBusy={setBusy}
        setPendingRemoval={setPendingRemoval}
      />
    </section>
  );
}

function PantryHeading() {
  return (
    <header className="mb-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">
        Lo que tienes en casa
      </p>
      <h2 id="pantry-heading" className="mt-1 text-3xl font-bold text-stone-950">
        Mi despensa
      </h2>
    </header>
  );
}

function PendingRemovalDialog({
  ingredient,
  state,
  busy,
  setBusy,
  setPendingRemoval,
}: {
  ingredient: PantryIngredient | null;
  state: PantryState;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setPendingRemoval: (ingredient: PantryIngredient | null) => void;
}) {
  if (!ingredient) return null;
  return (
    <RemovePantryConfirmation
      ingredient={ingredient}
      busy={busy}
      onCancel={() => setPendingRemoval(null)}
      onConfirm={() => removePantryIngredient(ingredient, state, setBusy, setPendingRemoval)}
    />
  );
}

async function submitPantryForm(
  event: FormEvent<HTMLFormElement>,
  ingredient: string,
  state: PantryState,
  setIngredient: (ingredient: string) => void,
  setBusy: (busy: boolean) => void,
) {
  event.preventDefault();
  const validationError = validatePantryIngredient(ingredient);
  if (validationError) return state.setError(validationError);
  await savePantryIngredient(ingredient, state, setIngredient, setBusy);
}

async function savePantryIngredient(
  ingredient: string,
  state: PantryState,
  setIngredient: (ingredient: string) => void,
  setBusy: (busy: boolean) => void,
) {
  setBusy(true);
  state.setError(null);
  try {
    const result = await addPantryIngredient(ingredient);
    if (result.status === "already-exists") {
      state.setError(getPantryAddFeedback(result));
      return;
    }
    state.setIngredients((current) =>
      current.some((item) => item.id === result.ingredient.id)
        ? current
        : [...current, result.ingredient],
    );
    setIngredient("");
  } catch {
    state.setError("No se pudo añadir el ingrediente. Inténtalo de nuevo.");
  } finally {
    setBusy(false);
  }
}

async function removePantryIngredient(
  ingredient: PantryIngredient | null,
  state: PantryState,
  setBusy: (busy: boolean) => void,
  setPendingRemoval: (ingredient: PantryIngredient | null) => void,
) {
  if (!ingredient) return;
  setBusy(true);
  state.setError(null);
  try {
    await deletePantryIngredient(ingredient.id);
    state.setIngredients((current) =>
      current.filter((item) => item.id !== ingredient.id),
    );
    setPendingRemoval(null);
  } catch {
    state.setError("No se pudo quitar el ingrediente. Inténtalo de nuevo.");
  } finally {
    setBusy(false);
  }
}

function PantryForm({
  ingredient,
  busy,
  onChange,
  onSubmit,
}: {
  ingredient: string;
  busy: boolean;
  onChange: (ingredient: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div className="flex-1">
        <label htmlFor="pantry-ingredient" className="mb-1.5 block text-sm font-semibold text-stone-800">
          Ingrediente
        </label>
        <input
          id="pantry-ingredient"
          value={ingredient}
          onChange={(event) => onChange(event.target.value)}
          disabled={busy}
          maxLength={100}
          className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:opacity-60"
          placeholder="Por ejemplo, tomate"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 self-end rounded-xl bg-amber-700 px-5 py-2 font-semibold text-white hover:bg-amber-800 disabled:opacity-60 sm:mb-0"
      >
        {busy ? "Guardando..." : "Añadir ingrediente"}
      </button>
    </form>
  );
}

function PantryErrorNotice({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (!error) return null;
  const canRetry = error.startsWith("No se pudo cargar");
  return (
    <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p>{error}</p>
      {canRetry && (
        <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
          Volver a intentar
        </button>
      )}
    </div>
  );
}

function PantryContent({
  state,
  busy,
  onRemoveRequest,
}: {
  state: PantryState;
  busy: boolean;
  onRemoveRequest: (ingredient: PantryIngredient) => void;
}) {
  if (state.loading) {
    return <p role="status" className="mt-5 text-stone-600">Cargando despensa...</p>;
  }
  if (state.error?.startsWith("No se pudo cargar")) return null;
  if (state.ingredients.length === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center text-stone-600">
        Aún no tienes ingredientes en tu despensa.
      </p>
    );
  }
  return (
    <PantryList
      ingredients={state.ingredients}
      disabled={busy}
      onRemoveRequest={onRemoveRequest}
    />
  );
}

function PantryList({
  ingredients,
  disabled,
  onRemoveRequest,
}: {
  ingredients: PantryIngredient[];
  disabled: boolean;
  onRemoveRequest: (ingredient: PantryIngredient) => void;
}) {
  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ingredients.map((item) => (
        <li key={item.id}>
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3">
            <span className="break-words font-medium text-stone-900">{item.ingredient}</span>
            <button
              type="button"
              onClick={() => onRemoveRequest(item)}
              disabled={disabled}
              aria-label={`Quitar ${item.ingredient} de la despensa`}
              className="min-h-10 shrink-0 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RemovePantryConfirmation({
  ingredient,
  busy,
  onCancel,
  onConfirm,
}: {
  ingredient: PantryIngredient;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-stone-950/50 p-0 sm:items-center sm:p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pantry-delete-title"
        aria-describedby="pantry-delete-description"
        className="w-full rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <h3 id="pantry-delete-title" className="text-xl font-bold text-stone-950">
          Quitar ingrediente
        </h3>
        <p id="pantry-delete-description" className="mt-2 text-sm text-stone-600">
          ¿Quieres quitar «{ingredient.ingredient}» de tu despensa?
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-xl border border-stone-300 px-5 font-semibold text-stone-800">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 rounded-xl bg-red-700 px-5 font-semibold text-white disabled:opacity-60">
            {busy ? "Quitando..." : "Sí, quitar"}
          </button>
        </div>
      </section>
    </div>
  );
}
