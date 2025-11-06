'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { JamForm } from './JamForm'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateJamModalProps {
  buttonClassName?: string
  autoOpen?: boolean
}

export function CreateJamModal({ buttonClassName = 'btn-primary', autoOpen = false }: CreateJamModalProps) {
  const [open, setOpen] = useState(autoOpen)
  const router = useRouter()
  const autoOpenHandledRef = useRef(autoOpen)

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

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)}>
        Create Jam
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-12 sm:py-16">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-3xl rounded-[32px] border border-white/60 bg-white/95 p-8 shadow-[0_60px_140px_-60px_rgba(97,76,200,0.55)]">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-6 top-6 rounded-full border border-slate-200/70 bg-white/70 p-2 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              aria-label="Close create jam form"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 pr-10">
              <h2 className="text-2xl font-semibold text-slate-900">Create a Jam</h2>
              <p className="text-sm text-slate-500">Invite musicians to join your next session.</p>
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
