'use client'

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import type { ConnectionStatus } from '@/lib/types'
import { showToast } from '@/lib/toast'
import { useAuth } from './AuthProvider'

type ButtonSize = 'md' | 'sm'

interface ConnectButtonProps {
  targetUserId: string
  targetDisplayName: string
  initialStatus?: ConnectionStatus
  initialConnectionId?: string | null
  contextJamId?: string
  label?: string
  size?: ButtonSize
  className?: string
}

export function ConnectButton({
  targetUserId,
  targetDisplayName,
  initialStatus = 'none',
  initialConnectionId,
  contextJamId,
  label = 'Connect',
  size = 'md',
  className = '',
}: ConnectButtonProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus)
  const [connectionId, setConnectionId] = useState<string | null>(initialConnectionId ?? null)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(!initialStatus || initialStatus === 'none')
  const [rippleKey, setRippleKey] = useState(0)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const [hovering, setHovering] = useState(false)
  const isSelf = status === 'self' || user?.id === targetUserId

  const fetchStatus = useCallback(async () => {
    if (!user || isSelf) {
      setStatusLoading(false)
      return
    }
    setStatusLoading(true)
    try {
      const response = await fetch(`/api/connections?targetUserId=${targetUserId}`, {
        cache: 'no-store',
      })
      if (response.status === 401) {
        // Not logged in, treat as no connection without spamming errors
        setStatus('none')
        setConnectionId(null)
        return
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        console.warn('[ConnectButton] status fetch failed', payload?.error ?? response.status)
        return
      }
      const payload = await response.json()
      setStatus(payload.status ?? 'none')
      setConnectionId(payload.connection?.id ?? null)
    } catch (error) {
      console.error('[ConnectButton] status error', error)
    } finally {
      setStatusLoading(false)
    }
  }, [targetUserId, user, isSelf])

  useEffect(() => {
    if (!user || initialStatus !== 'none') {
      setStatusLoading(false)
      return
    }
    fetchStatus()
  }, [fetchStatus, user, initialStatus])

  const triggerRipple = () => {
    setRippleKey((prev) => prev + 1)
  }

  const sendRequest = async () => {
    if (!user) {
      router.push('/auth?mode=signin')
      return
    }

    setLoading(true)
    triggerRipple()
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, contextJamId }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to connect')
      }
      setStatus(payload.status ?? 'pending')
      setConnectionId(payload.connection?.id ?? null)

      if (payload.status === 'connected') {
        showToast(`You’re now connected. Keep the rhythm going!`, 'success')
        if (payload.dmId) {
          router.prefetch(`/messages/${payload.dmId}`)
        }
      } else {
        showToast(`🎶 Connection request sent to ${targetDisplayName}.`, 'info')
      }
    } catch (error: any) {
      showToast(error.message ?? 'Could not send connection request.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const acceptRequest = async () => {
    if (!connectionId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'connected' }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to accept connection')
      }
      setStatus('connected')
      if (payload.dmId) {
        router.prefetch(`/messages/${payload.dmId}`)
      }
      showToast(`You’re now connected with ${targetDisplayName}.`, 'success')
    } catch (error: any) {
      showToast(error.message ?? 'Could not accept connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const removeConnection = async (reason: 'cancel' | 'disconnect') => {
    if (!connectionId) {
      setStatus('none')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Failed to update connection')
      }
      setStatus('none')
      setConnectionId(null)
      showToast(
        reason === 'cancel'
          ? `Request withdrawn. Ready to reconnect when you are.`
          : `Connection removed.`,
        'info'
      )
    } catch (error: any) {
      showToast(
        error.message ?? 'Something went wrong removing this connection.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const buttonLabel = useMemo(() => {
    if (isSelf) return 'This is you'
    if (status === 'connected') return 'Connected'
    if (status === 'pending') return 'Pending...'
    if (status === 'incoming') return 'Accept & Jam'
    return label
  }, [status, label, isSelf])

  const hoverAwareLabel = useMemo(() => {
    if (status === 'connected' && hovering) return 'Disconnect'
    return buttonLabel
  }, [buttonLabel, status, hovering])

  const sizeClasses =
    size === 'sm'
      ? 'text-xs px-3 py-1.5 rounded-full'
      : 'text-sm px-4 py-2 rounded-full'

  const stateClasses = useMemo(() => {
    if (isSelf) {
      return 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
    }

    switch (status) {
      case 'connected':
        return 'border border-primary-200/70 bg-white text-primary-700 shadow-[0_14px_30px_-24px_rgba(108,75,230,0.4)] hover:border-primary-300'
      case 'pending':
        return 'border border-primary-100 bg-primary-50/70 text-primary-700 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.35)]'
      case 'incoming':
        return 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-[0_20px_45px_-22px_rgba(112,66,255,0.8)] hover:from-primary-500/95 hover:to-primary-600/95'
      default:
        return 'bg-gradient-to-r from-[#9c4dff] via-[#7c3aed] to-[#6130d5] text-white shadow-[0_22px_50px_-25px_rgba(109,76,205,0.85)] hover:shadow-[0_25px_65px_-28px_rgba(109,76,205,0.9)] connect-button-metronome'
    }
  }, [status, isSelf])

  const icon = useMemo(() => {
    if (status === 'connected' && hovering) return <X className="h-4 w-4 text-rose-500" />
    if (status === 'connected') return <Check className="h-4 w-4 text-primary-500" />
    if (status === 'incoming') return <Sparkles className="h-4 w-4" />
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />
    return <Sparkles className="h-4 w-4" />
  }, [status, hovering, loading])

  const disabled = loading || statusLoading || isSelf
  const buttonAction = () => {
    if (status === 'connected') {
      setConfirmingDisconnect(true)
    } else if (status === 'incoming') {
      acceptRequest()
    } else if (status === 'pending') {
      // noop – allow cancel via link
    } else {
      sendRequest()
    }
  }

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!disabled && status !== 'pending') {
      buttonAction()
    }
  }

  return (
    <div className={`connect-button-group ${className}`}>
      <button
        type="button"
        className={[
          'relative inline-flex items-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
          sizeClasses,
          stateClasses,
          disabled ? 'opacity-80' : '',
        ].join(' ')}
        disabled={disabled || status === 'pending'}
        onClick={handleButtonClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        title={
          status === 'connected'
            ? 'Connected — click to disconnect.'
            : status === 'pending'
            ? 'Request pending — use Cancel below to withdraw.'
            : undefined
        }
        aria-label={
          status === 'connected'
            ? 'Connected — click to disconnect.'
            : status === 'pending'
            ? 'Request pending — use Cancel below to withdraw.'
            : undefined
        }
      >
        <span
          key={rippleKey}
          className="pointer-events-none absolute inset-0 rounded-full border border-white/20 opacity-0 connect-button-ripple"
        />
        {icon}
        <span>{hoverAwareLabel}</span>
      </button>
      {status === 'pending' && connectionId ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            removeConnection('cancel')
          }}
          className="mt-1 text-xs font-medium text-primary-600 underline-offset-4 hover:underline"
          disabled={loading}
        >
          Cancel request
        </button>
      ) : null}
      {confirmingDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Disconnect from {targetDisplayName}?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You’ll stop seeing their updates here. You can always reconnect if you change your mind.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmingDisconnect(false)}
              >
                Keep connection
              </button>
              <button
                type="button"
                className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_-26px_rgba(112,66,255,0.8)]"
                onClick={() => {
                  setConfirmingDisconnect(false)
                  removeConnection('disconnect')
                }}
                disabled={loading}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
