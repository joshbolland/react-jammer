'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import Image from 'next/image'
import { MapPin, Music2, Youtube, Instagram, Sparkles, Camera } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema } from '@/lib/validations'
import {
  INSTRUMENTS,
  GENRES,
  EXPERIENCE_LEVELS,
  type Profile,
  type Instrument,
  type Genre,
  type ExperienceLevel,
} from '@/lib/types'
import { getInstrumentIcon } from '@/components/InstrumentIcon'
import { createSupabaseClient } from '@/lib/supabase-client'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const baseInstrumentGroups: Array<{ title: string; instruments: Instrument[] }> = [
  {
    title: 'Strings & Frets',
    instruments: ['guitar', 'bass', 'ukulele', 'banjo', 'mandolin', 'violin', 'viola', 'cello'],
  },
  {
    title: 'Keys & Voice',
    instruments: ['piano', 'keyboard', 'vocals'],
  },
  {
    title: 'Winds & Brass',
    instruments: ['saxophone', 'trumpet', 'trombone', 'clarinet', 'flute', 'harmonica'],
  },
  {
    title: 'Percussion',
    instruments: ['drums'],
  },
]

const groupedInstrumentSet = new Set(baseInstrumentGroups.flatMap((group) => group.instruments))
const additionalInstruments = INSTRUMENTS.filter((instrument) => !groupedInstrumentSet.has(instrument))

const instrumentGroups: Array<{ title: string; instruments: Instrument[] }> = additionalInstruments.length
  ? [...baseInstrumentGroups, { title: 'More', instruments: additionalInstruments }]
  : baseInstrumentGroups

const genreAccentMap: Partial<Record<Genre, string>> = {
  rock: 'from-rose-500/90 to-orange-500/90',
  jazz: 'from-sky-500/90 to-indigo-500/90',
  pop: 'from-pink-400/90 to-purple-500/90',
  indie: 'from-emerald-400/90 to-teal-500/90',
  folk: 'from-amber-400/90 to-lime-500/90',
  blues: 'from-blue-400/90 to-blue-600/90',
  electronic: 'from-cyan-400/90 to-purple-500/90',
  classical: 'from-amber-300/90 to-rose-300/90',
  country: 'from-orange-400/90 to-yellow-500/90',
  metal: 'from-slate-600/90 to-slate-800/90',
  punk: 'from-fuchsia-500/90 to-red-500/90',
  reggae: 'from-lime-400/90 to-emerald-500/90',
  'hip-hop': 'from-purple-500/90 to-slate-700/90',
  'r&b': 'from-rose-400/90 to-violet-500/90',
  soul: 'from-amber-400/90 to-pink-500/90',
}

const availabilityPresets = ['Weekdays', 'Evenings', 'Weekends', 'Flexible'] as const

interface ProfileFormProps {
  profile?: Profile | null
  onSuccess?: () => void
}

type ProfileFormValues = z.infer<typeof profileSchema>
type ProfilesInsert = Database['public']['Tables']['profiles']['Insert']

