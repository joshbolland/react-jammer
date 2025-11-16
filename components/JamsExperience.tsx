'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import type { Jam, Genre, Instrument } from '@/lib/types'
import type { JamParticipation } from './JamCard'
import { CreateJamModal } from './CreateJamModal'
import { getInstrumentIcon } from './InstrumentIcon'

export type SuggestionBlocker = 'location' | 'interests' | null

export interface SuggestedJamPreview {
  jam: Jam
  distanceMiles: number
  matchedInstruments: Instrument[]
  matchedGenres: Genre[]
}

export interface IncomingJamRequestCard {
  jamId: string
  jamTitle: string
  jamTime: string | null
  jamLocation: string | null
  requesterId: string
  requesterName: string | null
  requesterAvatar: string | null
  joinedAt: string
  status: 'pending' | 'approved' | 'declined'
}

export interface OutgoingJamRequestCard {
  jamId: string
  jamTitle: string
  jamTime: string | null
  jamLocation: string | null
  status: 'pending' | 'approved' | 'declined'
  joinedAt: string
}

interface JamsExperienceProps {
  upcomingJams: Jam[]
  suggestedJams: SuggestedJamPreview[]
  participationMap: Record<string, JamParticipation>
  incomingRequests: IncomingJamRequestCard[]
  outgoingRequests: OutgoingJamRequestCard[]
  historyJams: Jam[]
  suggestionBlocker: SuggestionBlocker
  autoOpenCreate: boolean
  currentUserId: string
}

type TabId = 'overview' | 'requests' | 'history'
type RequestSegment = 'incoming' | 'outgoing'

type AccentKey = 'jazz' | 'rock' | 'folk' | 'default'

type AccentTokens = {
  background: string
  glow: string
}

const accentPalette: Record<AccentKey, AccentTokens> = {
  jazz: {
    background: 'from-[#f5f3ff]/90 via-white/95 to-[#f0f7ff]/90',
    glow: 'bg-gradient-to-r from-[#d6cfff]/40 via-transparent to-[#bbf0ff]/40',
  },
  rock: {
    background: 'from-[#fff4ef]/90 via-white/95 to-[#fff0e6]/90',
    glow: 'bg-gradient-to-r from-[#ffd7c5]/45 via-transparent to-[#ffe6cf]/40',
  },
  folk: {
    background: 'from-[#f6fff2]/90 via-white/95 to-[#f0fbff]/90',
    glow: 'bg-gradient-to-r from-[#d7ffca]/45 via-transparent to-[#c5f2ff]/40',
  },
  default: {
    background: 'from-[#f7f5ff]/90 via-white/95 to-[#f0f8ff]/90',
    glow: 'bg-gradient-to-r from-[#d6c7ff]/35 via-transparent to-[#c2f4ff]/35',
  },
}

const participationCopy: Record<JamParticipation | 'open', { label: string; tone: string }> = {
  hosting: { label: 'You’re hosting', tone: 'bg-primary-50/80 text-primary-700' },
  attending: { label: 'You’re in', tone: 'bg-emerald-50/80 text-emerald-700' },
  pending: { label: 'Invite sent', tone: 'bg-amber-50/80 text-amber-700' },
  open: { label: 'Open spots', tone: 'bg-slate-900/5 text-slate-800' },
}

