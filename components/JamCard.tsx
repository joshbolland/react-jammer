'use client'

import type { KeyboardEvent } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Jam, type Genre, type Instrument } from '@/lib/types'
import { getInstrumentIcon } from './InstrumentIcon'
import { ConnectButton } from './ConnectButton'

type JamAccent = {
  background: string
  glow: string
  title: string
  badge: string
  motion: string
}

type InstrumentAccentKey = 'default' | 'strings' | 'percussion' | 'voice' | 'keys' | 'brass' | 'wind'

const instrumentAccentMap: Record<InstrumentAccentKey, JamAccent> = {
  default: {
    background: 'bg-gradient-to-br from-[#f8f5ff]/95 via-white/95 to-[#f7faff]/95',
    glow: 'bg-gradient-to-br from-[#d7c9ff]/55 via-transparent to-[#f5f0ff]/65',
    title: 'text-[#6f34e6]',
    badge: 'bg-[#f8f4ff]/85 text-[#6f34e6]',
    motion: 'linear-gradient(130deg, rgba(167,130,255,0.32), rgba(255,217,186,0.28), rgba(195,245,255,0.25))',
  },
  strings: {
    background: 'bg-gradient-to-br from-[#fff5f0]/95 via-white/95 to-[#f8efff]/95',
    glow: 'bg-gradient-to-br from-[#ffd9c5]/60 via-transparent to-[#f2e1ff]/60',
    title: 'text-[#b45a2b]',
    badge: 'bg-[#fff6ee]/85 text-[#b45a2b]',
    motion: 'linear-gradient(125deg, rgba(255,200,170,0.35), rgba(255,235,200,0.3), rgba(233,210,255,0.35))',
  },
  percussion: {
    background: 'bg-gradient-to-br from-[#fff8ed]/95 via-white/95 to-[#fff0f0]/95',
    glow: 'bg-gradient-to-br from-[#ffe9bf]/60 via-transparent to-[#ffe1d6]/55',
    title: 'text-[#b78516]',
    badge: 'bg-[#fff9e6]/85 text-[#b78516]',
    motion: 'linear-gradient(120deg, rgba(255,215,165,0.32), rgba(255,235,200,0.3), rgba(255,196,183,0.35))',
  },
  voice: {
    background: 'bg-gradient-to-br from-[#fdf2ff]/95 via-white/95 to-[#f3f8ff]/95',
    glow: 'bg-gradient-to-br from-[#ffd1f0]/55 via-transparent to-[#d9d0ff]/60',
    title: 'text-[#a23478]',
    badge: 'bg-[#fff4fb]/80 text-[#a23478]',
    motion: 'linear-gradient(130deg, rgba(255,190,225,0.32), rgba(233,215,255,0.35), rgba(210,235,255,0.3))',
  },
  keys: {
    background: 'bg-gradient-to-br from-[#f0f8ff]/95 via-white/95 to-[#f5f1ff]/95',
    glow: 'bg-gradient-to-br from-[#aee5ff]/55 via-transparent to-[#dcd6ff]/60',
    title: 'text-[#0f74aa]',
    badge: 'bg-[#f5fbff]/85 text-[#0f74aa]',
    motion: 'linear-gradient(125deg, rgba(180,225,255,0.32), rgba(210,230,255,0.3), rgba(220,210,255,0.35))',
  },
  brass: {
    background: 'bg-gradient-to-br from-[#f0fff9]/95 via-white/95 to-[#f9f3ff]/95',
    glow: 'bg-gradient-to-br from-[#b8ffe6]/55 via-transparent to-[#e4f8ff]/60',
    title: 'text-[#0b8f65]',
    badge: 'bg-[#f3fff9]/85 text-[#0b8f65]',
    motion: 'linear-gradient(128deg, rgba(160,255,214,0.3), rgba(200,250,255,0.28), rgba(235,220,255,0.32))',
  },
  wind: {
    background: 'bg-gradient-to-br from-[#f2f5ff]/95 via-white/95 to-[#fdf4ff]/95',
    glow: 'bg-gradient-to-br from-[#cfd7ff]/55 via-transparent to-[#f3e6ff]/60',
    title: 'text-[#3e4fff]',
    badge: 'bg-[#f4f6ff]/85 text-[#3e4fff]',
    motion: 'linear-gradient(120deg, rgba(200,210,255,0.34), rgba(240,220,255,0.28), rgba(255,220,240,0.3))',
  },
}

const jamInstrumentCategoryMap: Partial<Record<Instrument, InstrumentAccentKey>> = {
  guitar: 'strings',
  bass: 'strings',
  violin: 'strings',
  viola: 'strings',
  cello: 'strings',
  ukulele: 'strings',
  banjo: 'strings',
  mandolin: 'strings',
  drums: 'percussion',
  piano: 'keys',
  keyboard: 'keys',
  vocals: 'voice',
  saxophone: 'wind',
  clarinet: 'wind',
  flute: 'wind',
  harmonica: 'wind',
  trumpet: 'brass',
  trombone: 'brass',
}

