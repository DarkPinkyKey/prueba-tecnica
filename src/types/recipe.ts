export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeDraft = {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string;
};

export type RecipeWrite = Omit<
  Recipe,
  "id" | "user_id" | "created_at" | "updated_at"
>;
