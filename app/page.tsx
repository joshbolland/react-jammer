import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { SearchFilters } from '@/components/SearchFilters'
import { SearchResultsPanel, type SearchResultEntry } from '@/components/SearchResultsPanel'
import MapViewClient from '@/components/MapViewClient'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Jam, Profile } from '@/lib/types'
import { toJam } from '@/lib/transformers'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type HomePageSearchParams = Record<string, string | string[] | undefined>

interface HomePageProps {
  searchParams?: Promise<HomePageSearchParams>
}

const DEFAULT_MAP_CENTER: [number, number] = [51.505, -0.09]

interface ParsedFilters {
  instruments: string[]
  genres: string[]
  lat?: number
  lng?: number
  radiusMiles: number
  searchTerms: string[]
  dateFrom?: string
  dateTo?: string
}

const DEFAULT_RADIUS_MILES = 25
const MILES_TO_KM = 1.60934
const KM_TO_MILES = 1 / MILES_TO_KM

export default async function HomePage({ searchParams }: HomePageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const filters = parseFilters(resolvedSearchParams)
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentUserProfile: Profile | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      redirect('/onboarding')
    } else {
      currentUserProfile = profile as Profile
    }
  }

  const jamsPromise = buildJamsQuery(supabase, filters)

  const { data: jamRows } = await jamsPromise
  const typedJams = (jamRows ?? [])
    .map((row) => toJam(row))
    .filter((jam): jam is Jam => jam !== null)

  const jams = filterJams(typedJams, filters)
  const searchResults = buildJamSearchResultEntries(jams, filters)

  const mapCenter = determineMapCenter(filters, jams)

  const fallbackLocation =
    currentUserProfile && currentUserProfile.lat != null && currentUserProfile.lng != null
      ? {
          lat: currentUserProfile.lat,
          lng: currentUserProfile.lng,
          label: formatLocation(currentUserProfile.city, currentUserProfile.country) ?? 'Profile location',
        }
      : undefined

  return (
    <div className="relative isolate flex h-[calc(100vh-6rem)] w-full text-slate-900">
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden border-white/10 bg-white/20 backdrop-blur md:flex-row">
        <div className="flex w-full flex-col overflow-y-auto border-white/15 bg-white/70 backdrop-blur-sm md:h-full md:w-[360px] lg:w-[480px]">
          <SearchFilters variant="sidebar" fallbackLocation={fallbackLocation} />
          <SearchResultsPanel results={searchResults} variant="sidebar" />
        </div>
        <div className="relative flex flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-white/15 bg-white/40 px-6 py-4 backdrop-blur-sm md:border-l">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                Jam map
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Move around to see upcoming jams near you.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <span className="inline-flex items-center bg-primary-100/60 px-3 py-1 text-primary-600">
                {jams.length} Jams
              </span>
            </div>
          </div>
          <div className="relative flex-1">
            <MapViewClient jams={jams} mapCenter={mapCenter} height="100%" />
          </div>
        </div>
      </div>
    </div>
  )
}

function parseFilters(searchParams?: HomePageSearchParams): ParsedFilters {
  const getString = (key: string) => {
    const value = searchParams?.[key]
    if (Array.isArray(value)) return value[0]
    return value ?? ''
  }
  const getArray = (key: string) => {
    const value = searchParams?.[key]
    const entries = Array.isArray(value) ? value : value != null ? [value] : []
    return entries
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter((entry): entry is string => entry.length > 0)
  }

  const instruments = getArray('instrument')
  const genres = getArray('genre')
  const searchTerms = getArray('q')
  const radiusRaw = getString('radius')
  const lat = toNumber(getString('lat'))
  const lng = toNumber(getString('lng'))
  const radius = toNumber(radiusRaw)
  const dateFrom = parseIsoDate(getString('date_from'))
  const dateTo = parseIsoDate(getString('date_to'))

  return {
    instruments,
    genres,
    lat,
    lng,
    searchTerms,
    dateFrom,
    dateTo,
    radiusMiles: radius && radius > 0 ? radius : DEFAULT_RADIUS_MILES,
  }
}

