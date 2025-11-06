import Link from 'next/link'
import Image from 'next/image'
import { Profile, type ExperienceLevel } from '@/lib/types'
import { getInstrumentIcon } from './InstrumentIcon'

type ExperienceTheme = {
  background: string
  haloPrimary: string
  haloSecondary: string
  badge: string
}

const genreColorMap: Record<string, string> = {
  rock: 'bg-red-100 text-red-700 border-red-200/60',
  pop: 'bg-pink-100 text-pink-700 border-pink-200/60',
  jazz: 'bg-indigo-100 text-indigo-700 border-indigo-200/60',
  blues: 'bg-blue-100 text-blue-700 border-blue-200/60',
  funk: 'bg-amber-100 text-amber-800 border-amber-200/60',
  soul: 'bg-orange-100 text-orange-700 border-orange-200/60',
  hiphop: 'bg-stone-100 text-stone-700 border-stone-200/60',
  'hip-hop': 'bg-stone-100 text-stone-700 border-stone-200/60',
  hip_hop: 'bg-stone-100 text-stone-700 border-stone-200/60',
  electronic: 'bg-purple-100 text-purple-700 border-purple-200/60',
  classical: 'bg-emerald-100 text-emerald-700 border-emerald-200/60',
  folk: 'bg-lime-100 text-lime-700 border-lime-200/60',
  metal: 'bg-slate-200 text-slate-800 border-slate-300/60',
  'r&b': 'bg-rose-100 text-rose-700 border-rose-200/60',
}

const experienceThemes: Record<'default' | ExperienceLevel, ExperienceTheme> = {
  default: {
    background: 'bg-gradient-to-br from-white via-[#f7f6ff]/95 to-white/95',
    haloPrimary: 'bg-primary-300/25',
    haloSecondary: 'bg-sky-200/25',
    badge: 'border-primary-200/70 bg-primary-50/80 text-primary-700',
  },
  beginner: {
    background: 'bg-gradient-to-br from-[#f5f2ff]/95 via-white/95 to-[#f2f7ff]/95',
    haloPrimary: 'bg-[#cfc5ff]/30',
    haloSecondary: 'bg-[#bfe3ff]/25',
    badge: 'border-[#cfc5ff]/70 bg-[#f1edff]/80 text-[#5b3fc6]',
  },
  intermediate: {
    background: 'bg-gradient-to-br from-[#f0f6ff]/95 via-white/95 to-[#f1f3ff]/95',
    haloPrimary: 'bg-[#bde0ff]/30',
    haloSecondary: 'bg-[#c9ccff]/25',
    badge: 'border-[#bde0ff]/70 bg-[#ecf6ff]/80 text-[#1a62b6]',
  },
  advanced: {
    background: 'bg-gradient-to-br from-[#eefcff]/95 via-white/95 to-[#f3f1ff]/95',
    haloPrimary: 'bg-[#b7f0ff]/28',
    haloSecondary: 'bg-[#c7c4ff]/25',
    badge: 'border-[#b7f0ff]/70 bg-[#f0fcff]/85 text-[#0b7f8f]',
  },
  professional: {
    background: 'bg-gradient-to-br from-[#eef2ff]/95 via-white/95 to-[#f1f3ff]/95',
    haloPrimary: 'bg-[#c3ccff]/30',
    haloSecondary: 'bg-[#a7e5ff]/25',
    badge: 'border-[#c3ccff]/70 bg-[#edf1ff]/85 text-[#3845c7]',
  },
}

const formatExperience = (value?: string | null) => {
  if (!value) return null
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

interface ProfileCardProps {
  profile: Profile
  showFull?: boolean
}

export function ProfileCard({ profile, showFull = false }: ProfileCardProps) {
  const experienceKey = (profile.experience_level ?? 'default') as keyof typeof experienceThemes
  const experienceStyle = experienceThemes[experienceKey]

  const cardBase =
    'relative overflow-hidden rounded-3xl border border-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(24,39,75,0.55)] transition-all duration-300 ease-out backdrop-blur'
  const hoverClasses = showFull
    ? ''
    : 'hover:-translate-y-1 hover:shadow-[0_60px_110px_-70px_rgba(24,39,75,0.55)]'

  const body = (
    <article className={`${cardBase} ${experienceStyle.background} ${hoverClasses}`}>
      <div
        className={`pointer-events-none absolute -right-16 -top-12 h-36 w-36 rounded-full blur-3xl transition-transform duration-500 ${experienceStyle.haloPrimary} group-hover:translate-x-4 group-hover:translate-y-4`}
      />
      <div
        className={`pointer-events-none absolute -bottom-16 left-16 h-40 w-40 rounded-full blur-3xl transition-transform duration-500 ${experienceStyle.haloSecondary} group-hover:-translate-y-4`}
      />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-white/70 via-white/40 to-transparent shadow-[inset_0_0_22px_-18px_rgba(24,39,75,0.35)]">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-3xl font-semibold text-primary-600">
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 rounded-2xl border border-white/60" />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {profile.display_name}
            </h3>
            {profile.experience_level && (
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${experienceStyle.badge}`}>
                {formatExperience(profile.experience_level)}
              </span>
            )}
          </div>
          {(profile.city || profile.country) && (
            <p className="mt-1 text-sm text-slate-500">
              {[profile.city, profile.country].filter(Boolean).join(', ')}
            </p>
          )}
          {profile.bio && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {profile.instruments.length > 0 && (
        <div className="relative z-10 mt-6 flex flex-wrap gap-2">
          {profile.instruments.map((instrument) => (
            <span
              key={instrument}
              aria-label={instrument}
              className="group/instrument inline-flex items-center rounded-full border border-white/55 bg-white/80 px-2 py-1 text-xs font-medium text-slate-600 shadow-[0_12px_28px_-22px_rgba(24,39,75,0.35)] transition-all duration-200 hover:border-primary-200 hover:text-primary-600"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center text-current">
                {getInstrumentIcon(instrument, { className: 'h-5 w-5', strokeWidth: 1.75 })}
              </span>
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover/instrument:ml-2 group-hover/instrument:max-w-xs group-hover/instrument:opacity-100">
                {instrument}
              </span>
            </span>
          ))}
        </div>
      )}

      {profile.genres.length > 0 && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-2">
          {profile.genres.map((genre) => {
            const normalized = genre.toLowerCase()
            const tone = genreColorMap[normalized] ?? 'bg-primary-100 text-primary-700 border-primary-200/60'
            return (
              <span key={genre} className={`tag-chip ${tone} text-sm font-medium`}>
                {genre}
              </span>
            )
          })}
        </div>
      )}

      {showFull && (
        <div className="relative z-10 mt-6 space-y-3 text-sm text-slate-600">
          {profile.availability && (
            <p>
              <span className="font-semibold text-slate-700">Availability:</span>{' '}
              {profile.availability}
            </p>
          )}
          {(profile.links.spotify || profile.links.youtube || profile.links.instagram) && (
            <div className="flex flex-wrap gap-4 text-primary-700">
              {profile.links.spotify && (
                <a
                  href={profile.links.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-900"
                >
                  Spotify
                </a>
              )}
              {profile.links.youtube && (
                <a
                  href={profile.links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-900"
                >
                  YouTube
                </a>
              )}
              {profile.links.instagram && (
                <a
                  href={profile.links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-900"
                >
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )

  if (showFull) {
    return body
  }

  return (
    <Link href={`/profile/${profile.id}`} className="group block">
      {body}
    </Link>
  )
}
