import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import type { Recipe, RecipeDraft, RecipeWrite } from "@/types/recipe";

type RecipeTable = {
  Row: Recipe;
  Insert: Omit<Recipe, "id" | "created_at" | "updated_at"> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<RecipeTable["Insert"]>;
  Relationships: [];
};

type Database = {
  public: {
    Tables: {
      recipes: RecipeTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

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
  if (error) throw new Error(error.message);
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
  if (result.error) throw new Error(result.error.message);
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Se requiere una sesión activa.");
  return data.user.id;
}

function toRecipeWrite(draft: RecipeDraft): Omit<RecipeWrite, "is_favorite"> {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    ingredients: draft.ingredients.map((item) => item.trim()).filter(Boolean),
    instructions: draft.instructions.trim() || null,
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createRecipe(draft: RecipeDraft): Promise<Recipe> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from("recipes")
    .insert({ ...toRecipeWrite(draft), is_favorite: false, user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function toggleRecipeFavorite(
  recipeId: string,
): Promise<Recipe> {
  const userId = await getAuthenticatedUserId();
  const { data: current, error: readError } = await supabase
    .from("recipes")
    .select("is_favorite")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .single();
  if (readError) throw new Error(readError.message);
  const { data, error } = await supabase
    .from("recipes")
    .update({ is_favorite: !current.is_favorite })
    .eq("id", recipeId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
