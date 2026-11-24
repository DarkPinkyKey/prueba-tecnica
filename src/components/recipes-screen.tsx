"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { useDialogFocus } from "@/components/use-dialog-focus";
import {
  createRecipe,
  deleteRecipe,
  listRecipes,
  toggleRecipeFavorite,
  updateRecipe,
} from "@/lib/supabase";
import {
  normalizeRecipeDraft,
  validateRecipeDraft,
} from "@/lib/recipe-validation";
import { getRecipeView, type RecipeSnapshot } from "@/lib/recipe-state";
import type { Recipe, RecipeDraft } from "@/types/recipe";

type RecipeState = {
  recipes: Recipe[];
  setRecipes: Dispatch<SetStateAction<Recipe[]>>;
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  retry: () => void;
};

function useRecipes(userId: string): RecipeState {
  const [snapshot, setSnapshot] = useState<RecipeSnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () => loadRecipes(userId, attempt, setSnapshot),
    [userId, attempt],
  );
  const view = getRecipeView(snapshot, userId, attempt);
  return {
    ...view,
    setRecipes: (update) =>
      setSnapshot((current) =>
        updateRecipesSnapshot(current, userId, attempt, update),
      ),
    setError: (error) =>
      setSnapshot((current) =>
        updateRecipeError(current, userId, attempt, error),
      ),
    retry: () => setAttempt((current) => current + 1),
  };
}

function loadRecipes(
  userId: string,
  attempt: number,
  setSnapshot: Dispatch<SetStateAction<RecipeSnapshot | null>>,
) {
  let active = true;
  void listRecipes()
    .then((recipes) => {
      if (active) setSnapshot({ userId, attempt, recipes, error: null });
    })
    .catch(() => {
      if (active) {
        setSnapshot({
          userId,
          attempt,
          recipes: [],
          error: "No se pudieron cargar tus recetas. Inténtalo de nuevo.",
        });
      }
    });
  return () => {
    active = false;
  };
}

function updateRecipesSnapshot(
  snapshot: RecipeSnapshot | null,
  userId: string,
  attempt: number,
  update: SetStateAction<Recipe[]>,
): RecipeSnapshot | null {
  if (!matchesRecipeRequest(snapshot, userId, attempt)) return snapshot;
  const recipes =
    typeof update === "function" ? update(snapshot.recipes) : update;
  return { ...snapshot, recipes };
}

function updateRecipeError(
  snapshot: RecipeSnapshot | null,
  userId: string,
  attempt: number,
  error: string | null,
): RecipeSnapshot | null {
  return matchesRecipeRequest(snapshot, userId, attempt)
    ? { ...snapshot, error }
    : snapshot;
}

function matchesRecipeRequest(
  snapshot: RecipeSnapshot | null,
  userId: string,
  attempt: number,
): snapshot is RecipeSnapshot {
  return snapshot?.userId === userId && snapshot.attempt === attempt;
}

export function RecipesScreen({ userId }: { userId: string }) {
  return <RecipesScreenForUser key={userId} userId={userId} />;
}

function RecipesScreenForUser({ userId }: { userId: string }) {
  const state = useRecipes(userId);
  const [formRecipe, setFormRecipe] = useState<Recipe | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const actions = {
    save: (draft: RecipeDraft) =>
      saveRecipe(draft, formRecipe, state, setBusy, setBusyMessage, setFormOpen),
    remove: () =>
      removeRecipe(pendingDelete, state, setBusy, setBusyMessage, setPendingDelete),
    favorite: (recipe: Recipe) =>
      changeFavorite(recipe, state, setBusy, setBusyMessage),
  };
  return (
    <RecipeWorkspace
      state={state}
      busy={busy}
      busyMessage={busyMessage}
      formRecipe={formRecipe}
      formOpen={formOpen}
      pendingDelete={pendingDelete}
      setFormRecipe={setFormRecipe}
      setFormOpen={setFormOpen}
      setPendingDelete={setPendingDelete}
      actions={actions}
    />
  );
}

type RecipeActions = {
  save: (draft: RecipeDraft) => Promise<void>;
  remove: () => Promise<void>;
  favorite: (recipe: Recipe) => Promise<void>;
};

async function saveRecipe(
  draft: RecipeDraft,
  recipe: Recipe | null,
  state: RecipeState,
  setBusy: (busy: boolean) => void,
  setBusyMessage: (message: string | null) => void,
  setFormOpen: (open: boolean) => void,
) {
  setBusy(true);
  setBusyMessage("Guardando receta...");
  state.setError(null);
  try {
    const saved = recipe
      ? await updateRecipe(recipe.id, draft)
      : await createRecipe(draft);
    state.setRecipes((current) =>
      recipe
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current],
    );
    setFormOpen(false);
  } catch {
    state.setError("No se pudo guardar la receta. Inténtalo de nuevo.");
  } finally {
    setBusy(false);
    setBusyMessage(null);
  }
}