const genreAccentMap: Record<Genre, JamAccent> = {
  rock: {
    background: 'bg-gradient-to-br from-[#fff0f2]/95 via-[#fff6f1]/95 to-[#fff3ea]/95',
    glow: 'bg-gradient-to-br from-[#ffb8a4]/55 via-transparent to-[#ffd9b4]/55',
    title: 'text-[#c4472d]',
    badge: 'bg-[#fff4ef]/85 text-[#c4472d]',
    motion: 'linear-gradient(125deg, rgba(255,170,150,0.38), rgba(255,211,180,0.35), rgba(255,165,130,0.32))',
  },
  jazz: {
    background: 'bg-gradient-to-br from-[#f1f4ff]/95 via-[#f7f2ff]/95 to-[#f0f6ff]/95',
    glow: 'bg-gradient-to-br from-[#b5c6ff]/55 via-transparent to-[#d7c9ff]/55',
    title: 'text-[#2d4fb3]',
    badge: 'bg-[#f2f4ff]/85 text-[#2d4fb3]',
    motion: 'linear-gradient(130deg, rgba(167,190,255,0.4), rgba(216,200,255,0.35), rgba(142,186,255,0.32))',
  },
  pop: {
    background: 'bg-gradient-to-br from-[#fff0fb]/95 via-[#fff8fd]/95 to-[#fef4ff]/95',
    glow: 'bg-gradient-to-br from-[#ffb8ec]/55 via-transparent to-[#e0c8ff]/55',
    title: 'text-[#b8328a]',
    badge: 'bg-[#fff0fb]/85 text-[#b8328a]',
    motion: 'linear-gradient(130deg, rgba(255,174,234,0.4), rgba(255,210,250,0.35), rgba(197,180,255,0.32))',
  },
  indie: {
    background: 'bg-gradient-to-br from-[#f0fff9]/95 via-[#f7fffc]/95 to-[#f3f7ff]/95',
    glow: 'bg-gradient-to-br from-[#a5ffe3]/45 via-transparent to-[#b5e3ff]/55',
    title: 'text-[#1b7c6a]',
    badge: 'bg-[#f1fff8]/85 text-[#1b7c6a]',
    motion: 'linear-gradient(120deg, rgba(148,240,215,0.35), rgba(210,247,255,0.28), rgba(176,222,255,0.32))',
  },
  folk: {
    background: 'bg-gradient-to-br from-[#fff9f0]/95 via-[#fffdf8]/95 to-[#f6fff2]/95',
    glow: 'bg-gradient-to-br from-[#ffd9a8]/50 via-transparent to-[#d8f5c6]/50',
    title: 'text-[#a06a1f]',
    badge: 'bg-[#fff5e5]/85 text-[#a06a1f]',
    motion: 'linear-gradient(125deg, rgba(255,205,150,0.4), rgba(246,238,200,0.35), rgba(196,230,180,0.3))',
  },
  blues: {
    background: 'bg-gradient-to-br from-[#f1f6ff]/95 via-[#f9fbff]/95 to-[#eef7ff]/95',
    glow: 'bg-gradient-to-br from-[#a8c8ff]/55 via-transparent to-[#c6e0ff]/55',
    title: 'text-[#1f4fba]',
    badge: 'bg-[#f2f6ff]/85 text-[#1f4fba]',
    motion: 'linear-gradient(130deg, rgba(126,173,255,0.4), rgba(187,208,255,0.35), rgba(112,190,255,0.32))',
  },
  electronic: {
    background: 'bg-gradient-to-br from-[#f2faff]/95 via-[#f8fcff]/95 to-[#f3f1ff]/95',
    glow: 'bg-gradient-to-br from-[#8df0ff]/45 via-transparent to-[#d0b0ff]/55',
    title: 'text-[#0f7ea7]',
    badge: 'bg-[#f0fbff]/85 text-[#0f7ea7]',
    motion: 'linear-gradient(135deg, rgba(102,219,255,0.42), rgba(188,231,255,0.32), rgba(208,182,255,0.35))',
  },
  classical: {
    background: 'bg-gradient-to-br from-[#fffbf2]/95 via-[#fffdf7]/95 to-[#f6f8ff]/95',
    glow: 'bg-gradient-to-br from-[#ffe5b8]/50 via-transparent to-[#d8dfff]/45',
    title: 'text-[#9c6b1a]',
    badge: 'bg-[#fff8ea]/85 text-[#9c6b1a]',
    motion: 'linear-gradient(125deg, rgba(255,224,170,0.4), rgba(245,236,206,0.34), rgba(210,218,255,0.28))',
  },
  country: {
    background: 'bg-gradient-to-br from-[#fff6ef]/95 via-[#fffaf5]/95 to-[#fff4e2]/95',
    glow: 'bg-gradient-to-br from-[#ffd1a1]/50 via-transparent to-[#ffe2b9]/55',
    title: 'text-[#b0651c]',
    badge: 'bg-[#fff3e3]/85 text-[#b0651c]',
    motion: 'linear-gradient(125deg, rgba(255,196,150,0.42), rgba(255,221,186,0.35), rgba(246,208,170,0.32))',
  },
  metal: {
    background: 'bg-gradient-to-br from-[#f5f6fa]/95 via-[#fbfbfe]/95 to-[#f1f2f8]/95',
    glow: 'bg-gradient-to-br from-[#cdd4e7]/55 via-transparent to-[#d6c0ff]/50',
    title: 'text-[#3b3f6a]',
    badge: 'bg-[#f4f5fb]/85 text-[#3b3f6a]',
    motion: 'linear-gradient(138deg, rgba(160,170,210,0.38), rgba(210,206,236,0.32), rgba(190,170,220,0.28))',
  },
  punk: {
    background: 'bg-gradient-to-br from-[#f9fff4]/95 via-[#fff7fb]/95 to-[#f4fffb]/95',
    glow: 'bg-gradient-to-br from-[#d7ff89]/45 via-transparent to-[#ffb3d9]/55',
    title: 'text-[#ba1d4f]',
    badge: 'bg-[#fff1f9]/85 text-[#ba1d4f]',
    motion: 'linear-gradient(130deg, rgba(255,190,230,0.45), rgba(247,255,190,0.35), rgba(190,255,234,0.32))',
  },
  reggae: {
    background: 'bg-gradient-to-br from-[#fffbe9]/95 via-[#f4fff3]/95 to-[#fff0f0]/95',
    glow: 'bg-gradient-to-br from-[#ffe58f]/45 via-transparent to-[#9ff2a4]/55',
    title: 'text-[#1b8b4a]',
    badge: 'bg-[#f3ffe9]/85 text-[#1b8b4a]',
    motion: 'linear-gradient(130deg, rgba(255,225,150,0.42), rgba(170,240,170,0.35), rgba(255,170,170,0.28))',
  },
  'hip-hop': {
    background: 'bg-gradient-to-br from-[#fff5ef]/95 via-[#fff9fb]/95 to-[#f2f5ff]/95',
    glow: 'bg-gradient-to-br from-[#ffc18f]/45 via-transparent to-[#d1b4ff]/55',
    title: 'text-[#7d27c7]',
    badge: 'bg-[#f8efff]/85 text-[#7d27c7]',
    motion: 'linear-gradient(128deg, rgba(255,188,126,0.4), rgba(214,179,255,0.35), rgba(255,221,174,0.32))',
  },
  'r&b': {
    background: 'bg-gradient-to-br from-[#fdf2ff]/95 via-[#fff5fb]/95 to-[#f8f4ff]/95',
    glow: 'bg-gradient-to-br from-[#f2b2ff]/45 via-transparent to-[#ffc6da]/55',
    title: 'text-[#8c2f76]',
    badge: 'bg-[#fef2fb]/85 text-[#8c2f76]',
    motion: 'linear-gradient(130deg, rgba(240,170,255,0.42), rgba(255,210,235,0.32), rgba(210,190,255,0.32))',
  },
  soul: {
    background: 'bg-gradient-to-br from-[#fff4ec]/95 via-[#fff9f3]/95 to-[#fef4ff]/95',
    glow: 'bg-gradient-to-br from-[#ffc9a5]/45 via-transparent to-[#ffdfe6]/55',
    title: 'text-[#b2552a]',
    badge: 'bg-[#fff0e6]/85 text-[#b2552a]',
    motion: 'linear-gradient(128deg, rgba(255,190,150,0.42), rgba(255,223,200,0.35), rgba(241,190,210,0.3))',
  },
}

