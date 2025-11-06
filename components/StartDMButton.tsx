'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface StartDMButtonProps {
  otherUserId: string
}

export function StartDMButton({ otherUserId }: StartDMButtonProps) {
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

  return (
    <button
      onClick={handleStartDM}
      disabled={loading}
      className="btn-primary"
    >
      {loading ? 'Starting...' : 'Send Message'}
    </button>
  )
}