async function removeRecipe(
  recipe: Recipe | null,
  state: RecipeState,
  setBusy: (busy: boolean) => void,
  setBusyMessage: (message: string | null) => void,
  setPendingDelete: (recipe: Recipe | null) => void,
) {
  if (!recipe) return;
  setBusy(true);
  setBusyMessage("Borrando receta...");
  state.setError(null);
  try {
    await deleteRecipe(recipe.id);
    state.setRecipes((current) => current.filter((item) => item.id !== recipe.id));
    setPendingDelete(null);
  } catch {
    state.setError("No se pudo borrar la receta. Inténtalo de nuevo.");
  } finally {
    setBusy(false);
    setBusyMessage(null);
  }
}

async function changeFavorite(
  recipe: Recipe,
  state: RecipeState,
  setBusy: (busy: boolean) => void,
  setBusyMessage: (message: string | null) => void,
) {
  setBusy(true);
  setBusyMessage("Actualizando favorito...");
  state.setError(null);
  try {
    const updated = await toggleRecipeFavorite(recipe.id);
    state.setRecipes((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  } catch {
    state.setError("No se pudo actualizar el favorito. Inténtalo de nuevo.");
  } finally {
    setBusy(false);
    setBusyMessage(null);
  }
}

type WorkspaceProps = {
  state: RecipeState;
  busy: boolean;
  busyMessage: string | null;
  formRecipe: Recipe | null;
  formOpen: boolean;
  pendingDelete: Recipe | null;
  setFormRecipe: (recipe: Recipe | null) => void;
  setFormOpen: (open: boolean) => void;
  setPendingDelete: (recipe: Recipe | null) => void;
  actions: RecipeActions;
};

function RecipeWorkspace(props: WorkspaceProps) {
  const openRecipeForm = () => {
    props.setFormRecipe(null);
    props.setFormOpen(true);
  };
  return (
    <section aria-labelledby="recipes-heading" className="mt-6 rounded-3xl border border-amber-200/70 bg-white/75 p-5 shadow-sm sm:mt-8 sm:p-7">
      <RecipeHeader busy={props.busy || props.state.loading} onCreate={openRecipeForm} />
      <Notice error={props.state.error} onRetry={props.state.retry} />
      <RecipeContent {...props} onCreate={openRecipeForm} />
      <RecipeOverlays {...props} />
    </section>
  );
}

function RecipeHeader({ busy, onCreate }: { busy: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">
          Tu colección
        </p>
        <h2 id="recipes-heading" tabIndex={-1} className="mt-1 text-3xl font-bold tracking-tight text-stone-950">
          Mis recetas
        </h2>
      </div>
      <button type="button" onClick={onCreate} disabled={busy} className="min-h-11 w-full rounded-xl bg-amber-800 px-5 py-2 font-semibold text-white transition hover:bg-amber-900 disabled:opacity-60 sm:w-auto">
        Añadir receta
      </button>
    </div>
  );
}

type RecipeContentProps = WorkspaceProps & { onCreate: () => void };

function RecipeContent({
  state,
  busy,
  busyMessage,
  onCreate,
  setFormRecipe,
  setFormOpen,
  setPendingDelete,
  actions,
}: RecipeContentProps) {
  const loadingFailed = state.error?.startsWith("No se pudieron cargar") ?? false;
  return (
    <>
      {busyMessage && <p role="status" className="mt-4 text-sm text-stone-600">{busyMessage}</p>}
      {state.loading ? (
        <p role="status" className="mt-6 text-stone-600">Cargando recetas...</p>
      ) : !loadingFailed ? (
        <RecipeList
          recipes={state.recipes}
          disabled={busy}
          onCreate={onCreate}
          onEdit={(recipe) => {
            setFormRecipe(recipe);
            setFormOpen(true);
          }}
          onDelete={setPendingDelete}
          onFavorite={actions.favorite}
        />
      ) : null}
    </>
  );
}

function RecipeOverlays(props: WorkspaceProps) {
  return (
    <>
      {props.formOpen && (
        <RecipeForm
          key={props.formRecipe?.id ?? "new"}
          recipe={props.formRecipe}
          busy={props.busy}
          onCancel={() => props.setFormOpen(false)}
          onSave={props.actions.save}
        />
      )}
      {props.pendingDelete && (
        <DeleteConfirmation
          recipe={props.pendingDelete}
          busy={props.busy}
          onCancel={() => props.setPendingDelete(null)}
          onConfirm={props.actions.remove}
        />
      )}
    </>
  );
}

function Notice({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p>{error}</p>
      {error.startsWith("No se pudieron cargar") && (
        <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
          Volver a intentar
        </button>
      )}
    </div>
  );
}

function RecipeList({
  recipes,
  disabled,
  onCreate,
  onEdit,
  onDelete,
  onFavorite,
}: {
  recipes: Recipe[];
  disabled: boolean;
  onCreate: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onFavorite: (recipe: Recipe) => void;
}) {
  if (recipes.length === 0) {
    return <EmptyRecipeList disabled={disabled} onCreate={onCreate} />;
  }
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard
            recipe={recipe}
            disabled={disabled}
            onEdit={() => onEdit(recipe)}
            onDelete={() => onDelete(recipe)}
            onFavorite={() => onFavorite(recipe)}
          />
        </li>
      ))}
    </ul>
  );
}

