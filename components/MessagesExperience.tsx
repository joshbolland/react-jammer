'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { Search } from 'lucide-react'
import type { DM, Message, Profile } from '@/lib/types'
import { Chat } from './Chat'
import { ConnectButton } from './ConnectButton'

type Thread = DM & {
  otherUser: Profile | null
  lastMessage: Message | null
  unreadCount: number
}

interface MessagesExperienceProps {
  dms: Thread[]
  initialSelectedId: string | null
  currentUserId: string
}

export function MessagesExperience({ dms, initialSelectedId, currentUserId }: MessagesExperienceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedDmId, setSelectedDmId] = useState<string | null>(initialSelectedId)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setSelectedDmId((current) => {
      if (current && dms.some((dm) => dm.id === current)) return current
      if (initialSelectedId && dms.some((dm) => dm.id === initialSelectedId)) return initialSelectedId
      return dms[0]?.id ?? null
    })
  }, [initialSelectedId, dms])

  const filteredDms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return dms
    return dms.filter((dm) => (dm.otherUser?.display_name ?? '').toLowerCase().includes(query))
  }, [searchTerm, dms])

  const selectedDm = useMemo(() => {
    if (!filteredDms.length) return null
    if (!selectedDmId) return filteredDms[0]
    return (
      filteredDms.find((dm) => dm.id === selectedDmId) ??
      dms.find((dm) => dm.id === selectedDmId) ??
      filteredDms[0]
    )
  }, [selectedDmId, filteredDms, dms])

  const handleSelectDm = (dmId: string) => {
    setSelectedDmId(dmId)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('dm', dmId)
    router.replace(`/messages?${params.toString()}`, { scroll: false })
  }

  if (dms.length === 0) {
    return (
      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-12">
        <div className="rounded-[32px] border border-dashed border-slate-200/80 bg-white/90 px-6 py-12 text-center shadow-[0_25px_80px_-60px_rgba(24,39,75,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Messages</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">No conversations yet</h1>
          <p className="mt-3 text-sm text-slate-500">
            Start connecting with other musicians to see your threads here!
          </p>
        </div>
      </div>
    )
  }

  const headerSelectedName = selectedDm?.otherUser?.display_name ?? 'Conversation'
  const lastActiveLabel =
    selectedDm?.otherUser?.is_online
      ? null
      : selectedDm?.otherUser?.last_active_at
        ? `Last active ${formatDistanceToNow(new Date(selectedDm.otherUser.last_active_at), {
          addSuffix: true,
        })}`
        : selectedDm?.lastMessage
          ? `Last message ${formatDistanceToNow(new Date(selectedDm.lastMessage.created_at), {
            addSuffix: true,
          })}`
          : 'Start the conversation'

  return (
    <div className="relative mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 -top-20 -z-10 flex justify-center">
        <div className="h-72 w-[min(1400px,96%)] rounded-[50%] bg-gradient-to-r from-[#c6d6ff]/40 via-[#f5f0ff]/60 to-[#c7f0ff]/40 blur-3xl" />
      </div>

      <div className="relative rounded-[32px] border border-white/80 bg-white/95 p-4 sm:p-6 shadow-[0_25px_80px_-60px_rgba(24,39,75,0.35)] backdrop-blur">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-4 lg:border-r lg:border-slate-100 lg:pr-6">
            <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-2 shadow-inner">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name"
                className="w-full border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="h-[72vh] space-y-2 overflow-y-auto pr-1">
              {filteredDms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
                  No matches found. Try a different name.
                </div>
              ) : (
                filteredDms.map((dm) => {
                  const isActive = dm.id === selectedDm?.id
                  const preview = formatPreview(dm.lastMessage, currentUserId)
                  const timeLabel = formatTime(dm.lastMessage?.created_at ?? dm.created_at)
                  return (
                    <button
                      key={dm.id}
                      type="button"
                      onClick={() => handleSelectDm(dm.id)}
                      className={[
                        'w-full rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-200',
                        isActive
                          ? 'border-primary-100 bg-gradient-to-r from-primary-50/95 via-white to-primary-50/80 shadow-[0_18px_36px_-28px_rgba(112,66,255,0.55)]'
                          : 'border-slate-200/80 bg-white/70',
                      ].join(' ')}
                      aria-pressed={isActive}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar profile={dm.otherUser} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={[
                                'truncate text-sm font-semibold',
                                isActive ? 'text-primary-700' : 'text-slate-900',
                              ].join(' ')}
                            >
                              {dm.otherUser?.display_name ?? 'Unknown'}
                            </p>
                            <span className="flex-shrink-0 text-xs text-slate-400">{timeLabel}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <p
                              className={[
                                'truncate text-sm',
                                dm.unreadCount > 0 ? 'text-slate-900' : 'text-slate-500',
                              ].join(' ')}
                            >
                              {preview}
                            </p>
                            {dm.unreadCount > 0 && (
                              <span className="flex flex-shrink-0 items-center justify-center rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                {dm.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="flex flex-col lg:pl-6">
            {!selectedDm ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                <p className="text-sm text-slate-500">Select a conversation to view the thread.</p>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar profile={selectedDm.otherUser} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{headerSelectedName}</h2>
                        {selectedDm.otherUser?.is_online ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                            Online
                          </span>
                        ) : null}
                        {selectedDm.otherUser?.city && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {selectedDm.otherUser.city}
                          </span>
                        )}
                      </div>
                      {lastActiveLabel && (
                        <p className="text-sm text-slate-500">{lastActiveLabel}</p>
                      )}
                    </div>
                  </div>
                  {selectedDm.otherUser && (
                    <ConnectButton
                      targetUserId={selectedDm.otherUser.id}
                      targetDisplayName={selectedDm.otherUser.display_name}
                      size="sm"
                    />
                  )}
                </div>

                <div className="mt-4">
                  <Chat key={selectedDm.id} roomType="dm" roomId={selectedDm.id} className="h-[65vh]" />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function formatPreview(lastMessage: Message | null, currentUserId: string) {
  if (!lastMessage) return 'No messages yet'
  const prefix = lastMessage.sender_id === currentUserId ? 'You: ' : ''
  return `${prefix}${lastMessage.content}`
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  return isToday ? format(date, 'p') : format(date, 'MMM d')
}

function Avatar({ profile, size = 'md' }: { profile: Profile | null; size?: 'md' | 'lg' }) {
  const initials = profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : '?'

  if (profile?.avatar_url) {
    return (
      <div
        className={[
          'relative overflow-hidden rounded-full border border-white/70 shadow-lg',
          size === 'lg' ? 'h-14 w-14' : 'h-12 w-12',
        ].join(' ')}
      >
        <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" unoptimized />
      </div>
    )
  }

  return (
    <div
      className={[
        'flex items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 shadow-inner',
        size === 'lg' ? 'h-14 w-14' : 'h-12 w-12',
      ].join(' ')}
      aria-hidden
    >
      <span>{initials}</span>
    </div>
  )
}
