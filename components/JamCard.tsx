'use client'

import Image from 'next/image'
import type { KeyboardEvent } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Jam, type Genre, type Instrument } from '@/lib/types'

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
    tone:
      'bg-white/90 px-3 py-1 text-primary-700 ring-1 ring-primary-100/80 shadow-[0_10px_40px_-26px_rgba(84,63,255,0.45)] backdrop-blur',
  },
  attending: {
    label: "You're in",
    tone:
      'bg-white/90 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100/80 shadow-[0_10px_40px_-26px_rgba(16,185,129,0.4)] backdrop-blur',
  },
  pending: {
    label: 'Request pending',
    tone:
      'bg-white/90 px-3 py-1 text-amber-700 ring-1 ring-amber-100/80 shadow-[0_10px_40px_-26px_rgba(251,191,36,0.4)] backdrop-blur',
  },
}

export function JamCard({ jam, participation }: JamCardProps) {
  const router = useRouter()
  const jamDate = new Date(jam.jam_time)
  const isPast = jamDate < new Date()
  const locationLine = [jam.city, jam.country].filter(Boolean).join(', ') || 'Location TBA'
  const primaryInstrument = jam.desired_instruments[0]
  const primaryGenre = jam.host?.genres?.[0]
  const accent = getJamAccent(primaryGenre, primaryInstrument)
  // Use || so empty strings fall back to avatar/gradient
  const coverImage = jam.cover_image_url || jam.host?.avatar_url || null
  const avatarSources = (jam.host?.avatar_url ? [jam.host.avatar_url] : []).slice(0, 3)
  const remainingSlots = Math.max(jam.max_attendees - avatarSources.length, 0)
  const timeBadge = format(jamDate, 'EEE • h:mm a')
  const dateLine = format(jamDate, 'EEE, MMM d • h:mm a')
  const participationBadge = participation
    ? participationMeta[participation]
    : {
        label: 'Open spots',
        tone:
          'bg-white/90 px-3 py-1 text-slate-800 ring-1 ring-white/70 shadow-[0_10px_34px_-22px_rgba(15,23,42,0.45)] backdrop-blur',
      }

  const handleCardClick = () => {
    router.push(`/jams/${jam.id}`)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[JamCard] cover', { id: jam.id, title: jam.title, cover: jam.cover_image_url })
  }

  return (
    <article
      className={[
        'group relative isolate aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-b from-white/70 via-white/60 to-white/80 text-left shadow-[0_28px_80px_-70px_rgba(15,23,42,0.55)] backdrop-blur transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-200',
        isPast
          ? 'opacity-80 saturate-[0.94]'
          : 'hover:-translate-y-1 hover:shadow-[0_32px_98px_-78px_rgba(15,23,42,0.7)]',
      ].join(' ')}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <div className={`absolute inset-0 ${coverImage ? '' : accent.background}`} />
        {coverImage && (
          <img
            src={coverImage}
            alt={jam.title}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-[1.05]"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/5 via-slate-900/10 to-slate-900/45" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-slate-900/18 to-slate-900/40" />
        <div className={`absolute inset-x-[-22%] bottom-[-28%] h-52 blur-3xl ${accent.glow}`} />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <span
            className={`inline-flex items-center rounded-full text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 ${participationBadge.tone}`}
          >
            {participationBadge.label}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-900/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90 ring-1 ring-white/30 backdrop-blur-sm">
            {timeBadge}
          </span>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/85 px-4 py-3 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.6)] backdrop-blur-md">
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="truncate font-display text-lg font-semibold text-slate-900 md:text-[20px]">{jam.title}</h3>
              <p className="truncate text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">{locationLine}</p>
              <p className="truncate text-sm font-medium text-slate-700">{dateLine}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {avatarSources.map((src, index) => (
                <span
                  key={`${src}-${index}`}
                  className="relative block h-9 w-9 overflow-hidden rounded-full border border-white/80 bg-white/80 shadow-sm"
                  style={{ marginLeft: index === 0 ? 0 : -10 }}
                >
                  <Image src={src} alt="Participant" fill className="object-cover" sizes="48px" unoptimized />
                </span>
              ))}
              {remainingSlots > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-white/70">
                  +{remainingSlots} spots
                </span>
              )}
              {avatarSources.length === 0 && remainingSlots === 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-white/70">
                  {participationBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
