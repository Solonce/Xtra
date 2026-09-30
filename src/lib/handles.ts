// Handle rules shared by the onboarding form (client) and the server actions.

export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,22}[a-z0-9])?$/;

const RESERVED = new Set([
  "admin", "api", "app", "demo", "explore", "help", "login", "logout", "me", "new",
  "root", "settings", "signin", "signup", "spotify", "support", "u", "welcome", "xtra",
]);

export function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

/** Returns an error message, or null when the handle is acceptable. */
export function handleError(handle: string): string | null {
  if (handle.length < 3) return "At least 3 characters.";
  if (handle.length > 24) return "24 characters max.";
  if (!HANDLE_PATTERN.test(handle)) return "Lowercase letters, numbers, - and _ only, starting and ending with a letter or number.";
  if (RESERVED.has(handle) || handle.startsWith("demo")) return "That handle is reserved.";
  return null;
}

export function suggestHandle(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/, "");
  return slug.length >= 3 && !RESERVED.has(slug) && !slug.startsWith("demo") ? slug : `listener-${slug || "x"}`.slice(0, 24);
}

export const VISIBILITY = {
  public: { label: "Public", hint: "Anyone can see it, and it’s listed on Explore." },
  unlisted: { label: "Unlisted", hint: "Anyone with the link can see it. Not listed or indexed." },
  private: { label: "Private", hint: "Only you, when signed in." },
} as const;
export type Visibility = keyof typeof VISIBILITY;