export function ProfileForm({ profile, onSuccess }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const [locationInput, setLocationInput] = useState(() => {
    const city = profile?.city ?? ''
    const country = profile?.country ?? ''
    return [city, country].filter(Boolean).join(', ')
  })
  const supabase: SupabaseClient<Database> = createSupabaseClient()

  useEffect(() => {
    // Temporary: expose Supabase client for debugging storage auth issues in development.
    if (process.env.NODE_ENV !== 'development') return
    if (typeof window === 'undefined') return

      ; (window as any).supabase = supabase
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token ?? null
      // eslint-disable-next-line no-console
      console.debug('[ProfileForm] Supabase session token present:', Boolean(token))
    })
  }, [supabase])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile
      ? {
        display_name: profile.display_name,
        instruments: profile.instruments,
        genres: profile.genres,
        experience_level: profile.experience_level,
        bio: profile.bio ?? '',
        availability: profile.availability ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
        lat: profile.lat ?? null,
        lng: profile.lng ?? null,
        links: {
          spotify: profile.links?.spotify ?? '',
          youtube: profile.links?.youtube ?? '',
          instagram: profile.links?.instagram ?? '',
        },
      }
      : {
        display_name: '',
        instruments: [],
        genres: [],
        experience_level: null,
        bio: '',
        availability: '',
        city: '',
        country: '',
        lat: null,
        lng: null,
        links: {
          spotify: '',
          youtube: '',
          instagram: '',
        },
      },
  })

  const selectedInstruments: Instrument[] = watch('instruments') ?? []
  const selectedGenres: Genre[] = watch('genres') ?? []
  const displayName = watch('display_name') ?? ''
  const experienceLevel = watch('experience_level')
  const availabilityValue = watch('availability') ?? ''
  const cityValue = watch('city') ?? ''
  const countryValue = watch('country') ?? ''

  const availabilitySegments = availabilityValue
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const selectedAvailability = availabilitySegments.filter((item): item is (typeof availabilityPresets)[number] =>
    (availabilityPresets as readonly string[]).includes(item)
  )

  const customAvailabilityNote = availabilitySegments
    .filter((item) => !(availabilityPresets as readonly string[]).includes(item))
    .join(', ')

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  useEffect(() => {
    const combined = [cityValue, countryValue].filter(Boolean).join(', ')
    setLocationInput((prev) => (prev === combined ? prev : combined))
  }, [cityValue, countryValue])

  const toggleInstrument = (instrument: Instrument) => {
    const current = selectedInstruments
    const updated = current.includes(instrument)
      ? current.filter((i) => i !== instrument)
      : [...current, instrument]
    setValue('instruments', updated, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const toggleGenre = (genre: Genre) => {
    const current = selectedGenres
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre]
    setValue('genres', updated, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const toggleExperience = (level: ExperienceLevel) => {
    const current = experienceLevel ?? null
    const nextValue = current === level ? null : level
    setValue('experience_level', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const toggleAvailability = (option: (typeof availabilityPresets)[number]) => {
    const current = new Set(selectedAvailability)
    if (current.has(option)) {
      current.delete(option)
    } else {
      current.add(option)
    }
    const segments: string[] = Array.from(current)
    const note = customAvailabilityNote.trim()
    if (note.length > 0) {
      segments.push(note)
    }
    const nextValue = segments.join(', ')
    setValue('availability', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const handleLocationCommit = () => {
    const raw = locationInput.trim()
    if (!raw) {
      setValue('city', '', { shouldDirty: true, shouldTouch: true, shouldValidate: true })
      setValue('country', '', { shouldDirty: true, shouldTouch: true, shouldValidate: true })
      return
    }

    const [cityPart, ...rest] = raw.split(',').map((part) => part.trim()).filter(Boolean)
    const nextCity = cityPart ?? ''
    const nextCountry = rest.join(', ')

    setValue('city', nextCity, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setValue('country', nextCountry, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const handleLocationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleLocationCommit()
    }
  }

  const handleCustomAvailabilityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const note = event.target.value
    const segments: string[] = [...selectedAvailability]
    const trimmedNote = note.trim()
    if (trimmedNote.length > 0) {
      segments.push(trimmedNote)
    }
    const nextValue = segments.join(', ')
    setValue('availability', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const instrumentChipBase =
    'group relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium capitalize transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
  const instrumentChipActive =
    'border-transparent bg-gradient-to-r from-primary-500/90 to-primary-600/90 text-white shadow-[0_24px_48px_-28px_rgba(112,66,255,0.75)]'
  const instrumentChipInactive =
    'border-primary-100/70 bg-white/90 text-slate-600 shadow-[0_18px_40px_-30px_rgba(112,66,255,0.35)] hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-700'

  const genreChipBase =
    'relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
  const genreChipInactive =
    'border-primary-100/60 bg-white/90 text-slate-600 shadow-[0_16px_38px_-32px_rgba(112,66,255,0.32)] hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary-700'
  const genreChipActiveShadow = 'shadow-[0_22px_52px_-26px_rgba(112,66,255,0.55)]'

  const experienceChipBase =
    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold capitalize tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
  const experienceChipActive =
    'border-transparent bg-gradient-to-r from-primary-500/95 to-primary-700/95 text-white shadow-[0_26px_56px_-30px_rgba(112,66,255,0.65)]'
  const experienceChipInactive =
    'border-primary-100/70 bg-white/90 text-slate-600 shadow-[0_18px_42px_-32px_rgba(112,66,255,0.3)] hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary-700'

  const availabilityChipBase =
    'inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white'

  const availabilityChipActive =
    'border-transparent bg-gradient-to-r from-primary-500/90 to-primary-600/90 text-white shadow-[0_20px_48px_-26px_rgba(112,66,255,0.55)]'
  const availabilityChipInactive =
    'border-primary-100/70 bg-white/90 text-slate-600 shadow-[0_16px_38px_-30px_rgba(112,66,255,0.28)] hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary-700'

  const experienceLabels: Record<ExperienceLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    professional: 'Pro',
  }

  const socialFields = [
    { id: 'spotify', label: 'Spotify', icon: Music2, accent: 'text-emerald-500', placeholder: 'spotify.com/artist/...' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, accent: 'text-rose-500', placeholder: 'youtube.com/@yourchannel' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, accent: 'text-pink-500', placeholder: 'instagram.com/yourhandle' },
  ] as const

  const extractAvatarPath = (url: string) => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      const marker = '/object/public/avatars/'
      const index = parsed.pathname.indexOf(marker)
      if (index === -1) return null
      return decodeURIComponent(parsed.pathname.slice(index + marker.length))
    } catch {
      const [, path] = url.split('/avatars/')
      return path ?? null
    }
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null)
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file')
      return
    }

    const maxSizeMb = 5
    if (file.size > maxSizeMb * 1024 * 1024) {
      setAvatarError(`Image must be smaller than ${maxSizeMb}MB`)
      return
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    const objectUrl = URL.createObjectURL(file)
    setAvatarFile(file)
    setAvatarPreview(objectUrl)

    // Allow the same file to be re-selected if needed
    event.target.value = ''
  }

  const uploadAvatarThroughApi = async (file: File, oldPath: string | null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (oldPath) {
      formData.append('oldPath', oldPath)
    }

    const response = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = typeof payload.error === 'string' && payload.error.length > 0
        ? payload.error
        : 'Failed to upload avatar. Please try again.'
      throw new Error(message)
    }

    return payload as { path: string; publicUrl: string }
  }

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true)
    setError(null)
    setAvatarError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Clean up links - remove empty strings
      const links = {
        spotify: data.links?.spotify || null,
        youtube: data.links?.youtube || null,
        instagram: data.links?.instagram || null,
      } satisfies ProfilesInsert['links']

      const currentAvatarUrl = profile?.avatar_url ?? null
      let avatar_url: string | null = currentAvatarUrl
      const oldAvatarPath = currentAvatarUrl ? extractAvatarPath(currentAvatarUrl) : null

      if (avatarFile) {
        try {
          const uploadResult = await uploadAvatarThroughApi(avatarFile, oldAvatarPath)
          avatar_url = uploadResult.publicUrl
        } catch (uploadError: any) {
          const friendly = uploadError?.message ?? 'Failed to upload avatar.'
          setAvatarError(friendly)
          setError(friendly)
          return
        }
      }

      const upsertPayload: ProfilesInsert = {
        id: user.id,
        display_name: data.display_name,
        instruments: data.instruments,
        genres: data.genres,
        experience_level: data.experience_level,
        bio: data.bio || null,
        availability: data.availability || null,
        city: data.city || null,
        country: data.country || null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        links,
        avatar_url,
      }

      const { id: _omit, ...updatePayload } = upsertPayload
      const { data: updatedRows, error: updateError } = await (supabase
        .from('profiles') as any)
        .update(updatePayload)
        .eq('id', user.id)
        .select('id')

      if (updateError) throw updateError

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await (supabase.from('profiles') as any).insert(upsertPayload)
        if (insertError) {
          const message = String(insertError.message || '').toLowerCase()
          if (message.includes('row-level security')) {
            const friendly =
              'Supabase row-level security blocked profile creation. Ensure the "Users can insert own profile" policy exists for the profiles table.'
            setError(friendly)
            return
          }
          throw insertError
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/85 px-4 py-3 text-sm font-medium text-rose-600 shadow-[0_24px_60px_-45px_rgba(225,29,72,0.45)]">
          {error}
        </div>
      )}

      <section className="rounded-[32px] border border-primary-100/70 bg-white/95 p-6 md:p-8 shadow-[0_55px_140px_-80px_rgba(90,70,200,0.45)]">
        <div className="space-y-10">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,240px)] md:items-start">
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="display_name"
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                >
                  Display name *
                </label>
                <input
                  id="display_name"
                  {...register('display_name')}
                  className="w-full rounded-3xl border border-transparent bg-white px-5 py-3 text-lg font-semibold text-slate-900 shadow-[0_30px_80px_-50px_rgba(91,65,200,0.6)] transition-all placeholder:text-slate-400/80 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300/60"
                  placeholder="Stage name, duo, or collective"
                />
                {errors.display_name && (
                  <p className="text-sm font-medium text-rose-500">
                    {errors.display_name.message as string}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <label
                htmlFor="avatar_upload"
                className="group relative block h-28 w-28 cursor-pointer md:h-32 md:w-32"
                aria-label="Change profile photo"
              >
                <input
                  id="avatar_upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
                <span
                  className="absolute inset-0 -z-10 rounded-full bg-primary-200/45 blur-2xl transition-transform duration-500 group-hover:scale-110 group-hover:opacity-95"
                  aria-hidden="true"
                />
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/60 bg-[radial-gradient(circle_at_top,#f5f0ff_0%,rgba(167,130,255,0.35)_55%,rgba(255,255,255,0.18)_100%)] shadow-[0_32px_76px_-38px_rgba(90,70,200,0.78)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_45px_96px_-44px_rgba(90,70,200,0.75)]">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Profile preview" fill className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-primary-100 text-3xl font-semibold uppercase tracking-wide text-primary-800">
                      {(displayName || profile?.display_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="pointer-events-none absolute inset-0 rounded-full border border-white/30 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_55px_-18px_rgba(167,130,255,0.8)]" />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-slate-900/0 transition duration-300 group-hover:bg-slate-900/30" />
                  <Camera
                    className="pointer-events-none absolute h-8 w-8 text-white opacity-0 transition duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                    strokeWidth={1.7}
                  />
                </div>
              </label>
              <p className="text-xs text-slate-400">PNG or JPG up to 5MB. Clear images look best.</p>
              {avatarError && (
                <p className="text-center text-sm font-medium text-rose-500 md:text-right">{avatarError}</p>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-100/80 to-transparent" />

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Location
              </span>
              <p className="text-sm text-slate-500">Let people know where you&apos;re based.</p>
              <div className="mt-3 flex items-center gap-3 rounded-3xl border border-primary-100/70 bg-white px-4 py-3 shadow-[0_26px_72px_-44px_rgba(112,66,255,0.32)]">
                <MapPin className="h-5 w-5 text-primary-500" aria-hidden="true" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                  onBlur={handleLocationCommit}
                  onKeyDown={handleLocationKeyDown}
                  placeholder="City, Country"
                  className="flex-1 border-none bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400/80 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-400">
                We&apos;ll use this to match you with nearby jams and musicians.
              </p>
              <input type="hidden" {...register('city')} />
              <input type="hidden" {...register('country')} />
            </div>

            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Social links
              </span>
              <p className="text-sm text-slate-500">Add the places you publish, perform, or share your music.</p>
              <div className="mt-3 space-y-3">
                {socialFields.map(({ id, label, icon: Icon, accent, placeholder }) => (
                  <label
                    key={id}
                    className="flex items-center gap-3 rounded-3xl border border-primary-100/70 bg-white px-4 py-3 shadow-[0_26px_70px_-44px_rgba(112,66,255,0.32)] focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-300/55 focus-within:ring-offset-2 focus-within:ring-offset-white"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50/60 ${accent}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <div className="flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        {label}
                      </span>
                      <input
                        {...register(`links.${id}` as const)}
                        type="url"
                        placeholder={placeholder}
                        className="mt-1 w-full border-none bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400/80 focus:outline-none"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-primary-100/70 bg-gradient-to-br from-white via-[#f6f3ff] to-[#f5fbff] p-6 md:p-8 shadow-[0_55px_150px_-90px_rgba(90,70,200,0.42)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your sound</h2>
            <p className="text-sm text-slate-500">Choose the instruments and genres that fit you best.</p>
          </div>
          <Sparkles className="h-5 w-5 text-primary-500 md:h-6 md:w-6" aria-hidden="true" />
        </div>

        <div className="mt-8 space-y-8">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Instruments *
              </span>
              <span className="text-xs text-slate-400">Select at least one</span>
            </div>
            <div className="mt-4 space-y-6">
              {instrumentGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {group.instruments.map((instrument) => {
                      const isActive = selectedInstruments.includes(instrument)
                      const chipClasses = `${instrumentChipBase} ${isActive ? instrumentChipActive : instrumentChipInactive}`
                      return (
                        <button
                          type="button"
                          key={instrument}
                          onClick={() => toggleInstrument(instrument)}
                          aria-pressed={isActive}
                          className={chipClasses}
                        >
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${isActive
                              ? 'bg-white/15 text-white'
                              : 'bg-primary-50 text-primary-600 shadow-[inset_0_1px_4px_rgba(255,255,255,0.8)]'
                              }`}
                          >
                            {getInstrumentIcon(instrument, {
                              className: `h-4 w-4 ${isActive ? 'text-white' : 'text-primary-500'}`,
                            })}
                          </span>
                          <span>{instrument}</span>
                          {isActive && (
                            <span className="pointer-events-none absolute inset-0 rounded-full border border-white/10 opacity-80 mix-blend-screen" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {errors.instruments && (
              <p className="mt-3 text-sm font-medium text-rose-500">
                {errors.instruments.message as string}
              </p>
            )}
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-100/60 to-transparent" />

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Genres *
              </span>
              <span className="text-xs text-slate-400">Choose the styles that suit you</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {GENRES.map((genre) => {
                const isActive = selectedGenres.includes(genre)
                const gradient = genreAccentMap[genre] ?? 'from-primary-500/90 to-primary-600/90'
                const chipClasses = `${genreChipBase} ${isActive
                  ? `border-transparent bg-gradient-to-r ${gradient} text-white ${genreChipActiveShadow}`
                  : genreChipInactive
                  }`
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    aria-pressed={isActive}
                    className={chipClasses}
                  >
                    <span className="text-xs tracking-[0.22em]">{genre.toUpperCase()}</span>
                  </button>
                )
              })}
            </div>
            {errors.genres && (
              <p className="mt-3 text-sm font-medium text-rose-500">
                {errors.genres.message as string}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/80 bg-white/95 p-6 md:p-8 shadow-[0_55px_140px_-90px_rgba(15,23,42,0.32)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Experience level
              </span>
              <p className="mt-1 text-sm text-slate-500">Pick the option that matches your experience.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {EXPERIENCE_LEVELS.map((level) => {
                  const isActive = experienceLevel === level
                  const chipClasses = `${experienceChipBase} ${isActive ? experienceChipActive : experienceChipInactive}`
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleExperience(level)}
                      aria-pressed={isActive}
                      className={chipClasses}
                    >
                      <span>{experienceLabels[level]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Availability
              </span>
              <p className="mt-1 text-sm text-slate-500">
                Quick-select what works, then add context if needed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availabilityPresets.map((option) => {
                  const isActive = selectedAvailability.includes(option)
                  const chipClasses = `${availabilityChipBase} ${isActive ? availabilityChipActive : availabilityChipInactive}`
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleAvailability(option)}
                      aria-pressed={isActive}
                      className={chipClasses}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                value={customAvailabilityNote}
                onChange={handleCustomAvailabilityChange}
                placeholder="Add a note, like Touring weekends or Studio-ready weekdays."
                className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_20px_48px_-36px_rgba(112,66,255,0.32)] placeholder:text-slate-400/80 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300/60"
              />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Bio</span>
            <p className="mt-1 text-sm text-slate-500">
              Share a short intro to your sound, like influences or recent highlights.
            </p>
            <textarea
              id="bio"
              {...register('bio')}
              rows={6}
              className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-[0_26px_72px_-44px_rgba(112,66,255,0.32)] placeholder:text-slate-400/80 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300/60"
              placeholder="Share what drives your sound, like influences, energy, or recent milestones."
            />
            {errors.bio && (
              <p className="mt-2 text-sm font-medium text-rose-500">
                {errors.bio.message as string}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-primary-100/70 bg-white/95 p-6 md:p-8 shadow-[0_55px_150px_-90px_rgba(90,70,200,0.38)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <button type="submit" disabled={loading} className="btn-primary w-full max-w-md">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
          <p className="text-sm font-medium text-slate-500">
            {loading ? 'Hang tight, saving your profile.' : 'Save when you are ready to share.'}
          </p>
        </div>
      </section>
    </form>
  )
}
