'use client'

export type ToastIntent = 'info' | 'success' | 'error'

interface ToastDetail {
  id: string
  message: string
  intent: ToastIntent
}

export function showToast(message: string, intent: ToastIntent = 'info') {
  if (typeof window === 'undefined') return
  const detail: ToastDetail = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    message,
    intent,
  }
  window.dispatchEvent(new CustomEvent<ToastDetail>('jammer:toast', { detail }))
}

export type ToastEventDetail = ToastDetail
