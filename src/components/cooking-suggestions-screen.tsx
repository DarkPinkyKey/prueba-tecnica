"use client";

import { useEffect, useState } from "react";
import { calculateRecipeAvailability } from "@/lib/recipe-availability";
import { listPantryIngredients, listRecipes } from "@/lib/supabase";
import type { PantryIngredient } from "@/types/pantry";
import type { Recipe } from "@/types/recipe";

type SuggestionsSnapshot = {
  userId: string;
  attempt: number;
  recipes: Recipe[];
  pantry: PantryIngredient[];
  error: string | null;
};

type SuggestionsState = {
  recipes: Recipe[];
  pantry: PantryIngredient[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

function useCookingSuggestions(userId: string): SuggestionsState {
  const [snapshot, setSnapshot] = useState<SuggestionsSnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadSuggestions(userId, attempt, (next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const current =
    snapshot?.userId === userId && snapshot.attempt === attempt ? snapshot : null;
  return {
    recipes: current?.recipes ?? [],
    pantry: current?.pantry ?? [],
    loading: current === null,
    error: current?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  };
}

async function loadSuggestions(
  userId: string,
  attempt: number,
  save: (snapshot: SuggestionsSnapshot) => void,
): Promise<void> {
  try {
    const [recipes, pantry] = await Promise.all([
      listRecipes(),
      listPantryIngredients(userId),
    ]);
    if (recipes.some((recipe) => recipe.user_id !== userId)) {
      throw new Error("La sesión ha cambiado.");
    }
    save({ userId, attempt, recipes, pantry, error: null });
  } catch {
    save({
      userId,
      attempt,
      recipes: [],
      pantry: [],
      error: "No se pudieron cargar tus recetas y despensa. Inténtalo de nuevo.",
    });
  }
}

export function CookingSuggestionsScreen({ userId }: { userId: string }) {
  return <CookingSuggestionsForUser key={userId} userId={userId} />;
}

function CookingSuggestionsForUser({ userId }: { userId: string }) {
  const state = useCookingSuggestions(userId);
  return (
    <section aria-labelledby="cooking-heading" className="mt-8">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">
            Ideas con lo que tienes
          </p>
          <h2 id="cooking-heading" className="mt-1 text-3xl font-bold text-stone-950">
            ¿Qué puedo cocinar?
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Disponibilidad calculada según los ingredientes de tu despensa.
          </p>
        </div>
        <button
          type="button"
          onClick={state.retry}
          disabled={state.loading}
          className="min-h-11 rounded-xl border border-amber-700 px-5 py-2 font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.loading ? "Actualizando..." : "Actualizar sugerencias"}
        </button>
      </header>
      <SuggestionsContent state={state} />
    </section>
  );
}

function SuggestionsContent({ state }: { state: SuggestionsState }) {
  if (state.loading) {
    return <p role="status" className="text-stone-600">Cargando sugerencias...</p>;
  }
  if (state.error) return <SuggestionsError error={state.error} onRetry={state.retry} />;
  if (state.recipes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center text-stone-600">
        Aún no tienes recetas para comparar con tu despensa.
      </p>
    );
  }
  return <SuggestionsList recipes={state.recipes} pantry={state.pantry} />;
}

function SuggestionsError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p>{error}</p>
      <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={onRetry}>
        Volver a intentar
      </button>
    </div>
  );
}

function SuggestionsList({
  recipes,
  pantry,
}: {
  recipes: Recipe[];
  pantry: PantryIngredient[];
}) {
  const pantryNames = pantry.map((item) => item.ingredient);
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <SuggestionCard recipe={recipe} pantryNames={pantryNames} />
        </li>
      ))}
    </ul>
  );
}

function SuggestionCard({
  recipe,
  pantryNames,
}: {
  recipe: Recipe;
  pantryNames: string[];
}) {
  const availability = calculateRecipeAvailability(recipe.ingredients, pantryNames);
  return (
    <article className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm">
      <h3 className="break-words text-xl font-bold text-stone-950">{recipe.title}</h3>
      {availability === null ? (
        <p className="mt-4 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
          Sin ingredientes registrados; no se puede calcular la disponibilidad.
        </p>
      ) : (
        <AvailabilityMeter title={recipe.title} percentage={availability} />
      )}
    </article>
  );
}

function AvailabilityMeter({
  title,
  percentage,
}: {
  title: string;
  percentage: number;
}) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700">Ingredientes disponibles</p>
        <p className="font-bold text-amber-800">{percentage} %</p>
      </div>
      <div
        role="progressbar"
        aria-label={`Ingredientes disponibles para ${title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="mt-2 h-3 overflow-hidden rounded-full bg-amber-100"
      >
        <div className="h-full rounded-full bg-amber-700" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
