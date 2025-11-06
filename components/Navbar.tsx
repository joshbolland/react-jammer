'use client'

import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { createSupabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Navbar() {
  const { user, loading } = useAuth()
  const supabase = createSupabaseClient()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const linkBase =
    'text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 rounded-full px-3 py-1.5'

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
                <Link href="/requests" className={linkBase}>
                  Requests
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
                <Link href="/profile/edit" className={linkBase}>
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="btn-secondary"
                >
                  Sign Out
                </button>
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
                <Link href="/jams" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Jams
                </Link>
                <Link href="/requests" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Requests
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
                <Link href="/profile/edit" className="block rounded-2xl px-4 py-2 text-sm text-slate-600 hover:bg-primary-50" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleSignOut()
                    setMenuOpen(false)
                  }}
                  className="w-full rounded-2xl px-4 py-2 text-left text-sm text-primary-600 hover:bg-primary-50"
                >
                  Sign Out
                </button>
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
