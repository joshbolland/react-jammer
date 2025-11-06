import Link from 'next/link'
import { format } from 'date-fns'
import { Jam, type Instrument } from '@/lib/types'
import { getInstrumentIcon } from './InstrumentIcon'

type JamAccentKey = 'default' | 'strings' | 'percussion' | 'voice' | 'keys' | 'brass' | 'wind'

type JamAccent = {
  background: string
  glow: string
  title: string
  badge: string
}

const jamAccentMap: Record<JamAccentKey, JamAccent> = {
  default: {
    background: 'bg-gradient-to-br from-[#f8f5ff]/95 via-white/95 to-[#f7faff]/95',
    glow: 'bg-gradient-to-br from-[#d7c9ff]/55 via-transparent to-[#f5f0ff]/65',
    title: 'text-[#6f34e6]',
    badge: 'bg-[#f8f4ff]/85 text-[#6f34e6]',
  },
  strings: {
    background: 'bg-gradient-to-br from-[#fff5f0]/95 via-white/95 to-[#f8efff]/95',
    glow: 'bg-gradient-to-br from-[#ffd9c5]/60 via-transparent to-[#f2e1ff]/60',
    title: 'text-[#b45a2b]',
    badge: 'bg-[#fff6ee]/85 text-[#b45a2b]',
  },
  percussion: {
    background: 'bg-gradient-to-br from-[#fff8ed]/95 via-white/95 to-[#fff0f0]/95',
    glow: 'bg-gradient-to-br from-[#ffe9bf]/60 via-transparent to-[#ffe1d6]/55',
    title: 'text-[#b78516]',
    badge: 'bg-[#fff9e6]/85 text-[#b78516]',
  },
  voice: {
    background: 'bg-gradient-to-br from-[#fdf2ff]/95 via-white/95 to-[#f3f8ff]/95',
    glow: 'bg-gradient-to-br from-[#ffd1f0]/55 via-transparent to-[#d9d0ff]/60',
    title: 'text-[#a23478]',
    badge: 'bg-[#fff4fb]/80 text-[#a23478]',
  },
  keys: {
    background: 'bg-gradient-to-br from-[#f0f8ff]/95 via-white/95 to-[#f5f1ff]/95',
    glow: 'bg-gradient-to-br from-[#aee5ff]/55 via-transparent to-[#dcd6ff]/60',
    title: 'text-[#0f74aa]',
    badge: 'bg-[#f5fbff]/85 text-[#0f74aa]',
  },
  brass: {
    background: 'bg-gradient-to-br from-[#f0fff9]/95 via-white/95 to-[#f9f3ff]/95',
    glow: 'bg-gradient-to-br from-[#b8ffe6]/55 via-transparent to-[#e4f8ff]/60',
    title: 'text-[#0b8f65]',
    badge: 'bg-[#f3fff9]/85 text-[#0b8f65]',
  },
  wind: {
    background: 'bg-gradient-to-br from-[#f2f5ff]/95 via-white/95 to-[#fdf4ff]/95',
    glow: 'bg-gradient-to-br from-[#cfd7ff]/55 via-transparent to-[#f3e6ff]/60',
    title: 'text-[#3e4fff]',
    badge: 'bg-[#f4f6ff]/85 text-[#3e4fff]',
  },
}

const jamInstrumentCategoryMap: Partial<Record<Instrument, JamAccentKey>> = {
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

function getJamAccent(instrument?: Instrument): JamAccent {
  const key = instrument ? jamInstrumentCategoryMap[instrument] ?? 'default' : 'default'
  return jamAccentMap[key]
}

interface JamCardProps {
  jam: Jam & { host?: any }
}

export function JamCard({ jam }: JamCardProps) {
  const jamDate = new Date(jam.jam_time)
  const isPast = jamDate < new Date()
  const locationLine = [jam.city, jam.country].filter(Boolean).join(', ')
  const primaryInstrument = jam.desired_instruments[0]
  const accent = getJamAccent(primaryInstrument)
  const hostName = jam.host?.display_name
  const instrumentDisplay = jam.desired_instruments.slice(0, 3)
  const remainingInstrumentCount = Math.max(jam.desired_instruments.length - instrumentDisplay.length, 0)

  return (
    <Link href={`/jams/${jam.id}`} className="group block h-full">
      <article
        className={[
          'relative flex h-full flex-col overflow-hidden rounded-[32px] border border-white/60 px-6 py-6 shadow-[0_45px_120px_-70px_rgba(97,76,200,0.45)] transition-all duration-300 ease-out backdrop-blur',
          accent.background,
          isPast
            ? 'opacity-80 saturate-[0.92]'
            : 'group-hover:-translate-y-1 group-hover:shadow-[0_70px_150px_-80px_rgba(97,76,200,0.6)]',
        ].join(' ')}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className={`absolute -left-24 top-0 h-48 w-48 rounded-full blur-[120px] mix-blend-screen ${accent.glow}`} />
          <div className={`absolute right-0 -bottom-24 h-52 w-52 rounded-full blur-[140px] mix-blend-screen ${accent.glow}`} />
        </div>

        <div className="relative z-10 flex h-full flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {jam.title}
              </h3>
              {hostName && (
                <div className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${accent.badge}`}>
                  Hosted by {hostName}
                </div>
              )}
            </div>
            <div className="text-right text-xs uppercase tracking-[0.32em] text-slate-500 sm:justify-self-end">
              <span className={accent.title}>{format(jamDate, 'EEE • MMM d')}</span>
              <div className="mt-1 text-sm font-semibold tracking-[0.24em] text-slate-700">
                {format(jamDate, 'h:mm a')}
              </div>
              {locationLine && (
                <div className="mt-1 text-[10px] text-slate-400">
                  {locationLine}
                </div>
              )}
            </div>
          </div>

          {jam.description && (
            <p className="line-clamp-3 text-sm text-slate-600 transition-colors duration-300 group-hover:text-slate-700">
              {jam.description}
            </p>
          )}

          <div className="mt-auto space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Looking for
            </p>
            <div className="flex flex-wrap gap-2">
              {instrumentDisplay.map((instrument) => (
                <span
                  key={instrument}
              aria-label={instrument}
              className="group/instrument inline-flex items-center rounded-full border border-white/55 bg-white/75 px-2 py-1 text-xs font-medium text-slate-600 shadow-[0_12px_28px_-22px_rgba(24,39,75,0.35)] transition-all duration-200 hover:border-primary-200 hover:text-primary-600"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center text-current">
                    {getInstrumentIcon(instrument, { className: 'h-5 w-5', strokeWidth: 1.75 })}
              </span>
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover/instrument:ml-2 group-hover/instrument:max-w-xs group-hover/instrument:opacity-100">
                {instrument}
              </span>
            </span>
              ))}
              {remainingInstrumentCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-dashed border-white/55 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                  +{remainingInstrumentCount} more
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
