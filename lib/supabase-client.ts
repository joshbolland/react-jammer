import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

// Client-side Supabase client factory
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    // Use raw encoding so Next.js route handlers can parse the auth cookie without decoding.
    cookieEncoding: 'raw',
  })
}

