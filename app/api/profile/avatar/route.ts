import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AVATAR_BUCKET = 'avatars'
const AUTH_COOKIE_SUFFIX = '-auth-token'

const misconfiguredResponse = NextResponse.json(
  { error: 'Supabase environment variables are not configured on the server.' },
  { status: 500 },
)

const missingAuthResponse = NextResponse.json(
  { error: 'Not authenticated' },
  { status: 401 },
)

const BASE64_PREFIX = 'base64-'

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(paddingLength)
  return Buffer.from(padded, 'base64').toString('utf8')
}

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const extractSupabaseSessionCookie = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const allCookies = cookieStore.getAll()
  const target = allCookies.find((cookie) => cookie.name.includes(AUTH_COOKIE_SUFFIX))
  if (!target) return null

  const baseName = target.name.split('.')[0]
  const directValue = cookieStore.get(baseName)?.value

  const chunkValues: string[] = []

  if (directValue) {
    const decoded = safeDecodeURIComponent(directValue)
    chunkValues.push(decoded)
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[avatar-upload] cookie chunk (direct) length', {
        name: baseName,
        length: decoded.length,
      })
    }
  } else {
    for (let index = 0; index < 10; index += 1) {
      const chunkValue = cookieStore.get(`${baseName}.${index}`)?.value
      if (!chunkValue) break
      const decoded = safeDecodeURIComponent(chunkValue)
      chunkValues.push(decoded)
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[avatar-upload] cookie chunk length', {
          name: `${baseName}.${index}`,
          length: decoded.length,
        })
      }
    }
  }

  if (chunkValues.length === 0) return null

  let combinedValue = chunkValues.join('')
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[avatar-upload] combined cookie prefix', combinedValue.slice(0, 20))
  }
  if (combinedValue.startsWith(BASE64_PREFIX)) {
    combinedValue = decodeBase64Url(combinedValue.slice(BASE64_PREFIX.length))
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[avatar-upload] decoded cookie prefix', combinedValue.slice(0, 20))
    }
  }

  try {
    const session = JSON.parse(combinedValue)
    if (!session) return null

    const ctor = session?.constructor?.name
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[avatar-upload] parsed session structure', {
        ctor,
        hasAccess: Boolean(session?.access_token ?? session?.[0]),
        hasRefresh: Boolean(session?.refresh_token ?? session?.[1]),
      })
    }

    if (Array.isArray(session)) {
      if (typeof session[0] !== 'string') return null
      return {
        accessToken: session[0] as string,
        refreshToken: typeof session[1] === 'string' ? (session[1] as string) : null,
      }
    }

    if (typeof session === 'object' && typeof session.access_token === 'string') {
      return {
        accessToken: session.access_token,
        refreshToken: typeof session.refresh_token === 'string' ? session.refresh_token : null,
      }
    }

    return null
  } catch (error) {
    console.warn('Failed to parse Supabase auth cookie', error)
    return null
  }
}

const fetchUserWithAccessToken = async (supabaseUrl: string, supabaseAnonKey: string, accessToken: string) => {
  try {
    const authClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    const { data, error } = await authClient.auth.getUser(accessToken)
    if (error) {
      console.warn('Supabase auth lookup failed', { message: error.message })
      return null
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[avatar-upload] supabase auth user id', data.user?.id)
    }
    return data.user ?? null
  } catch (error) {
    console.error('Supabase auth lookup threw', error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || null

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error('Avatar upload route missing env vars', {
        hasUrl: Boolean(supabaseUrl),
        hasService: Boolean(serviceRoleKey),
        hasAnon: Boolean(supabaseAnonKey),
      })
      return misconfiguredResponse
    }

    const cookieStore = await cookies()
    if (process.env.NODE_ENV !== 'production') {
      // Helpful for diagnosing missing auth cookies during development.
      console.debug('[avatar-upload] incoming cookies', cookieStore.getAll().map((cookie) => cookie.name))
    }
    const session = extractSupabaseSessionCookie(cookieStore)
    if (!session?.accessToken) {
      console.warn('Avatar upload: missing or invalid Supabase session cookie')
      return missingAuthResponse
    }

    const user = await fetchUserWithAccessToken(supabaseUrl, supabaseAnonKey, session.accessToken)
    if (!user?.id) {
      console.warn('Avatar upload: Supabase user lookup failed')
      return missingAuthResponse
    }
    const userId = String(user.id)

    const formData = await request.formData()
    const file = formData.get('file')
    const previousPath = formData.get('oldPath')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing avatar file' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const filePath = `${userId}/${uniqueSuffix}.${extension}`

    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const uploadResult = await adminClient.storage.from(AVATAR_BUCKET).upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })

    if (uploadResult.error) {
      return NextResponse.json({ error: uploadResult.error.message }, { status: 400 })
    }

    if (previousPath && typeof previousPath === 'string' && previousPath.startsWith(`${userId}/`)) {
      const { error: removeError } = await adminClient.storage.from(AVATAR_BUCKET).remove([previousPath])
      if (removeError) {
        console.warn('Failed to remove previous avatar', removeError)
      }
    }

    const { data: publicUrlData } = adminClient.storage.from(AVATAR_BUCKET).getPublicUrl(uploadResult.data.path)

    return NextResponse.json(
      {
        path: uploadResult.data.path,
        publicUrl: publicUrlData.publicUrl,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error('Avatar upload route error', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to upload avatar' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || null

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error('Avatar delete route missing env vars', {
        hasUrl: Boolean(supabaseUrl),
        hasService: Boolean(serviceRoleKey),
        hasAnon: Boolean(supabaseAnonKey),
      })
      return misconfiguredResponse
    }

    const cookieStore = await cookies()
    const session = extractSupabaseSessionCookie(cookieStore)
    if (!session?.accessToken) {
      console.warn('Avatar delete: missing or invalid Supabase session cookie')
      return missingAuthResponse
    }

    const user = await fetchUserWithAccessToken(supabaseUrl, supabaseAnonKey, session.accessToken)
    if (!user?.id) {
      console.warn('Avatar delete: Supabase user lookup failed')
      return missingAuthResponse
    }
    const userId = String(user.id)

    const { path } = await request.json().catch(() => ({ path: null }))
    if (!path || typeof path !== 'string' || !path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: 'Invalid avatar path' }, { status: 400 })
    }

    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { error } = await adminClient.storage.from(AVATAR_BUCKET).remove([path])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Avatar delete route error', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to delete avatar' },
      { status: 500 },
    )
  }
}