function getJamAccent(genre?: Genre, instrument?: Instrument): JamAccent {
  if (genre) {
    const genreAccent = genreAccentMap[genre]
    if (genreAccent) {
      return genreAccent
    }
  }
  const instrumentKey = instrument ? jamInstrumentCategoryMap[instrument] ?? 'default' : 'default'
  return instrumentAccentMap[instrumentKey]
}

export type JamParticipation = 'hosting' | 'attending' | 'pending'

interface JamCardProps {
  jam: Jam
  participation?: JamParticipation
}

const participationMeta: Record<JamParticipation, { label: string; tone: string }> = {
  hosting: {
    label: "You're hosting",
    tone: 'bg-gradient-to-r from-primary-500/90 to-primary-600 text-white shadow-[0_12px_28px_-16px_rgba(84,63,255,0.55)]',
  },
  attending: {
    label: "You're in",
    tone: 'bg-gradient-to-r from-primary-500/80 to-primary-600/90 text-white shadow-[0_12px_28px_-16px_rgba(84,63,255,0.55)]',
  },
  pending: {
    label: 'Request pending',
    tone: 'bg-gradient-to-r from-amber-400/90 to-amber-500 text-white shadow-[0_12px_28px_-16px_rgba(251,191,36,0.45)]',
  },
}

