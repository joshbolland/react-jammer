// This shim preserves backwards compatibility while avoiding `next/headers`
// leaking into client bundles. Import directly from `lib/supabase-client` in
// Client Components and from `lib/supabase-server` in Server Components.
export { createSupabaseClient } from './supabase-client'
export { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server'

