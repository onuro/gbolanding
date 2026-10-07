// Server-only settings, read per request.
//
// Why not a static import.meta.env read: Vite replaces it with the value it
// saw at build time, so a secret read that way sits as a literal in the
// server bundle and cannot be rotated without a redeploy. A DEV-gated read of
// it is not enough either: the replacement happens before bundling, and an
// unminified bundle can keep the dead branch, literal and all.
//
// So production reads process.env only. In `astro dev`, where process.env does
// not get the values from `.env`, Astro puts them on import.meta.env, and this
// module looks them up by name. It never spells out a variable's name, so the
// build has no private value to inline here: in production the lookup below
// is never reached, and the object it would read holds public values only.
//
// Server code only. Never import this from a component <script>.

export function serverEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (import.meta.env.DEV) {
    const devValue = (import.meta.env as unknown as Record<string, unknown>)[name];
    if (typeof devValue === "string" && devValue.trim()) return devValue.trim();
  }
  return undefined;
}