function EmptyRecipeList({ disabled, onCreate }: { disabled: boolean; onCreate: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center sm:p-8">
      <h3 className="text-lg font-semibold text-stone-900">Tu colección empieza aquí</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-700">
        Añade tu primera receta para guardarla y descubrir qué puedes cocinar con lo que tienes.
      </p>
      <button type="button" onClick={onCreate} disabled={disabled} className="mt-5 min-h-11 w-full rounded-xl bg-amber-800 px-5 py-2 font-semibold text-white transition hover:bg-amber-900 disabled:opacity-60 sm:w-auto">
        Añadir primera receta
      </button>
    </div>
  );
}

function RecipeCard({
  recipe,
  disabled,
  onEdit,
  onDelete,
  onFavorite,
}: {
  recipe: Recipe;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
}) {
  return (
    <article className="h-full min-w-0 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm">
      <RecipeCardHeading
        title={recipe.title}
        favorite={recipe.is_favorite}
        disabled={disabled}
        onFavorite={onFavorite}
      />
      <RecipeDetails recipe={recipe} />
      <RecipeCardActions disabled={disabled} onEdit={onEdit} onDelete={onDelete} />
    </article>
  );
}

function RecipeCardHeading({
  title,
  favorite,
  disabled,
  onFavorite,
}: {
  title: string;
  favorite: boolean;
  disabled: boolean;
  onFavorite: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h3 className="min-w-0 break-words text-xl font-bold text-stone-950">{title}</h3>
      <button
        type="button"
        aria-label={favorite ? "Quitar de favoritas" : "Marcar como favorita"}
        aria-pressed={favorite}
        onClick={onFavorite}
        disabled={disabled}
        className="min-h-11 min-w-11 rounded-full text-2xl text-amber-700 hover:bg-amber-50 disabled:opacity-50"
      >
        {favorite ? "★" : "☆"}
      </button>
    </div>
  );
}

function RecipeDetails({ recipe }: { recipe: Recipe }) {
  return (
    <>
      {recipe.description && <p className="mt-2 break-words text-sm text-stone-600">{recipe.description}</p>}
      <p className="mt-4 text-sm font-semibold text-stone-800">Ingredientes</p>
      <ul className="mt-1 list-inside list-disc text-sm text-stone-600">
        {recipe.ingredients.map((ingredient, index) => (
          <li key={`${ingredient}-${index}`} className="break-words">{ingredient}</li>
        ))}
      </ul>
      {recipe.instructions && (
        <p className="mt-4 break-words whitespace-pre-wrap text-sm text-stone-600">{recipe.instructions}</p>
      )}
    </>
  );
}

function RecipeCardActions({
  disabled,
  onEdit,
  onDelete,
}: {
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" onClick={onEdit} disabled={disabled} className="min-h-10 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50">
        Editar
      </button>
      <button type="button" onClick={onDelete} disabled={disabled} className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
        Borrar
      </button>
    </div>
  );
}

