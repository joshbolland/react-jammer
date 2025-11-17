'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const [heartbeatId, setHeartbeatId] = useState<NodeJS.Timeout | null>(null)

  const updatePresence = async (state: 'online' | 'offline') => {
    try {
      await fetch('/api/profile/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
    } catch (error) {
      console.warn('[AuthProvider] presence update failed', error)
    }
  }

  const startHeartbeat = () => {
    if (heartbeatId) return
    const id = setInterval(() => updatePresence('online'), 1000 * 60 * 3)
    setHeartbeatId(id)
  }

  const stopHeartbeat = () => {
    if (heartbeatId) {
      clearInterval(heartbeatId)
      setHeartbeatId(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        void updatePresence('online')
        startHeartbeat()
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        void updatePresence('online')
        startHeartbeat()
      } else {
        void updatePresence('offline')
        stopHeartbeat()
      }
    })

    const handleUnload = () => void updatePresence('offline')
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleUnload)
      stopHeartbeat()
    }
  }, [supabase, heartbeatId])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
