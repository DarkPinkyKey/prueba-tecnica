import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PantryIngredient } from "@/types/pantry";
import type { Recipe, RecipeDraft } from "@/types/recipe";
import {
  addPantryIngredient,
  authenticateUser,
  createRecipe,
  deletePantryIngredient,
  deleteRecipe,
  getCurrentSession,
  listPantryIngredients,
  listRecipes,
  signOutCurrentUser,
  subscribeToAuthChanges,
  toggleRecipeFavorite,
  updateRecipe,
} from "./supabase";

type QueryResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

const mocks = vi.hoisted(() => {
  const queryResults: QueryResult[] = [];
  const authCallbacks: Array<(event: string, session: unknown) => void> = [];
  const subscription = { unsubscribe: vi.fn() };
  const query = createQueryMock(queryResults);

  return {
    queryResults,
    query,
    from: vi.fn(() => query),
    authCallbacks,
    subscription,
    auth: createAuthMock(authCallbacks, subscription),
  };
});

function createQueryMock(queryResults: QueryResult[]) {
  const nextQueryResult = () =>
    queryResults.shift() ?? { data: null, error: null };
  const query = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(() => Promise.resolve(nextQueryResult())),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(nextQueryResult()).then(resolve, reject),
  };
  setQueryMethodsToReturnQuery(query);
  return query;
}

function setQueryMethodsToReturnQuery(query: ReturnType<typeof createQueryMock>) {
  query.select.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
}

function createAuthMock(
  authCallbacks: Array<(event: string, session: unknown) => void>,
  subscription: { unsubscribe: ReturnType<typeof vi.fn> },
) {
  return {
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) =>
      registerAuthCallback(callback, authCallbacks, subscription),
    ),
    getSession: vi.fn(async () => ({
      data: { session: null },
      error: null as { message: string } | null,
    })),
    signInWithPassword: vi.fn(async () => ({
      error: null as { message: string } | null,
    })),
    signUp: vi.fn(async () => ({
      error: null as { message: string } | null,
    })),
    signOut: vi.fn(async () => ({
      error: null as { message: string } | null,
    })),
    getUser: vi.fn(async () => ({
      data: { user: { id: "user-1" } as { id: string } | null },
      error: null as { message: string } | null,
    })),
  };
}

function registerAuthCallback(
  callback: (event: string, session: unknown) => void,
  authCallbacks: Array<(event: string, session: unknown) => void>,
  subscription: { unsubscribe: ReturnType<typeof vi.fn> },
) {
  authCallbacks.push(callback);
  return { data: { subscription } };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: mocks.auth,
    from: mocks.from,
  }),
}));

const pantryIngredient: PantryIngredient = {
  id: "pantry-1",
  user_id: "user-1",
  ingredient: "Tomate",
};

