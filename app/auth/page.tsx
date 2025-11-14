'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase-client'
import Link from 'next/link'

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="card">
              <div className="text-center text-gray-600">Loading...</div>
            </div>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  )
}

function AuthPageContent() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam === 'signup') {
      setMode('signup')
    }
  }, [searchParams])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/onboarding')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'spotify') => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {mode === 'signup' ? 'Join Jammer' : 'Welcome Back'}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary"
            >
              {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                aria-label="Sign in with Google"
              >
                <span className="text-sm font-medium">Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignIn('spotify')}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                aria-label="Sign in with Spotify"
              >
                <span className="text-sm font-medium">Spotify</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <Link
                  href="/auth"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth?mode=signup"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign up
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
