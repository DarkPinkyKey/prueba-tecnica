export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string;
  minutes: number | null;
  favorite: boolean;
  created_at: string;
};

export type RecipeDraft = {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string;
};

export type RecipeWrite = Pick<
  Recipe,
  "title" | "description" | "ingredients" | "instructions"
>;
