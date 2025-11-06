import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from './database.types'

// Server-side Supabase client (Next 16 compatible)
export const createSupabaseServerClient = (): SupabaseClient<Database> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        const store = await (cookies as any)()
        return store.get(name)?.value
      },
      async set(name: string, value: string, options?: CookieOptions) {
        const store = await (cookies as any)()
        store.set({ name, value, ...options })
      },
      async remove(name: string, options?: CookieOptions) {
        const store = await (cookies as any)()
        store.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })
}

// Route Handlers (app/api/*)
export const createSupabaseRouteClient = (): SupabaseClient<Database> => {
  return createSupabaseServerClient()
}

// Admin client (for server-side operations with service role key)
export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

