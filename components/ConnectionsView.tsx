'use client'

import { useMemo, useState, TransitionEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StartDMButton } from './StartDMButton'
import { ConnectButton } from './ConnectButton'
import { getInstrumentIcon } from './InstrumentIcon'
import type { Instrument, Profile } from '@/lib/types'

export interface NetworkEntry {
  connectionId: string
  profile: Profile
  connectedAt: string | null
}

export interface RequestEntry {
  connectionId: string
  profile: Profile
  requestedAt: string | null
  status: 'incoming' | 'pending'
}

export interface SuggestedEntry {
  profile: Profile
  reason: string
}

interface ConnectionsViewProps {
  network: NetworkEntry[]
  incomingRequests: RequestEntry[]
  outgoingRequests: RequestEntry[]
  suggested: SuggestedEntry[]
}

type PrimaryTab = 'network' | 'requests' | 'discover'
type RequestTab = 'incoming' | 'outgoing'

export function ConnectionsView({
  network,
  incomingRequests,
  outgoingRequests,
  suggested,
}: ConnectionsViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<PrimaryTab>('network')
  const [requestTab, setRequestTab] = useState<RequestTab>('incoming')
  const [instrumentFilter, setInstrumentFilter] = useState<Instrument | 'all'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const instrumentOptions = useMemo(() => {
    const counts = new Map<Instrument, number>()
    network.forEach((entry) => {
      entry.profile.instruments?.forEach((instrument) => {
        counts.set(instrument, (counts.get(instrument) ?? 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([instrument]) => instrument)
  }, [network])

  const filteredNetwork =
    instrumentFilter === 'all'
      ? network
      : network.filter((entry) => entry.profile.instruments?.includes(instrumentFilter))

  const handleAccept = async (connectionId: string) => {
    setProcessingId(connectionId)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'connected' }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Failed to accept request')
      }
      router.refresh()
    } catch (error) {
      console.error('[ConnectionsView] accept error', error)
      alert('Something went wrong accepting this connection.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRemove = async (connectionId: string) => {
    setProcessingId(connectionId)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Failed to update request')
      }
      router.refresh()
    } catch (error) {
      console.error('[ConnectionsView] remove error', error)
      alert('Something went wrong updating this connection.')
    } finally {
      setProcessingId(null)
    }
  }

  const isNetworkEmpty = filteredNetwork.length === 0
  const isRequestsEmpty =
    incomingRequests.length === 0 && outgoingRequests.length === 0
  const isDiscoverEmpty = suggested.length === 0

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-400">
            Profile · Connections
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Connections</h1>
              <p className="mt-1 text-base text-slate-600">
                Keep track of collaborators, pending requests, and new people to meet.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary-600 shadow-[0_15px_40px_-28px_rgba(112,66,255,0.45)]">
              Connected with {network.length} {network.length === 1 ? 'musician' : 'musicians'}
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {[
              { id: 'network', label: 'Network' },
              { id: 'requests', label: 'Requests' },
              { id: 'discover', label: 'Discover' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as PrimaryTab)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-[0_18px_50px_-30px_rgba(112,66,255,0.75)]'
                      : 'border border-primary-100/70 bg-white/80 text-primary-600 hover:border-primary-200 hover:text-primary-700',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </header>

        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_45px_140px_-80px_rgba(79,70,200,0.35)]">
          <div className="relative min-h-[540px]">
            <TabPanel active={activeTab === 'network'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Your network</h2>
                <p className="text-sm text-slate-500">
                  These are the collaborators already in your circle. Keep the rhythm going.
                </p>
              </div>
              {instrumentOptions.length > 0 && (
                <label className="text-sm text-slate-500">
                  Filter by instrument:{' '}
                  <select
                    value={instrumentFilter}
                    onChange={(event) => setInstrumentFilter(event.target.value as Instrument | 'all')}
                    className="ml-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="all">All</option>
                    {instrumentOptions.map((instrument) => (
                      <option key={instrument} value={instrument}>
                        {formatInstrument(instrument)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {isNetworkEmpty ? (
              <EmptyState
                title="No connections yet"
                description="No connections yet. Once you connect with musicians, they'll appear here so you can plan the next jam."
              />
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {filteredNetwork.map((entry) => (
                  <NetworkCard key={entry.connectionId} entry={entry} />
                ))}
              </div>
            )}
          </TabPanel>

            <TabPanel active={activeTab === 'requests'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Requests</h2>
                <p className="text-sm text-slate-500">
                  Accept new collaborators or keep track of the invites you’ve sent.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-full border border-primary-100/70 bg-primary-50/60 p-1 text-sm font-semibold text-primary-700">
              {(['incoming', 'outgoing'] as RequestTab[]).map((tab) => {
                const isActive = requestTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRequestTab(tab)}
                    className={[
                      'flex-1 rounded-full px-4 py-2 transition-all duration-200',
                      isActive
                        ? 'bg-white text-primary-600 shadow-[0_15px_40px_-28px_rgba(112,66,255,0.55)]'
                        : 'text-primary-500',
                    ].join(' ')}
                  >
                    {tab === 'incoming'
                      ? `Incoming (${incomingRequests.length})`
                      : `Sent (${outgoingRequests.length})`}
                  </button>
                )
              })}
            </div>
            {isRequestsEmpty ? (
              <EmptyState
                title={
                  requestTab === 'incoming' ? 'No new invites right now.' : 'No sent requests yet.'
                }
                description={
                  requestTab === 'incoming'
                    ? 'When musicians send requests, you’ll see them here.'
                    : 'Send a connection request from Discover to start collaborating.'
                }
              />
            ) : (
              <div className="mt-6 space-y-4">
                {(requestTab === 'incoming' ? incomingRequests : outgoingRequests).map((entry) => (
                  <RequestCard
                    key={entry.connectionId}
                    entry={entry}
                    onAccept={() => handleAccept(entry.connectionId)}
                    onDecline={() => handleRemove(entry.connectionId)}
                    processing={processingId === entry.connectionId}
                  />
                ))}
              </div>
            )}
          </TabPanel>
            <TabPanel active={activeTab === 'discover'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Discover musicians</h2>
                <p className="text-sm text-slate-500">
                  Recommended collaborators based on your instruments, genres, and location.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="inline-flex items-center gap-2 rounded-full border border-primary-100/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary-600 shadow-[0_12px_32px_-24px_rgba(112,66,255,0.45)] transition hover:-translate-y-0.5 hover:text-primary-700"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  ↻
                </span>
                Refresh suggestions
              </button>
            </div>
            {isDiscoverEmpty ? (
              <EmptyState
                title="Nothing to suggest yet"
                description="Connections make collaboration easier. Explore musicians near you to start building your network."
              />
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {suggested.map((entry) => (
                  <SuggestionCard key={entry.profile.id} entry={entry} />
                ))}
              </div>
            )}
            </TabPanel>
          </div>
        </section>
      </div>
    </div>
  )
}

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={[
        'absolute inset-0 overflow-auto transition-all duration-300',
        active ? 'opacity-100 translate-x-0' : 'pointer-events-none translate-x-4 opacity-0',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-slate-600">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  )
}

function NetworkCard({ entry }: { entry: NetworkEntry }) {
  const instruments = (entry.profile.instruments ?? []).slice(0, 3)
  const location = formatLocation(entry.profile.city, entry.profile.country)
  return (
    <div className="group relative rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_32px_90px_-60px_rgba(79,70,200,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_40px_110px_-70px_rgba(79,70,200,0.4)]">
      <div className="flex items-center gap-4">
        <AvatarChip profile={entry.profile} />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{entry.profile.display_name}</h3>
          <p className="text-sm text-slate-500">{location ?? 'Location not shared'}</p>
          <p className="text-xs uppercase tracking-[0.3em] text-primary-500">
            Connected {formatRelativeMonth(entry.connectedAt)}
          </p>
        </div>
      </div>
      {instruments.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {instruments.map((instrument) => (
            <span
              key={instrument}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700"
            >
              <span className="text-primary-500">
                {getInstrumentIcon(instrument, { className: 'h-4 w-4' })}
              </span>
              {formatInstrument(instrument)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StartDMButton otherUserId={entry.profile.id} label="Message" variant="secondary" size="sm" />
        <Link
          href={`/jams?create=1&invite=${entry.profile.id}`}
          className="inline-flex items-center rounded-full border border-primary-100/80 bg-primary-50/80 px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-[0_12px_32px_-24px_rgba(112,66,255,0.6)] transition hover:-translate-y-0.5 hover:bg-primary-100/70"
        >
          Invite to Jam
        </Link>
        <Link
          href={`/profile/${entry.profile.id}`}
          className="inline-flex items-center rounded-full border border-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary-200 hover:text-primary-600"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}

function RequestCard({
  entry,
  onAccept,
  onDecline,
  processing,
}: {
  entry: RequestEntry
  onAccept: () => void
  onDecline: () => void
  processing: boolean
}) {
  const location = formatLocation(entry.profile.city, entry.profile.country)
  const isIncoming = entry.status === 'incoming'
  return (
    <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.4)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <AvatarChip profile={entry.profile} accent={isIncoming} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{entry.profile.display_name}</p>
            <p className="text-xs text-slate-500">{location ?? 'Location not shared'}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              {isIncoming ? 'Incoming' : 'Sent'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isIncoming ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={processing}
                className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_14px_40px_-26px_rgba(112,66,255,0.7)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? 'Accepting...' : 'Accept & Jam'}
              </button>
              <button
                type="button"
                onClick={onDecline}
                disabled={processing}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Decline
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDecline}
              disabled={processing}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? 'Updating...' : 'Cancel request'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({ entry }: { entry: SuggestedEntry }) {
  const location = formatLocation(entry.profile.city, entry.profile.country)
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-primary-100/50 bg-white/90 p-5 shadow-[0_32px_90px_-60px_rgba(112,66,255,0.4)]">
      <div className="flex items-center gap-4">
        <AvatarChip profile={entry.profile} accent />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{entry.profile.display_name}</h3>
          <p className="text-sm text-slate-500">{location ?? 'Location not shared'}</p>
          <p className="text-sm text-primary-600">{entry.reason}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ConnectButton
          targetUserId={entry.profile.id}
          targetDisplayName={entry.profile.display_name}
          initialStatus="none"
        />
        <Link
          href={`/profile/${entry.profile.id}`}
          className="text-xs font-semibold text-primary-600 underline-offset-4 hover:underline"
        >
          View profile
        </Link>
      </div>
    </div>
  )
}

function AvatarChip({ profile, accent }: { profile: Profile; accent?: boolean }) {
  if (profile.avatar_url) {
    return (
      <div
        className={`relative h-14 w-14 overflow-hidden rounded-full ${
          accent ? 'ring-4 ring-primary-100/70' : ''
        }`}
      >
        <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" unoptimized />
      </div>
    )
  }

  return (
    <div
      className={[
        'flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold',
        accent ? 'bg-primary-100 text-primary-700 ring-4 ring-primary-50' : 'bg-slate-200 text-slate-600',
      ].join(' ')}
    >
      {profile.display_name?.charAt(0) ?? '?'}
    </div>
  )
}

function formatRelativeMonth(value: string | null) {
  if (!value) return 'recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date)
}

function formatLocation(city?: string | null, country?: string | null) {
  const parts = [city, country].filter(
    (part): part is string => Boolean(part && part.trim().length > 0)
  )
  if (!parts.length) return null
  return parts.join(', ')
}

function formatInstrument(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
