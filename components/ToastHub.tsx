'use client'

import { useEffect, useRef, useState } from 'react'
import type { ToastEventDetail } from '@/lib/toast'

type ActiveToast = ToastEventDetail & { createdAt: number }

const INTENT_STYLES: Record<
  ToastEventDetail['intent'],
  { wrapper: string; accent: string; text: string }
> = {
  success: {
    wrapper: 'bg-white/95 border border-emerald-100 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.55)]',
    accent: 'text-emerald-500 bg-emerald-50',
    text: 'text-emerald-800',
  },
  info: {
    wrapper: 'bg-white/95 border border-primary-100 shadow-[0_20px_60px_-35px_rgba(79,70,229,0.4)]',
    accent: 'text-primary-500 bg-primary-50',
    text: 'text-primary-900',
  },
  error: {
    wrapper: 'bg-white/95 border border-rose-100 shadow-[0_20px_60px_-35px_rgba(244,63,94,0.45)]',
    accent: 'text-rose-500 bg-rose-50',
    text: 'text-rose-900',
  },
}

export function ToastHub() {
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const timers = useRef<Record<string, number>>({})

  useEffect(() => {
    const timerMap = timers.current
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ToastEventDetail>
      if (!custom.detail) return
      const detail = custom.detail
      setToasts((prev) => [...prev, { ...detail, createdAt: Date.now() }])
      timerMap[detail.id] = window.setTimeout(() => {
        dismiss(detail.id)
      }, 4200)
    }

    window.addEventListener('jammer:toast', handler as EventListener)
    return () => {
      window.removeEventListener('jammer:toast', handler as EventListener)
      Object.values(timerMap).forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    if (timers.current[id]) {
      window.clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }

  if (!toasts.length) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => {
        const intent = INTENT_STYLES[toast.intent]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${intent.wrapper}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${intent.accent}`}>
              {toast.intent === 'success' ? '🎶' : toast.intent === 'error' ? '⚠️' : '✨'}
            </div>
            <div className={`text-sm font-semibold ${intent.text}`}>
              {toast.message}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="ml-auto text-xs font-semibold text-slate-400 transition hover:text-slate-600"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
