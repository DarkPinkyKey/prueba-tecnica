import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import type { PantryIngredient, PantryRow } from "@/types/pantry";
import type { Recipe, RecipeDraft, RecipeWrite } from "@/types/recipe";
import { mapPantryRow, mapPantryRows } from "./pantry-mapping";
import { formatSupabaseError } from "./supabase-errors";
import {
  normalizePantryIngredient,
  validatePantryIngredient,
} from "./pantry-validation";

type RecipeTable = {
  Row: Recipe;
  Insert: Omit<Recipe, "id" | "created_at" | "minutes"> & {
    id?: string;
    created_at?: string;
    minutes?: number | null;
  };
  Update: Partial<RecipeTable["Insert"]>;
  Relationships: [];
};

type PantryTable = {
  Row: PantryRow;
  Insert: Omit<PantryRow, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<PantryTable["Insert"]>;
  Relationships: [];
};

type Database = {
  public: {
    Tables: {
      pantry: PantryTable;
      recipes: RecipeTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AddPantryIngredientResult =
  | { status: "added"; ingredient: PantryIngredient }
  | { status: "already-exists" };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey,
);

export const supabase = createClient<Database>(
  supabaseUrl || "http://127.0.0.1:54321",
  supabaseAnonKey || "missing-anon-key",
);

export function subscribeToAuthChanges(
  onChange: (session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });
  return data.subscription;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw formatSupabaseError(error);
  return data.session;
}

export async function authenticateUser(
  mode: "login" | "register",
  email: string,
  password: string,
): Promise<void> {
  const credentials = { email, password };
  const result =
    mode === "login"
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);
  if (result.error) throw formatSupabaseError(result.error);
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw formatSupabaseError(error);
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw formatSupabaseError(error);
  if (!data.user) throw new Error("Se requiere una sesión activa.");
  return data.user.id;
}

function toRecipeWrite(draft: RecipeDraft): RecipeWrite {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    ingredients: draft.ingredients.map((item) => item.trim()).filter(Boolean),
    instructions: draft.instructions.trim(),
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw formatSupabaseError(error);
  return data;
}

export async function createRecipe(draft: RecipeDraft): Promise<Recipe> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from("recipes")
    .insert({ ...toRecipeWrite(draft), favorite: false, user_id: userId })
    .select("*")
    .single();
  if (error) throw formatSupabaseError(error);
  return data;
}

export async function updateRecipe(
  recipeId: string,
  draft: RecipeDraft,
): Promise<Recipe> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from("recipes")
    .update(toRecipeWrite(draft))
    .eq("id", recipeId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw formatSupabaseError(error);
  return data;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", userId);
  if (error) throw formatSupabaseError(error);
}

export async function listPantryIngredients(
  expectedUserId?: string,
): Promise<PantryIngredient[]> {
  const authenticatedUserId = await getAuthenticatedUserId();
  if (expectedUserId !== undefined && expectedUserId !== authenticatedUserId) {
    throw new Error("La sesión ha cambiado. Vuelve a cargar tu despensa.");
  }
  const userId = expectedUserId ?? authenticatedUserId;
  const { data, error } = await supabase
    .from("pantry")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw formatSupabaseError(error);
  return mapPantryRows(data);
}

export async function addPantryIngredient(
  ingredient: string,
): Promise<AddPantryIngredientResult> {
  const validationError = validatePantryIngredient(ingredient);
  if (validationError) throw new Error(validationError);
  const userId = await getAuthenticatedUserId();
  const normalized = normalizePantryIngredient(ingredient);
  const { data: current, error: readError } = await supabase
    .from("pantry")
    .select("*")
    .eq("user_id", userId);
  if (readError) throw formatSupabaseError(readError);
  const duplicate = current.find(
    (item) => normalizePantryIngredient(item.name) === normalized,
  );
  if (duplicate) return { status: "already-exists" };
  const { data, error } = await supabase
    .from("pantry")
    .insert({ name: normalized, user_id: userId })
    .select("*")
    .single();
  if (error?.code === "23505") return { status: "already-exists" };
  if (error) throw formatSupabaseError(error);
  return { status: "added", ingredient: mapPantryRow(data) };
}

export async function deletePantryIngredient(ingredientId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const { error } = await supabase
    .from("pantry")
    .delete()
    .eq("id", ingredientId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw formatSupabaseError(error);
}

export async function toggleRecipeFavorite(
  recipeId: string,
): Promise<Recipe> {
  const userId = await getAuthenticatedUserId();
  const { data: current, error: readError } = await supabase
    .from("recipes")
    .select("favorite")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .single();
  if (readError) throw formatSupabaseError(readError);
  const { data, error } = await supabase
    .from("recipes")
    .update({ favorite: !current.favorite })
    .eq("id", recipeId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw formatSupabaseError(error);
  return data;
}