export function JamCard({ jam, participation }: JamCardProps) {
  const router = useRouter()
  const jamDate = new Date(jam.jam_time)
  const isPast = jamDate < new Date()
  const locationLine = [jam.city, jam.country].filter(Boolean).join(', ')
  const primaryInstrument = jam.desired_instruments[0]
  const primaryGenre = jam.host?.genres?.[0]
  const accent = getJamAccent(primaryGenre, primaryInstrument)
  const hostName = jam.host?.display_name
  const instrumentDisplay = jam.desired_instruments.slice(0, 3)
  const remainingInstrumentCount = Math.max(jam.desired_instruments.length - instrumentDisplay.length, 0)
  const participationBadge = participation
    ? participationMeta[participation]
    : { label: 'Open spots', tone: 'bg-gradient-to-r from-primary-500/80 to-primary-600/90 text-white shadow-[0_12px_28px_-16px_rgba(84,63,255,0.5)]' }

  const handleCardClick = () => {
    router.push(`/jams/${jam.id}`)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  return (
    <article
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/70 p-6 text-left shadow-[0_8px_28px_rgba(84,63,255,0.08)] backdrop-blur-[6px] transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-200 md:p-7 xl:p-8',
        accent.background,
        isPast
          ? 'opacity-80 saturate-[0.92]'
          : 'group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_36px_rgba(84,63,255,0.12)]',
      ].join(' ')}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <span
        className={[
          'absolute left-6 top-6 z-30 inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-white md:left-7 md:top-7 xl:left-8 xl:top-8',
          participationBadge.tone,
        ].join(' ')}
      >
        {participationBadge.label}
      </span>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="genre-motion-layer animate-genre-ambient opacity-40 blur-[0.5px] transition-opacity duration-500 group-hover:opacity-70"
          style={{ backgroundImage: accent.motion }}
        />
        <div className="absolute inset-0 bg-white/10" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      >
        <div className={`absolute -left-24 top-0 h-48 w-48 rounded-full blur-[120px] mix-blend-screen ${accent.glow}`} />
        <div className={`absolute right-0 -bottom-24 h-52 w-52 rounded-full blur-[140px] mix-blend-screen ${accent.glow}`} />
      </div>

      <div className="relative z-30 flex min-h-full flex-col gap-6 pt-12 pointer-events-none">
        <div className="jam-card-layout flex-1">
          <div className="flex flex-col gap-2">
            <h3 className="line-clamp-2 font-display text-[22px] font-semibold leading-tight text-slate-900 md:text-[24px]">
              {jam.title}
            </h3>
            {jam.description && (
              <p className="jam-card-description text-base text-slate-700/90">
                {jam.description}
              </p>
            )}
            {hostName && participation !== 'hosting' && jam.host?.id && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${accent.badge}`}
                >
                  Hosted by {hostName}
                </div>
                <div
                  className="relative z-40"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <ConnectButton
                    targetUserId={jam.host.id}
                    targetDisplayName={hostName}
                    initialStatus="none"
                    contextJamId={jam.id}
                    label="Jam together"
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>
          <div
            className="mt-4 border-t border-white/50 pt-4 text-left text-slate-600 lg:mt-0 lg:rounded-[24px] lg:border lg:border-white/50 lg:bg-gradient-to-b lg:from-white/70 lg:via-white/30 lg:to-white/60 lg:p-5 lg:text-right lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] lg:backdrop-blur"
            aria-label="Date and location"
          >
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  When
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{format(jamDate, 'EEE, MMM d')}</p>
                <p className="text-sm font-semibold text-slate-800">{format(jamDate, 'h:mm a')}</p>
              </div>
              {locationLine && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Where
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{locationLine}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              Looking for
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {instrumentDisplay.map((instrument) => (
                <span
                  key={instrument}
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[13px] font-medium text-slate-700/90 shadow-sm backdrop-blur-md"
                >
                  <span className="text-primary-500">
                    {getInstrumentIcon(instrument, { className: 'h-4 w-4', strokeWidth: 1.5 })}
                  </span>
                  {formatInstrument(instrument)}
                </span>
              ))}
              {remainingInstrumentCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-dashed border-white/60 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                  +{remainingInstrumentCount} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function formatInstrument(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