const recipe: Recipe = {
  id: "recipe-1",
  user_id: "user-1",
  title: "Sopa",
  description: null,
  ingredients: ["agua"],
  instructions: null,
  is_favorite: false,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const draft: RecipeDraft = {
  title: " Sopa ",
  description: " ",
  ingredients: [" agua ", " "],
  instructions: " ",
};

function queueQueryResults(...results: QueryResult[]) {
  mocks.queryResults.push(...results);
}

function setAuthenticatedUser(user: { id: string } | null) {
  mocks.auth.getUser.mockImplementation(async () => ({
    data: { user },
    error: null,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryResults.length = 0;
  mocks.authCallbacks.length = 0;
  setAuthenticatedUser({ id: "user-1" });
  mocks.auth.getSession.mockImplementation(async () => ({
    data: { session: null },
    error: null,
  }));
  mocks.auth.signInWithPassword.mockImplementation(async () => ({ error: null }));
  mocks.auth.signUp.mockImplementation(async () => ({ error: null }));
  mocks.auth.signOut.mockImplementation(async () => ({ error: null }));
});

describe("Supabase authentication", () => {
  registerAuthSubscriptionTest();
  registerCurrentSessionTest();
  registerAuthCredentialsTest();
  registerSignOutTest();
});

function registerAuthSubscriptionTest() {
  it("returns the auth subscription", () => {
    const onChange = vi.fn();
    const session = { access_token: "token" };
    const subscription = subscribeToAuthChanges(onChange);
    mocks.authCallbacks[0]?.("SIGNED_IN", session);

    expect(subscription).toBe(mocks.subscription);
    expect(onChange).toHaveBeenCalledWith(session);
    expect(mocks.auth.onAuthStateChange).toHaveBeenCalledOnce();
  });
}

function registerCurrentSessionTest() {
  it("returns the current session and propagates session errors", async () => {
    const session = { access_token: "token" };
    mocks.auth.getSession.mockImplementation(async () => ({
      data: { session },
      error: null,
    }) as never);

    await expect(getCurrentSession()).resolves.toBe(session);
    mocks.auth.getSession.mockImplementation(async () => ({
      data: { session: null },
      error: { message: "session failed" },
    }));
    await expect(getCurrentSession()).rejects.toThrow("session failed");
  });
}

function registerAuthCredentialsTest() {
  it("supports login and registration and propagates auth errors", async () => {
    await authenticateUser("login", "user@example.com", "secret");
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret",
    });

    await authenticateUser("register", "user@example.com", "secret");
    expect(mocks.auth.signUp).toHaveBeenCalledOnce();
    mocks.auth.signUp.mockImplementation(async () => ({
      error: { message: "registration failed" },
    }));
    await expect(
      authenticateUser("register", "user@example.com", "secret"),
    ).rejects.toThrow("registration failed");
  });
}

function registerSignOutTest() {
  it("signs out successfully and propagates sign-out errors", async () => {
    await expect(signOutCurrentUser()).resolves.toBeUndefined();
    mocks.auth.signOut.mockImplementation(async () => ({
      error: { message: "sign-out failed" },
    }));

    await expect(signOutCurrentUser()).rejects.toThrow("sign-out failed");
  });
}

describe("Supabase recipe operations", () => {
  registerListRecipesTest();
  registerCreateRecipeTest();
  registerUpdateRecipeTest();
  registerDeleteRecipeTest();
  registerToggleFavoriteTest();
});

describe("Supabase pantry operations", () => {
  registerListPantryIngredientsTest();
  registerAddPantryIngredientTest();
  registerPantryWhitespaceDuplicateTest();
  registerPantryConflictTest();
  registerPantryInsertErrorsTest();
  registerDeletePantryIngredientTest();
});

function registerListPantryIngredientsTest() {
  it("lists only the authenticated user's ingredients and handles errors", async () => {
    queueQueryResults({ data: [pantryIngredient], error: null });
    await expect(listPantryIngredients()).resolves.toEqual([pantryIngredient]);
    expect(mocks.from).toHaveBeenCalledWith("pantry");
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user-1");

    setAuthenticatedUser(null);
    await expect(listPantryIngredients()).rejects.toThrow(
      "Se requiere una sesión activa.",
    );

    setAuthenticatedUser({ id: "user-1" });
    mocks.from.mockClear();
    await expect(listPantryIngredients("user-2")).rejects.toThrow(
      "La sesión ha cambiado.",
    );
    expect(mocks.from).not.toHaveBeenCalled();

    queueQueryResults({ data: null, error: { message: "pantry read failed" } });
    await expect(listPantryIngredients()).rejects.toThrow("pantry read failed");
  });
}

function registerAddPantryIngredientTest() {
  it("normalizes new ingredients and avoids case-insensitive duplicates", async () => {
    const saved = { ...pantryIngredient, ingredient: "tomate cherry" };
    queueQueryResults({ data: [], error: null }, { data: saved, error: null });
    await expect(addPantryIngredient("  tomate   cherry ")).resolves.toEqual({
      status: "added",
      ingredient: saved,
    });
    expect(mocks.query.insert).toHaveBeenCalledWith({
      ingredient: "tomate cherry",
      user_id: "user-1",
    });
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user-1");

    queueQueryResults({ data: [pantryIngredient], error: null });
    await expect(addPantryIngredient(" tomate ")).resolves.toEqual({
      status: "already-exists",
    });
    expect(mocks.query.insert).toHaveBeenCalledOnce();
  });
}

function registerPantryWhitespaceDuplicateTest() {
  it("recognizes existing ingredients with collapsed internal whitespace", async () => {
    const existing = { ...pantryIngredient, ingredient: "TOMATE  Cherry" };
    queueQueryResults({ data: [existing], error: null });

    await expect(addPantryIngredient("tomate   cherry")).resolves.toEqual({
      status: "already-exists",
    });
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });
}

function registerPantryConflictTest() {
  it("reports a unique-conflict race as an explicit duplicate result", async () => {
    queueQueryResults(
      { data: [], error: null },
      { data: null, error: { message: "duplicate key", code: "23505" } },
    );

    await expect(addPantryIngredient("Tomate")).resolves.toEqual({
      status: "already-exists",
    });
  });
}

function registerPantryInsertErrorsTest() {
  it("rejects empty names and propagates pantry insert and lookup errors", async () => {
    await expect(addPantryIngredient("  ")).rejects.toThrow(
      "Escribe el nombre de un ingrediente.",
    );
    setAuthenticatedUser(null);
    await expect(addPantryIngredient("Pera")).rejects.toThrow(
      "Se requiere una sesión activa.",
    );
    setAuthenticatedUser({ id: "user-1" });
    queueQueryResults({ data: null, error: { message: "pantry lookup failed" } });
    await expect(addPantryIngredient("Pera")).rejects.toThrow(
      "pantry lookup failed",
    );

    queueQueryResults(
      { data: [], error: null },
      { data: null, error: { message: "pantry insert failed" } },
    );
    await expect(addPantryIngredient("Pera")).rejects.toThrow(
      "pantry insert failed",
    );
  });
}

function registerDeletePantryIngredientTest() {
  it("removes an ingredient within the user's scope and reports failures", async () => {
    queueQueryResults({ data: { id: pantryIngredient.id }, error: null });
    await expect(deletePantryIngredient(pantryIngredient.id)).resolves.toBeUndefined();
    expect(mocks.query.eq).toHaveBeenCalledWith("id", pantryIngredient.id);
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user-1");

    queueQueryResults({ data: null, error: { message: "pantry delete failed" } });
    await expect(deletePantryIngredient(pantryIngredient.id)).rejects.toThrow(
      "pantry delete failed",
    );

    setAuthenticatedUser(null);
    await expect(deletePantryIngredient(pantryIngredient.id)).rejects.toThrow(
      "Se requiere una sesión activa.",
    );
  });
}

function registerListRecipesTest() {
  it("lists recipes and rejects unauthenticated sessions or query errors", async () => {
    queueQueryResults({ data: [recipe], error: null });
    await expect(listRecipes()).resolves.toEqual([recipe]);

    setAuthenticatedUser(null);
    await expect(listRecipes()).rejects.toThrow("Se requiere una sesión activa.");

    setAuthenticatedUser({ id: "user-1" });
    queueQueryResults({ data: null, error: { message: "list failed" } });
    await expect(listRecipes()).rejects.toThrow("list failed");
  });
}

function registerCreateRecipeTest() {
  it("creates recipes and reports insert errors", async () => {
    queueQueryResults({ data: recipe, error: null });
    await expect(createRecipe(draft)).resolves.toEqual(recipe);
    expect(mocks.query.insert).toHaveBeenCalledWith({
      title: "Sopa",
      description: null,
      ingredients: ["agua"],
      instructions: null,
      is_favorite: false,
      user_id: "user-1",
    });

    queueQueryResults({ data: null, error: { message: "create failed" } });
    await expect(createRecipe(draft)).rejects.toThrow("create failed");
  });
}

function registerUpdateRecipeTest() {
  it("updates recipes and reports update errors", async () => {
    queueQueryResults({ data: recipe, error: null });
    await expect(updateRecipe("recipe-1", draft)).resolves.toEqual(recipe);

    queueQueryResults({ data: null, error: { message: "update failed" } });
    await expect(updateRecipe("recipe-1", draft)).rejects.toThrow("update failed");
  });
}

function registerDeleteRecipeTest() {
  it("deletes recipes and reports delete errors", async () => {
    queueQueryResults({ data: null, error: null });
    await expect(deleteRecipe("recipe-1")).resolves.toBeUndefined();

    queueQueryResults({ data: null, error: { message: "delete failed" } });
    await expect(deleteRecipe("recipe-1")).rejects.toThrow("delete failed");
  });
}

function registerToggleFavoriteTest() {
  it("toggles favorites and handles read and update errors", async () => {
    queueQueryResults(
      { data: { is_favorite: false }, error: null },
      { data: { ...recipe, is_favorite: true }, error: null },
    );
    await expect(toggleRecipeFavorite("recipe-1")).resolves.toEqual({
      ...recipe,
      is_favorite: true,
    });

    queueQueryResults({ data: null, error: { message: "favorite read failed" } });
    await expect(toggleRecipeFavorite("recipe-1")).rejects.toThrow(
      "favorite read failed",
    );

    queueQueryResults(
      { data: { is_favorite: false }, error: null },
      { data: null, error: { message: "favorite update failed" } },
    );
    await expect(toggleRecipeFavorite("recipe-1")).rejects.toThrow(
      "favorite update failed",
    );
  });
}
