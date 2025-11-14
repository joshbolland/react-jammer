'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface StartDMButtonProps {
  otherUserId: string
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  className?: string
}

export function StartDMButton({
  otherUserId,
  label = 'Send Message',
  variant = 'primary',
  size = 'md',
  className = '',
}: StartDMButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handleStartDM = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/messages/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId }),
      })

      const data = await response.json()

      if (response.ok && data.dmId) {
        router.push(`/messages/${data.dmId}`)
      } else {
        console.error('Error creating DM:', data.error)
      }
    } catch (error) {
      console.error('Error creating DM:', error)
    } finally {
      setLoading(false)
    }
  }
  const baseClass =
    'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2'
  const variantClass =
    variant === 'primary'
      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-[0_18px_40px_-20px_rgba(112,66,255,0.65)] hover:from-primary-500/90 hover:to-primary-600/90'
      : variant === 'secondary'
        ? 'border border-primary-100 bg-white/95 text-primary-600 shadow-[0_14px_36px_-28px_rgba(112,66,255,0.45)] hover:bg-white'
        : 'border border-slate-200/70 bg-white/80 text-slate-700 shadow-[0_14px_30px_-26px_rgba(24,39,75,0.35)] hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-600'
  const sizeClass =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2 text-sm'

  return (
    <button
      onClick={handleStartDM}
      disabled={loading}
      className={[baseClass, variantClass, sizeClass, className].filter(Boolean).join(' ')}
    >
      {loading ? 'Starting...' : label}
    </button>
  )
}
