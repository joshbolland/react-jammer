'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { JamForm } from './JamForm'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateJamModalProps {
  buttonClassName?: string
  autoOpen?: boolean
  variant?: 'default' | 'compact'
}

export function CreateJamModal({
  buttonClassName,
  autoOpen = false,
  variant = 'default',
}: CreateJamModalProps) {
  const [open, setOpen] = useState(autoOpen)
  const router = useRouter()
  const autoOpenHandledRef = useRef(autoOpen)
  const isCompact = variant === 'compact'
  const resolvedButtonClassName = buttonClassName ?? (isCompact ? '' : 'btn-primary')
  const buttonClasses = [
    resolvedButtonClassName,
    isCompact
      ? 'group inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_18px_36px_-28px_rgba(24,39,75,0.55)] backdrop-blur transition hover:-translate-y-0.5 hover:border-primary-200/80 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300'
      : 'group gap-3 px-4 py-3 text-base',
  ]
    .filter(Boolean)
    .join(' ')

  const iconClasses = isCompact
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 shadow-[0_18px_40px_-26px_rgba(79,70,229,0.55)] transition-transform duration-200 group-hover:scale-105'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-600 shadow-[0_18px_40px_-22px_rgba(79,70,229,0.8)] transition-transform duration-200 group-hover:scale-105'

  useEffect(() => {
    if (autoOpen) {
      setOpen(true)
      autoOpenHandledRef.current = true
    }
  }, [autoOpen])

  const closeModal = useCallback(() => {
    setOpen(false)
    if (autoOpenHandledRef.current) {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('create')
        const nextUrl = `${url.pathname}${url.search}`
        window.history.replaceState(null, '', nextUrl || '/jams')
      }
      autoOpenHandledRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [closeModal, open])

  const handleSuccess = (jamId: string) => {
    setOpen(false)
    router.push(`/jams/${jamId}`)
  }

  const buttonLabel = isCompact ? (
    <span className="flex flex-col text-left leading-tight">
      <span className="text-sm font-semibold text-slate-900">Host a jam</span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        Invite players
      </span>
    </span>
  ) : (
    <span className="flex flex-col text-left leading-tight">
      <span className="text-lg font-semibold">Host a jam</span>
    </span>
  )

  return (
    <>
      <button type="button" className={buttonClasses} onClick={() => setOpen(true)}>
        <span className={iconClasses}>
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
        {buttonLabel}
      </button>

      {open && (
        <div className="create-jam-overlay">
          <div className="create-jam-backdrop" onClick={closeModal} aria-hidden="true" />
          <div
            className="create-jam-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-jam-title"
            aria-describedby="create-jam-description"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-6 top-6 rounded-full border border-slate-200/70 bg-white/70 p-2 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              aria-label="Close create jam form"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 pr-10">
              <h2 id="create-jam-title" className="text-2xl font-semibold text-slate-900">
                Create a Jam
              </h2>
              <p id="create-jam-description" className="text-sm text-slate-500">
                Invite musicians to join your next session.
              </p>
            </div>

            <div className="relative">
              <JamForm onSuccess={handleSuccess} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
