'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const autoOpenHandledRef = useRef(autoOpen)
  const isCompact = variant === 'compact'
  const resolvedButtonClassName = buttonClassName ?? (isCompact ? '' : 'btn-primary')
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const lastActiveElementRef = useRef<HTMLElement | null>(null)
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

  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return []
    const selectors =
      'a[href], button:not([disabled]), textarea, input, select, details, [tabindex]:not([tabindex="-1"])'
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(selectors)
    ).filter(el => !el.hasAttribute('aria-hidden'))
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

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
    if (!open || !mounted) return

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    lastActiveElementRef.current =
      triggerButtonRef.current ?? (document.activeElement as HTMLElement | null)

    const focusableElements = getFocusableElements()
    if (focusableElements[0]) {
      focusableElements[0].focus()
    } else {
      modalRef.current?.focus()
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }

      if (event.key === 'Tab') {
        const focusables = getFocusableElements()
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const activeElement = document.activeElement as HTMLElement

        if (event.shiftKey) {
          if (activeElement === first || !modalRef.current?.contains(activeElement)) {
            event.preventDefault()
            last.focus()
          }
        } else {
          if (activeElement === last || !modalRef.current?.contains(activeElement)) {
            event.preventDefault()
            first.focus()
          }
        }
      }
    }

    const handleFocus = (event: FocusEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        const focusables = getFocusableElements()
        ;(focusables[0] ?? modalRef.current)?.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('focus', handleFocus, true)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('focus', handleFocus, true)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      lastActiveElementRef.current?.focus()
    }
  }, [closeModal, getFocusableElements, mounted, open])

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
      <button
        type="button"
        ref={triggerButtonRef}
        className={buttonClasses}
        onClick={() => setOpen(true)}
      >
        <span className={iconClasses}>
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
        {buttonLabel}
      </button>

      {open
        ? mounted
          ? createPortal(
              <div className="create-jam-overlay">
                <div className="create-jam-backdrop" onClick={closeModal} aria-hidden="true" />
                <div
                  className="create-jam-modal"
                  ref={modalRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-jam-title"
                  aria-describedby="create-jam-description"
                  tabIndex={-1}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-6 top-6 rounded-full border border-slate-200/70 bg-white/70 p-2 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    aria-label="Close create jam form"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="create-jam-modal-body">
                    <div className="mb-6 pr-[52px]">
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
              </div>,
              document.body
            )
          : null
        : null}
    </>
  )
}
