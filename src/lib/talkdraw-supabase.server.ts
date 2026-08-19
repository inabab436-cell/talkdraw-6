// SERVER-ONLY Supabase connection layer for Talkdraw.
// The `.server.ts` extension blocks this module from every client bundle.
// Import it only inside a createServerFn `.handler()` or a server route handler:
//   const { getPublicClient } = await import("@/lib/talkdraw-supabase.server");
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function readSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing secret: ${name}. Add it in the project secrets, then republish.`,
    );
  }
  return value;
}

function isOpaqueApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// New-format Supabase keys are opaque strings, not JWTs; sending them as a
// bearer token makes PostgREST fail with "Expected 3 parts in JWT; got 1".
function createSupabaseFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isOpaqueApiKey(apiKey) && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

const baseOptions = {
  auth: {
    storage: undefined,
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

/**
 * Public read client — uses TALKDRAW_SB_ANON.
 * Row Level Security is fully enforced (acts as the `anon` role),
 * so only rows exposed by `TO anon` policies are readable.
 */
export function getPublicClient(): SupabaseClient<Database> {
  const url = readSecret("TALKDRAW_SB_URL");
  const anonKey = readSecret("TALKDRAW_SB_ANON");

  return createClient<Database>(url, anonKey, {
    ...baseOptions,
    global: { fetch: createSupabaseFetch(anonKey) },
  });
}

/**
 * Privileged client — uses TALKDRAW_SB_SERVICE.
 * BYPASSES Row Level Security. Use only for trusted server-side work
 * (admin tasks, verified webhooks, maintenance jobs) after checking the caller.
 * Never expose this client, its data, or the key to the browser.
 */
export function getServiceClient(): SupabaseClient<Database> {
  const url = readSecret("TALKDRAW_SB_URL");
  const serviceKey = readSecret("TALKDRAW_SB_SERVICE");

  return createClient<Database>(url, serviceKey, {
    ...baseOptions,
    global: { fetch: createSupabaseFetch(serviceKey) },
  });
}
