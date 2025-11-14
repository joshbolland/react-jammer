'use client'

import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { createSupabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function Navbar() {
  const { user, loading } = useAuth()
  const supabase = createSupabaseClient()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(
    null
  )
  const desktopUserMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileUserMenuRef = useRef<HTMLDivElement | null>(null)
  const linkBase =
    'text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 rounded-full px-3 py-1.5'
  const userMetadata = (user?.user_metadata ?? {}) as {
    avatar_url?: string | null
    display_name?: string | null
    full_name?: string | null
  }
  const profileAvatarUrl =
    typeof profile?.avatar_url === 'string' && profile.avatar_url.length > 0
      ? profile.avatar_url
      : null
  const metadataAvatarUrl =
    typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.length > 0
      ? userMetadata.avatar_url
      : null
  const avatarUrl = profileAvatarUrl ?? metadataAvatarUrl ?? null
  const profileDisplayName =
    typeof profile?.display_name === 'string' && profile.display_name.trim().length > 0
      ? profile.display_name.trim()
      : null
  const userDisplayName =
    profileDisplayName ??
    userMetadata.display_name ??
    userMetadata.full_name ??
    user?.email ??
    'Your account'
  const userInitial =
    userDisplayName && userDisplayName.length > 0
      ? userDisplayName.charAt(0).toUpperCase()
      : 'Y'
  const userEmail = user?.email ?? ''
  const renderAvatar = (size: 'md' | 'lg' = 'md') => {
    const dimension = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
    const textSize = size === 'lg' ? 'text-lg' : 'text-base'
    return (
      <span
        className={`flex ${dimension} items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700 ring-2 ring-white`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${userDisplayName} avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className={`font-semibold ${textSize}`}>{userInitial}</span>
        )}
      </span>
    )
  }

  useEffect(() => {
    let active = true

    const loadUnreadCount = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/messages/unread', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to fetch unread messages')
        const data = await response.json()
        if (active) {
          setUnreadCount(typeof data.total === 'number' ? data.total : Number(data.total ?? 0))
        }
      } catch (error) {
        console.error('Error fetching unread messages count:', error)
        if (active) {
          setUnreadCount(0)
        }
      }
    }

    if (!user) {
      setUnreadCount(0)
      return () => {
        active = false
      }
    }

    loadUnreadCount()

    window.addEventListener('dm:read', loadUnreadCount)

    const channel = supabase
      .channel(`messages-navbar:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'room_type=eq.dm',
        },
        (payload) => {
          const newMessage = payload.new as { sender_id: string }
          if (newMessage.sender_id !== user.id) {
            void loadUnreadCount()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dms',
        },
        (payload) => {
          const updatedDm = payload.new as { user_a: string; user_b: string }
          if (updatedDm.user_a === user.id || updatedDm.user_b === user.id) {
            void loadUnreadCount()
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      window.removeEventListener('dm:read', loadUnreadCount)
      supabase.removeChannel(channel)
    }
  }, [supabase, user])

  useEffect(() => {
    let active = true
    if (!user) {
      setProfile(null)
      return () => {
        active = false
      }
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single()
        if (!active) return
        if (error) {
          console.error('Error loading user profile for navbar:', error)
          setProfile(null)
          return
        }
        setProfile(data ?? null)
      } catch (error) {
        console.error('Unexpected error loading user profile for navbar:', error)
        if (active) {
          setProfile(null)
        }
      }
    }

    loadProfile()

    const channel = supabase
      .channel(`profiles-navbar:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (!active) return
          const updated = payload.new as { avatar_url: string | null; display_name: string | null }
          setProfile(updated ?? null)
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabase, user])

  useEffect(() => {
    if (!userMenuOpen) return
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (
        (desktopUserMenuRef.current && desktopUserMenuRef.current.contains(target)) ||
        (mobileUserMenuRef.current && mobileUserMenuRef.current.contains(target))
      ) {
        return
      }
      setUserMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickAway)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickAway)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen])

  useEffect(() => {
    if (!user) {
      setUserMenuOpen(false)
    }
  }, [user])

  useEffect(() => {
    if (!menuOpen) {
      setUserMenuOpen(false)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mt-4 flex h-16 items-center justify-between rounded-full border border-primary-100/70 bg-white/70 px-6 shadow-[0_25px_70px_-40px_rgba(112,66,255,0.3)] backdrop-blur">
            <Link href="/" className="text-xl font-semibold tracking-tight text-primary-600">
              Jammer
            </Link>
            <div className="h-8 w-24 animate-pulse rounded-full bg-primary-100/60" />
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-4 flex items-center justify-between rounded-full border border-primary-100/60 bg-white/80 px-5 py-3 shadow-[0_28px_90px_-48px_rgba(112,66,255,0.35)] backdrop-blur-lg">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-primary-600 transition-colors hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Jammer
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link href="/jams" className={linkBase}>
                  Jams
                </Link>
                <Link
                  href="/messages"
                  className={`${linkBase} relative flex items-center gap-2`}
                >
                  <span>Messages</span>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/profile/connections" className={linkBase}>
                  Connections
                </Link>
                <div className="relative" ref={desktopUserMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full border border-primary-100/70 bg-white/90 pl-1 pr-2 text-sm font-semibold text-slate-600 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] transition hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    {renderAvatar()}
                    <svg
                      className={`h-4 w-4 text-slate-400 transition ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 z-10 mt-2 w-48 rounded-2xl border border-primary-50 bg-white/95 p-2 text-sm text-slate-600 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.35)] backdrop-blur"
                      role="menu"
                      aria-label="Account menu"
                    >
                      <Link
                        href="/profile/edit"
                        className="block rounded-xl px-3 py-2 hover:bg-primary-50"
                        onClick={() => {
                          setUserMenuOpen(false)
                        }}
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        className="block w-full rounded-xl px-3 py-2 text-left text-primary-600 hover:bg-primary-50"
                        onClick={() => {
                          setUserMenuOpen(false)
                          void handleSignOut()
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth" className="btn-secondary">
                  Sign In
                </Link>
                <Link href="/auth?mode=signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden rounded-full p-2.5 text-slate-600 transition-colors hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        <div
          className={`md:hidden ${menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-all duration-200`}
        >
          <div className="mt-3 space-y-2 rounded-3xl border border-primary-100/70 bg-white/95 p-4 shadow-[0_25px_70px_-45px_rgba(112,66,255,0.35)] backdrop-blur">
            {user ? (
              <>
                <div
                  className="rounded-2xl border border-primary-100/70 bg-white/90 p-4"
                  ref={mobileUserMenuRef}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="flex items-center gap-3">
                      {renderAvatar('lg')}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{userDisplayName}</p>
                        {userEmail ? (
                          <p className="text-xs text-slate-500">{userEmail}</p>
                        ) : null}
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 text-slate-400 transition ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div className="mt-3 space-y-1 text-sm text-slate-600" role="menu" aria-label="Account menu">
                      <Link
                        href="/profile/edit"
                        className="block rounded-xl px-3 py-2 hover:bg-primary-50"
                        onClick={() => {
                          setUserMenuOpen(false)
                          setMenuOpen(false)
                        }}
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        className="block w-full rounded-xl px-3 py-2 text-left text-primary-600 hover:bg-primary-50"
                        onClick={() => {
                          setUserMenuOpen(false)
                          setMenuOpen(false)
                          void handleSignOut()
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
                <Link href="/jams" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Jams
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center justify-between rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Messages</span>
                  {unreadCount > 0 && (
                    <span className="ml-3 inline-flex min-w-[2rem] items-center justify-center rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/profile/connections" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Connections
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/auth?mode=signup" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
