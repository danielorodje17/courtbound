import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// PKCE flow with sessionStorage prevents two recurring issues:
// 1. "implicit" flow in supabase-js v2.104+ returns malformed JWTs intermittently
// 2. localStorage wiping during OAuth redirect (Safari ITP, private mode)
// sessionStorage survives the Google redirect (same tab) but clears on tab close —
// perfect for the code verifier that PKCE needs during the exchange.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: false,
    storage: window.sessionStorage,
  },
});
