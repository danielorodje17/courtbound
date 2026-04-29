import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// PKCE flow with sessionStorage:
// - persistSession: true  → session IS stored in sessionStorage after the PKCE exchange,
//   so getSession() reliably returns the session in the callback page.
// - storage: sessionStorage → avoids localStorage (Safari ITP wipes it during redirects);
//   sessionStorage survives the Google redirect in the same tab but clears on tab close.
// - flowType: "pkce"       → deterministic, no malformed-JWT risk from implicit flow.
// NOTE: Do NOT change persistSession back to false — with false, the session is only
// in memory and the getSession() fallback in SupabaseAuthCallback returns null intermittently.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    storage: window.sessionStorage,
  },
});