function toNumber(value?: string) {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseIsoDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function sanitizeLike(value: string) {
  return value.replace(/[%_]/g, ' ').trim()
}

function buildJamsQuery(
  supabase: SupabaseClient<Database>,
  filters: ParsedFilters
) {
  let query = supabase
    .from('jams')
    .select('*, host:profiles!jams_host_id_fkey(display_name, id)')
    .order('jam_time', { ascending: true })
    .gte('jam_time', new Date().toISOString())
    .limit(200)

  if (filters.instruments.length) {
    query = query.overlaps('desired_instruments', filters.instruments)
  }

  if (filters.searchTerms.length) {
    const likeTerm = `%${sanitizeLike(filters.searchTerms.join(' '))}%`
    query = query.or(`title.ilike.${likeTerm},description.ilike.${likeTerm}`)
  }

  if (filters.dateFrom) {
    query = query.gte('jam_time', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('jam_time', filters.dateTo)
  }

  if (filters.lat != null && filters.lng != null) {
    query = query.not('lat', 'is', null).not('lng', 'is', null)
  }

  return query
}

function filterJams(jams: Jam[], filters: ParsedFilters) {
  const { lat, lng, radiusMiles } = filters
  const radiusKm = milesToKilometers(radiusMiles)

  if (lat == null || lng == null) {
    return jams
  }

  return jams
    .map((jam) => {
      if (jam.lat == null || jam.lng == null) {
        return null
      }
      const distance = haversineDistanceKm(lat, lng, jam.lat, jam.lng)
      if (distance > radiusKm) return null
      return { jam, distance }
    })
    .filter((entry): entry is { jam: Jam; distance: number } => entry !== null)
    .sort((a, b) => a.distance - b.distance)
    .map((entry) => entry.jam)
}

function determineMapCenter(filters: ParsedFilters, jams: Jam[]) {
  if (filters.lat != null && filters.lng != null) {
    return [filters.lat, filters.lng] as [number, number]
  }

  const jamWithCoords = jams.find((jam) => jam.lat != null && jam.lng != null)
  if (jamWithCoords && jamWithCoords.lat != null && jamWithCoords.lng != null) {
    return [jamWithCoords.lat, jamWithCoords.lng] as [number, number]
  }

  return DEFAULT_MAP_CENTER
}

function buildJamSearchResultEntries(jams: Jam[], filters: ParsedFilters): SearchResultEntry[] {
  const entries: Array<{
    entry: SearchResultEntry
    distance: number
    time: number
  }> = []
  const { lat, lng } = filters

  for (const jam of jams) {
    const distanceKm =
      lat != null && lng != null && jam.lat != null && jam.lng != null
        ? haversineDistanceKm(lat, lng, jam.lat, jam.lng)
        : undefined
    const distanceMiles = distanceKm != null ? kilometersToMiles(distanceKm) : undefined
    const entry: SearchResultEntry = {
      id: `jam-${jam.id}`,
      type: 'jam',
      title: jam.title,
      href: `/jams/${jam.id}`,
      metaLabel: jam.host?.display_name ? `Hosted by ${jam.host.display_name}` : undefined,
      secondaryLabel: formatJamDateTime(jam.jam_time),
      tertiaryLabel: formatLocation(jam.city, jam.country),
      distanceLabel: formatDistanceMiles(distanceMiles),
      badges: jam.desired_instruments.slice(0, 4),
    }

    entries.push({
      entry,
      distance: distanceMiles ?? Number.POSITIVE_INFINITY,
      time: jam.jam_time ? new Date(jam.jam_time).getTime() : Number.MAX_SAFE_INTEGER,
    })
  }

  entries.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance
    }
    return a.time - b.time
  })

  return entries.map((item) => item.entry).slice(0, 40)
}

function formatDistanceMiles(distanceMiles?: number) {
  if (distanceMiles == null || Number.isNaN(distanceMiles)) return undefined
  if (distanceMiles < 0.25) return '<0.3 mi'
  if (distanceMiles < 10) return `${distanceMiles.toFixed(1)} mi`
  return `${Math.round(distanceMiles)} mi`
}

function formatJamDateTime(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const datePart = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date)
  return `${datePart} • ${timePart} UTC`
}

function kilometersToMiles(kilometers: number) {
  return kilometers * KM_TO_MILES
}

function formatLocation(city?: string | null, country?: string | null) {
  const parts = [city, country].filter(
    (part): part is string => Boolean(part && part.trim().length > 0)
  )
  if (!parts.length) return undefined
  return parts.join(', ')
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function milesToKilometers(miles: number) {
  return miles * MILES_TO_KM
}