export function JamsExperience({
  upcomingJams,
  suggestedJams,
  participationMap,
  incomingRequests,
  outgoingRequests,
  historyJams,
  suggestionBlocker,
  autoOpenCreate,
  currentUserId,
}: JamsExperienceProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [requestSegment, setRequestSegment] = useState<RequestSegment>('incoming')
  const [processingKey, setProcessingKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionPulse, setActionPulse] = useState<Record<string, 'approved' | 'declined'>>({})

  const now = Date.now()
  const visibleIncomingRequests = incomingRequests.filter((request) => isUpcomingJam(request.jamTime, now))
  const visibleOutgoingRequests = outgoingRequests.filter((request) => isUpcomingJam(request.jamTime, now))

  const overviewCount = upcomingJams.length + suggestedJams.length
  const requestsCount = visibleIncomingRequests.length + visibleOutgoingRequests.length
  const historyCount = historyJams.length
  const hasHistory = historyCount > 0

  const tabs = useMemo(() => {
    const base = [
      { id: 'overview', label: `Overview (${overviewCount})` },
      { id: 'requests', label: `Requests (${requestsCount})` },
    ] as Array<{ id: TabId; label: string }>
    if (hasHistory) {
      base.push({ id: 'history', label: `History (${historyCount})` })
    }
    return base
  }, [overviewCount, requestsCount, hasHistory, historyCount])

  const activeRequests = requestSegment === 'incoming' ? visibleIncomingRequests : visibleOutgoingRequests

  const handleOpenCreate = () => {
    router.push('/jams?create=1')
  }

  const handleDiscoverJams = () => {
    router.push('/')
  }

  const handleIncomingAction = async (
    jamId: string,
    requesterId: string,
    status: 'approved' | 'declined'
  ) => {
    const key = `${jamId}:${requesterId}`
    setProcessingKey(key)
    setActionError(null)
    try {
      const response = await fetch(`/api/jams/${jamId}/members/${requesterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Could not update request')
      }
      setActionPulse((prev) => ({ ...prev, [key]: status }))
      setTimeout(() => {
        setActionPulse((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }, 1800)
      router.refresh()
    } catch (error: any) {
      setActionError(error.message ?? 'Something went wrong updating that request.')
    } finally {
      setProcessingKey(null)
    }
  }

  const handleOutgoingCancel = async (jamId: string) => {
    const key = `${jamId}:${currentUserKey}`
    setProcessingKey(key)
    setActionError(null)
    try {
      const response = await fetch(`/api/jams/${jamId}/members/${currentUserId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Could not cancel request')
      }
      setActionPulse((prev) => ({ ...prev, [key]: 'declined' }))
      setTimeout(() => {
        setActionPulse((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }, 1600)
      router.refresh()
    } catch (error: any) {
      setActionError(error.message ?? 'Something went wrong cancelling that request.')
    } finally {
      setProcessingKey(null)
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <BackgroundAura />
      <div className="relative space-y-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Sessions</p>
            <h1 className="text-4xl font-semibold text-slate-900">Jams</h1>
            <p className="mt-3 max-w-xl text-base text-slate-600">
              Keep every session in one place so you can host, respond, and explore without the clutter.
            </p>
          </div>
          <div className="md:self-start">
            <CreateJamModal variant="compact" autoOpen={autoOpenCreate} />
          </div>
        </header>

        <section className="rounded-[40px] border border-white/60 bg-white/90 p-6 shadow-[0_60px_160px_-80px_rgba(79,70,229,0.45)] backdrop-blur">
          <nav
            role="tablist"
            aria-label="Jams navigation"
            className="flex flex-wrap gap-2"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-[0_18px_40px_-28px_rgba(112,66,255,0.8)]'
                      : 'border border-slate-200/70 bg-white/70 text-slate-600 hover:text-primary-600',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-6">
            <TabPanel id="panel-overview" active={activeTab === 'overview'}>
              <OverviewSection
                upcomingJams={upcomingJams}
                suggestedJams={suggestedJams}
                participationMap={participationMap}
                suggestionBlocker={suggestionBlocker}
                onHostClick={handleOpenCreate}
              />
            </TabPanel>
            <TabPanel id="panel-requests" active={activeTab === 'requests'}>
              <RequestsSection
                requestSegment={requestSegment}
                setRequestSegment={setRequestSegment}
                incomingRequests={visibleIncomingRequests}
                outgoingRequests={visibleOutgoingRequests}
                activeRequests={activeRequests}
                processingKey={processingKey}
                actionError={actionError}
                actionPulse={actionPulse}
                onIncomingAction={handleIncomingAction}
                onOutgoingCancel={handleOutgoingCancel}
                onDiscoverClick={handleDiscoverJams}
              />
            </TabPanel>
            {hasHistory && (
              <TabPanel id="panel-history" active={activeTab === 'history'}>
                <HistorySection
                  historyJams={historyJams}
                  participationMap={participationMap}
                />
              </TabPanel>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function OverviewSection({
  upcomingJams,
  suggestedJams,
  participationMap,
  suggestionBlocker,
  onHostClick,
}: {
  upcomingJams: Jam[]
  suggestedJams: SuggestedJamPreview[]
  participationMap: Record<string, JamParticipation>
  suggestionBlocker: SuggestionBlocker
  onHostClick: () => void
}) {
  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Your upcoming jams</h2>
            <p className="text-sm text-slate-500">Sessions you&apos;re hosting or joining, all in one view.</p>
          </div>
        </div>
        {upcomingJams.length === 0 ? (
          <EmptyState
            title="No jams yet. Start the first one."
            description="Host a jam to kick things off, or browse the suggestions below."
            ctaLabel="Host a jam"
            onCta={onHostClick}
          />
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {upcomingJams.map((jam) => (
              <JamOverviewCard
                key={jam.id}
                jam={jam}
                participation={participationMap[jam.id] ?? 'open'}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Suggested near you</h2>
            <p className="text-sm text-slate-500">
              Within 25 miles and tailored to your instruments or genres.
            </p>
          </div>
        </div>
        {suggestionBlocker === 'location' && (
          <InlineNotice message="Add your city in your profile to unlock local matches." />
        )}
        {suggestionBlocker === 'interests' && (
          <InlineNotice message="Tell us your instruments or genres to surface better matches." />
        )}
        {!suggestionBlocker && suggestedJams.length === 0 && (
          <EmptyState
            title="Nothing nearby matches your sound."
            description="Adjust the filters or widen your radius to see more options."
            ctaLabel="Adjust filters"
            onCta={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        )}
        {!suggestionBlocker && suggestedJams.length > 0 && (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {suggestedJams.map((entry) => (
              <JamOverviewCard key={entry.jam.id} jam={entry.jam} participation="open" suggestion={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestsSection({
  requestSegment,
  setRequestSegment,
  incomingRequests,
  outgoingRequests,
  activeRequests,
  processingKey,
  actionError,
  actionPulse,
  onIncomingAction,
  onOutgoingCancel,
  onDiscoverClick,
}: {
  requestSegment: RequestSegment
  setRequestSegment: (value: RequestSegment) => void
  incomingRequests: IncomingJamRequestCard[]
  outgoingRequests: OutgoingJamRequestCard[]
  activeRequests: Array<IncomingJamRequestCard | OutgoingJamRequestCard>
  processingKey: string | null
  actionError: string | null
  actionPulse: Record<string, 'approved' | 'declined'>
  onIncomingAction: (jamId: string, requesterId: string, status: 'approved' | 'declined') => Promise<void>
  onOutgoingCancel: (jamId: string) => Promise<void>
  onDiscoverClick: () => void
}) {
  const noRequests = incomingRequests.length === 0 && outgoingRequests.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Requests</h2>
        <p className="text-sm text-slate-500">Incoming invites and the jams you’ve asked to join.</p>
      </div>

      <div className="inline-flex rounded-full bg-white/80 p-1 shadow-[0_15px_40px_-30px_rgba(112,66,255,0.5)] backdrop-blur">
        {(['incoming', 'outgoing'] as RequestSegment[]).map((segment) => {
          const isActive = requestSegment === segment
          const count = segment === 'incoming' ? incomingRequests.length : outgoingRequests.length
          return (
            <button
              key={segment}
              type="button"
              onClick={() => setRequestSegment(segment)}
              className={[
                'min-w-[120px] rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-200',
                isActive
                  ? 'border border-transparent bg-primary-600 text-white shadow-[0_18px_40px_-26px_rgba(112,66,255,0.65)]'
                  : 'border border-slate-200/80 text-primary-600',
              ].join(' ')}
              aria-pressed={isActive}
            >
              {segment === 'incoming' ? `Incoming (${count})` : `Sent (${count})`}
            </button>
          )
        })}
      </div>

      {actionError && <ActionBanner message={actionError} />}

      {noRequests ? (
        <EmptyState
          title="No requests right now."
          description="You&apos;ll see invites and your requests here as soon as something changes."
        />
      ) : activeRequests.length === 0 ? (
        requestSegment === 'incoming' ? (
          <EmptyState
            title="No incoming requests right now."
            description="Hosts appear here as soon as someone asks to join."
          />
        ) : (
          <EmptyState
            title="You haven’t sent any requests."
            description="Find a session that fits and send a request."
            ctaLabel="Discover jams"
            onCta={onDiscoverClick}
          />
        )
      ) : (
        <div className="space-y-4">
          {activeRequests.map((request) => {
            const requestKey =
              'requesterId' in request ? `${request.jamId}:${request.requesterId}` : `${request.jamId}:${currentUserKey}`
            return (
              <RequestCard
                key={requestKey}
                requestKey={requestKey}
                segment={requestSegment}
                request={request}
                processingKey={processingKey}
                actionPulse={actionPulse}
                onIncomingAction={onIncomingAction}
                onOutgoingCancel={onOutgoingCancel}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

const currentUserKey = 'self'

function HistorySection({
  historyJams,
  participationMap,
}: {
  historyJams: Jam[]
  participationMap: Record<string, JamParticipation>
}) {
  if (historyJams.length === 0) {
    return (
      <EmptyState
        title="No past jams yet."
        description="Finished sessions show up here so you can revisit them whenever you like."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Recent history</h2>
        <p className="text-sm text-slate-500">Past jams you hosted or played recently.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {historyJams.map((jam) => (
          <JamOverviewCard key={jam.id} jam={jam} participation={participationMap[jam.id] ?? 'open'} isHistory />
        ))}
      </div>
    </div>
  )
}

function JamOverviewCard({
  jam,
  participation,
  suggestion,
  isHistory = false,
}: {
  jam: Jam
  participation: JamParticipation | 'open'
  suggestion?: SuggestedJamPreview
  isHistory?: boolean
}) {
  const accent = getAccentForJam(jam.host?.genres?.[0])
  const dateLabel = formatDate(jam.jam_time)
  const locationLabel = formatLocation(jam.city, jam.country)
  const chips = jam.desired_instruments.slice(0, 4)
  const participationMeta = participationCopy[isHistory ? 'open' : participation]
  const statusLabel = isHistory ? 'Wrapped' : participationMeta.label
  const statusTone = isHistory
    ? 'bg-slate-900/10 text-slate-900'
    : participationMeta.tone

  const reasonPieces: string[] = []
  if (suggestion) {
    if (suggestion.matchedInstruments.length) {
      reasonPieces.push(`Needs ${formatList(suggestion.matchedInstruments.map(formatInstrumentLabel))}`)
    }
    if (suggestion.matchedGenres.length) {
      reasonPieces.push(`Kindred ${formatList(suggestion.matchedGenres.map(capitalize))}`)
    }
  }
  const reasonLine = suggestion
    ? [suggestion.distanceMiles ? `${Math.round(suggestion.distanceMiles)} mi away` : null, reasonPieces.join(' • ') || null]
      .filter(Boolean)
      .join(' • ')
    : null

  const chipsNode =
    chips.length > 0 ? (
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
          Looking for
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {chips.map((instrument) => (
            <span
              key={instrument}
              className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700"
            >
              <span className="text-primary-500">
                {getInstrumentIcon(instrument, { className: 'h-4 w-4' })}
              </span>
              {formatInstrumentLabel(instrument)}
            </span>
          ))}
        </div>
      </div>
    ) : null

  return (
    <AuroraCardShell
      accent={accent}
      statusLabel={statusLabel}
      statusTone={statusTone}
      title={jam.title}
      subtitle={jam.description}
      metaPrimary={dateLabel}
      metaSecondary={locationLabel}
      chips={chipsNode}
      reasonLine={reasonLine}
      href={`/jams/${jam.id}`}
    />
  )
}

function RequestCard({
  segment,
  requestKey,
  request,
  processingKey,
  actionPulse,
  onIncomingAction,
  onOutgoingCancel,
}: {
  segment: RequestSegment
  requestKey: string
  request: IncomingJamRequestCard | OutgoingJamRequestCard
  processingKey: string | null
  actionPulse: Record<string, 'approved' | 'declined'>
  onIncomingAction: (jamId: string, requesterId: string, status: 'approved' | 'declined') => Promise<void>
  onOutgoingCancel: (jamId: string) => Promise<void>
}) {
  const isIncoming = segment === 'incoming'
  const dateLabel = formatDate(request.jamTime)
  const locationLabel = request.jamLocation ?? 'Location TBA'
  const joinedLabel = formatJoined(request.joinedAt)
  const requesterName = isIncoming && 'requesterName' in request ? request.requesterName : null
  const requesterAvatar = isIncoming && 'requesterAvatar' in request ? request.requesterAvatar : null
  const key = requestKey
  const isProcessing = processingKey === key

  let finalState: 'approved' | 'declined' | null = null
  if (request.status !== 'pending') {
    // request.status is already resolved to 'approved' or 'declined'
    finalState = request.status === 'approved' ? 'approved' : 'declined'
  } else if (actionPulse[key]) {
    finalState = actionPulse[key]
  }

  const statusTone = isIncoming ? 'bg-primary-500/95 text-white' : 'bg-slate-900/80 text-white'
  const statusLabel = isIncoming ? 'Invitation' : 'Request sent'
  const subtitle = isIncoming
    ? `${requesterName ?? 'Musician'} wants in`
    : 'Waiting on host reply'

  const resolvedPillTone =
    finalState === 'approved'
      ? 'bg-emerald-500/90'
      : finalState === 'declined'
        ? 'bg-slate-500/80'
        : ''

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-white/90 via-white/80 to-white/90 p-6 shadow-[0_8px_28px_rgba(84,63,255,0.08)] backdrop-blur-[6px] transition duration-200 md:p-7 xl:p-8">
      <span className={`absolute left-6 top-6 inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${statusTone}`}>
        {statusLabel}
      </span>
      <div className="relative flex flex-col gap-6 pt-10">
        <div className="jam-card-layout">
          <div className={isIncoming ? 'flex items-start gap-3' : undefined}>
            {isIncoming && (
              <AvatarBubble
                avatar={{
                  src: requesterAvatar,
                  fallback: requesterName?.charAt(0) ?? 'M',
                }}
              />
            )}
            <div className="space-y-3">
              <Link
                href={`/jams/${request.jamId}`}
                className="text-[22px] font-semibold leading-tight text-slate-900 transition hover:text-primary-600 md:text-[24px]"
              >
                {request.jamTitle}
              </Link>
              <p className="text-sm text-slate-700/90">{subtitle}</p>
              {joinedLabel && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {joinedLabel}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 border-t border-white/40 pt-4 text-left text-slate-600 lg:mt-0 lg:rounded-[24px] lg:border lg:border-white/60 lg:bg-white/60 lg:p-5 lg:text-right lg:shadow-inner lg:backdrop-blur">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">When</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{dateLabel ?? 'TBD'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Where</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{locationLabel}</p>
              </div>
            </div>
            {finalState ? (
              <span
                className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.05em] text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.45)] transition ${resolvedPillTone} ${actionPulse[key] ? 'animate-[pulse_1.5s_ease-out]' : ''}`}
              >
                {finalState === 'approved' ? 'Accepted' : 'Declined'}
              </span>
            ) : (
              <div className="flex flex-col gap-2 lg:items-end">
                {isIncoming ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onIncomingAction(
                          request.jamId,
                          (request as IncomingJamRequestCard).requesterId,
                          'approved'
                        )
                      }
                      disabled={isProcessing}
                      className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(112,66,255,0.8)] transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? 'Sending…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onIncomingAction(
                          request.jamId,
                          (request as IncomingJamRequestCard).requesterId,
                          'declined'
                        )
                      }
                      disabled={isProcessing}
                      className="rounded-full border border-slate-200/80 px-5 py-2 text-sm font-semibold text-slate-600 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-200 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? 'Updating…' : 'Decline'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOutgoingCancel(request.jamId)}
                    disabled={isProcessing}
                    className="rounded-full border border-slate-200/80 px-5 py-2 text-sm font-semibold text-slate-600 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-200 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? 'Cancelling…' : 'Cancel request'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/jams/${request.jamId}`}
          className="relative inline-flex items-center text-sm font-semibold text-primary-600 after:absolute after:left-1/2 after:top-full after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-current after:transition-all after:duration-150 hover:after:w-full"
        >
          View details<span className="ml-1 text-base">→</span>
        </Link>
      </div>
    </article>
  )
}

interface AuroraCardShellProps {
  accent: AccentTokens
  statusLabel: string
  statusTone: string
  title: string
  subtitle?: string | null
  metaPrimary: string | null
  metaSecondary?: string | null
  chips?: React.ReactNode
  reasonLine?: string | null
  footer?: React.ReactNode
  avatar?: { src: string | null; fallback: string }
  href?: string
  statusPulse?: boolean
}

function AuroraCardShell({
  accent,
  statusLabel,
  statusTone,
  title,
  subtitle,
  metaPrimary,
  metaSecondary,
  chips,
  reasonLine,
  footer,
  avatar,
  href,
  statusPulse,
}: AuroraCardShellProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br ${accent.background} p-5 shadow-[0_45px_120px_-70px_rgba(79,70,229,0.45)] transition duration-200 ease-out hover:-translate-y-1`}
    >
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {avatar ? <AvatarBubble avatar={avatar} /> : null}
            <div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] transition duration-200 ${statusTone} ${statusPulse ? 'animate-[pulse_2s_ease-in-out_1]' : ''} group-hover:opacity-90`}
              >
                {statusLabel}
              </span>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            {metaPrimary && <p className="font-semibold text-slate-900">{metaPrimary}</p>}
            {metaSecondary && <p>{metaSecondary}</p>}
          </div>
        </div>
        {reasonLine && (
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{reasonLine}</p>
        )}
        {chips}
        {footer}
        {href && (
          <div>
            <Link
              href={href}
              className="inline-flex items-center text-sm font-semibold text-primary-600 transition hover:text-primary-700"
            >
              View details
              <span className="ml-1">→</span>
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}

function AvatarBubble({ avatar }: { avatar: { src: string | null; fallback: string } }) {
  if (avatar.src) {
    return (
      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/70 shadow-lg">
        <Image src={avatar.src} alt="Avatar" fill className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-lg font-semibold text-slate-700 shadow-inner">
      {avatar.fallback}
    </div>
  )
}

function EmptyState({
  title,
  description,
  ctaLabel,
  onCta,
}: {
  title: string
  description: string
  ctaLabel?: string
  onCta?: () => void
}) {
  return (
    <div className="mt-6 rounded-[28px] border border-dashed border-slate-200/80 bg-white/70 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-4 inline-flex items-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_-26px_rgba(112,66,255,0.8)]"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}

function BackgroundAura() {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 flex justify-center">
      <div className="h-64 w-[min(900px,90%)] rounded-[50%] bg-gradient-to-r from-[#c0a7ff]/30 via-[#dff2ff]/40 to-[#f9d7ff]/35 blur-3xl" />
    </div>
  )
}

function InlineNotice({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-100/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  )
}

function ActionBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-100/80 bg-red-50/80 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

function TabPanel({ id, active, children }: { id: string; active: boolean; children: React.ReactNode }) {
  return (
    <div
      id={id}
      role="tabpanel"
      aria-hidden={!active}
      className={[active ? 'block' : 'hidden', 'transition-opacity duration-300'].join(' ')}
    >
      <div className="pr-1">{children}</div>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return format(date, 'EEE, MMM d · h:mm a')
}

function formatLocation(city?: string | null, country?: string | null) {
  const parts = [city, country].filter((part): part is string => Boolean(part && part.trim()))
  return parts.length ? parts.join(', ') : null
}

function formatInstrumentLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatList(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} & ${values[1]}`
  return `${values[0]}, ${values[1]} +${values.length - 2}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatJoined(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `Requested ${formatDistanceToNow(date, { addSuffix: true })}`
}

function isUpcomingJam(jamTime: string | null, now: number = Date.now()) {
  if (!jamTime) return true
  const jamDate = new Date(jamTime)
  if (Number.isNaN(jamDate.getTime())) return true
  return jamDate.getTime() >= now
}

function getAccentForJam(primaryGenre?: Genre | null): AccentTokens {
  if (!primaryGenre) return accentPalette.default
  switch (primaryGenre) {
    case 'jazz':
      return accentPalette.jazz
    case 'rock':
      return accentPalette.rock
    case 'folk':
      return accentPalette.folk
    default:
      return accentPalette.default
  }
}