function RecipeForm({
  recipe,
  busy,
  onCancel,
  onSave,
}: {
  recipe: Recipe | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: RecipeDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<RecipeDraft>({
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    ingredients: recipe?.ingredients ?? [],
    instructions: recipe?.instructions ?? "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  return (
    <RecipeFormDialog recipe={recipe}>
      <RecipeFormFields
        recipe={recipe}
        draft={draft}
        busy={busy}
        error={validationError}
        setDraft={setDraft}
        setError={setValidationError}
        onCancel={onCancel}
        onSave={onSave}
      />
    </RecipeFormDialog>
  );
}

function RecipeFormDialog({
  recipe,
  children,
}: {
  recipe: Recipe | null;
  children: ReactNode;
}) {
  const dialogRef = useDialogFocus();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-stone-950/55 p-3 sm:items-center sm:p-4">
      <section ref={dialogRef} tabIndex={-1} data-focus-fallback="#recipes-heading" role="dialog" aria-modal="true" aria-labelledby="recipe-form-title" className="max-h-[90vh] w-full overscroll-contain overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:p-7">
        <h3 id="recipe-form-title" className="text-2xl font-bold text-stone-950">
          {recipe ? "Editar receta" : "Nueva receta"}
        </h3>
        {children}
      </section>
    </div>
  );
}

type RecipeFormFieldsProps = {
  recipe: Recipe | null;
  draft: RecipeDraft;
  busy: boolean;
  error: string | null;
  setDraft: Dispatch<SetStateAction<RecipeDraft>>;
  setError: (message: string | null) => void;
  onCancel: () => void;
  onSave: (draft: RecipeDraft) => Promise<void>;
};

function RecipeFormFields(props: RecipeFormFieldsProps) {
  const draft = props.draft;
  const submit = (event: FormEvent<HTMLFormElement>) =>
    submitRecipeForm(event, draft, props.setError, props.onSave);
  return (
    <form className="mt-5 space-y-4" onSubmit={submit}>
      <TextField id="recipe-title" label="Título" value={draft.title} required onChange={(title) => props.setDraft({ ...draft, title })} />
      <TextAreaField id="recipe-description" label="Descripción (opcional)" value={draft.description} onChange={(description) => props.setDraft({ ...draft, description })} />
      <TextAreaField id="recipe-ingredients" label="Ingredientes (uno por línea)" value={draft.ingredients.join("\n")} required onChange={(value) => props.setDraft({ ...draft, ingredients: value.split("\n") })} />
      <TextAreaField id="recipe-instructions" label="Preparación (opcional)" value={draft.instructions} onChange={(instructions) => props.setDraft({ ...draft, instructions })} />
      {props.error && <p role="alert" className="text-sm text-red-700">{props.error}</p>}
      <RecipeFormActions
        recipe={props.recipe}
        busy={props.busy}
        onCancel={props.onCancel}
      />
    </form>
  );
}

async function submitRecipeForm(
  event: FormEvent<HTMLFormElement>,
  draft: RecipeDraft,
  setError: (message: string | null) => void,
  onSave: (draft: RecipeDraft) => Promise<void>,
) {
  event.preventDefault();
  const error = validateRecipeDraft(draft);
  if (error) return setError(error);
  setError(null);
  await onSave(normalizeRecipeDraft(draft));
}

function RecipeFormActions({
  recipe,
  busy,
  onCancel,
}: {
  recipe: Recipe | null;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 w-full rounded-xl border border-stone-300 px-5 font-semibold text-stone-800 sm:w-auto">
        Cancelar
      </button>
      <button type="submit" disabled={busy} className="min-h-11 w-full rounded-xl bg-amber-800 px-5 font-semibold text-white hover:bg-amber-900 disabled:opacity-60 sm:w-auto">
        {busy ? "Guardando..." : recipe ? "Guardar cambios" : "Crear receta"}
      </button>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-stone-800">{label}</label>
      <input id={id} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100" />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-stone-800">{label}</label>
      <textarea id={id} value={value} required={required} rows={id === "recipe-ingredients" ? 4 : 3} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100" />
    </div>
  );
}

function DeleteConfirmation({
  recipe,
  busy,
  onCancel,
  onConfirm,
}: {
  recipe: Recipe;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-stone-950/55 p-3 sm:items-center sm:p-4">
      <section ref={dialogRef} tabIndex={-1} data-focus-fallback="#recipes-heading" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="w-full rounded-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:p-7">
        <h3 id="delete-title" className="text-xl font-bold text-stone-950">Borrar receta</h3>
        <p id="delete-description" className="mt-2 break-words text-sm text-stone-600">
          ¿Seguro que quieres borrar «{recipe.title}»? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 w-full rounded-xl border border-stone-300 px-5 font-semibold text-stone-800 sm:w-auto">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 w-full rounded-xl bg-red-700 px-5 font-semibold text-white disabled:opacity-60 sm:w-auto">
            {busy ? "Borrando..." : "Sí, borrar"}
          </button>
        </div>
      </section>
    </div>
  );
}
