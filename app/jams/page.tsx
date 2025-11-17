import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { toJam, toProfile } from '@/lib/transformers'
import type { Database } from '@/lib/database.types'
import type { Genre, Instrument, Jam, Profile } from '@/lib/types'
import type { JamParticipation } from '@/components/JamCard'
import {
  JamsExperience,
  type IncomingJamRequestCard,
  type OutgoingJamRequestCard,
  type SuggestedJamPreview,
  type SuggestionBlocker,
} from '@/components/JamsExperience'

type JamsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

type JamMemberRow = Database['public']['Tables']['jam_members']['Row']

type JamRowWithHost = Database['public']['Tables']['jams']['Row'] & {
  host: Database['public']['Tables']['profiles']['Row'] | null
}

type OutgoingRow = JamMemberRow & {
  jam?: {
    id: string
    title: string | null
    jam_time: string | null
    city: string | null
    country: string | null
  } | null
}

type IncomingRow = JamMemberRow & {
  jam?: {
    id: string
    title: string | null
    jam_time: string | null
    city: string | null
    country: string | null
    host_id: string
  } | null
  user?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

type PastAttendanceRow = JamMemberRow & {
  jam?: JamRowWithHost | null
}

export default async function JamsPage({ searchParams }: JamsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const nowIso = new Date().toISOString()

  const [profileRes, membershipsRes, upcomingRes, outgoingRes, incomingRes, hostedHistoryRes, attendingHistoryRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('jam_members')
        .select('jam_id, status')
        .eq('user_id', user.id)
        .in('status', ['approved', 'pending']),
      supabase
        .from('jams')
        .select('*, host:profiles!jams_host_id_fkey(*)')
        .gte('jam_time', nowIso)
        .order('jam_time', { ascending: true })
        .limit(200),
      supabase
        .from('jam_members')
        .select('jam_id, status, joined_at, jam:jams(id, title, jam_time, city, country)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false }),
      supabase
        .from('jam_members')
        .select(
          'jam_id, user_id, status, joined_at, user:profiles!jam_members_user_id_fkey(id, display_name, avatar_url), jam:jams!inner(id, title, jam_time, city, country, host_id)'
        )
        .eq('status', 'pending')
        .eq('jam.host_id', user.id)
        .order('joined_at', { ascending: false }),
      supabase
        .from('jams')
        .select('*, host:profiles!jams_host_id_fkey(*)')
        .lt('jam_time', nowIso)
        .eq('host_id', user.id)
        .order('jam_time', { ascending: false })
        .limit(60),
      supabase
        .from('jam_members')
        .select('jam:jams!inner(*, host:profiles!jams_host_id_fkey(*))')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .lt('jam.jam_time', nowIso)
        .order('jam.jam_time', { ascending: false })
        .limit(80),
    ])

  const profile = toProfile(profileRes.data) as Profile | null
  if (!profile) {
    redirect('/onboarding')
  }

  const upcomingJams = (upcomingRes.data ?? [])
    .map((entry) => toJam(entry))
    .filter((jam): jam is Jam => jam !== null)

  const membershipRows = (membershipsRes.data ?? []) as Array<Pick<JamMemberRow, 'jam_id' | 'status'>>
  const membershipMap = new Map<string, JamParticipation>(
    membershipRows.map((row) => [row.jam_id, row.status === 'approved' ? 'attending' : 'pending'])
  )

  const myJams = upcomingJams
    .filter((jam) => jam.host_id === user.id || membershipMap.has(jam.id))
    .sort((a, b) => {
      const aPriority = a.host_id === user.id ? 0 : 1
      const bPriority = b.host_id === user.id ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return new Date(a.jam_time).getTime() - new Date(b.jam_time).getTime()
    })

  const participationBadges: Record<string, JamParticipation> = {}
  for (const jam of myJams) {
    if (jam.host_id === user.id) {
      participationBadges[jam.id] = 'hosting'
    } else {
      const badge = membershipMap.get(jam.id)
      if (badge) {
        participationBadges[jam.id] = badge
      }
    }
  }

  const myJamIds = new Set(myJams.map((jam) => jam.id))
  const { suggestedJams, suggestionBlocker } = buildSuggestedJams(profile, upcomingJams, myJamIds, user.id)

  const outgoingRows = (outgoingRes.data ?? []) as OutgoingRow[]
  const outgoingRequests: OutgoingJamRequestCard[] = outgoingRows
    .map((row) => {
      const jamTitle = row.jam?.title ?? 'Jam no longer available'
      const jamTime = row.jam?.jam_time ?? null
      const jamLocation = formatLocation(row.jam?.city, row.jam?.country)
      const joinedAt = row.joined_at ?? new Date().toISOString()

      return {
        jamId: row.jam?.id ?? row.jam_id,
        jamTitle,
        jamTime,
        jamLocation,
        status: normalizeStatus(row.status),
        joinedAt,
      }
    })
    .filter((request): request is OutgoingJamRequestCard => Boolean(request.jamId))

  const incomingRows = (incomingRes.data ?? []) as IncomingRow[]
  const incomingRequests: IncomingJamRequestCard[] = incomingRows
    .filter((row): row is IncomingRow & { user_id: string } => Boolean(row.user_id))
    .map((row) => {
      const jamTitle = row.jam?.title ?? 'Jam'
      const jamTime = row.jam?.jam_time ?? null
      const jamLocation = formatLocation(row.jam?.city, row.jam?.country)
      const joinedAt = row.joined_at ?? new Date().toISOString()

      return {
        jamId: row.jam?.id ?? row.jam_id,
        jamTitle,
        jamTime,
        jamLocation,
        requesterId: row.user_id,
        requesterName: row.user?.display_name ?? 'Musician',
        requesterAvatar: row.user?.avatar_url ?? null,
        joinedAt,
        status: normalizeStatus(row.status),
      }
    })

  const hostedHistoryRows = (hostedHistoryRes.data ?? []) as JamRowWithHost[]
  const attendingHistoryRows = (attendingHistoryRes.data ?? []) as PastAttendanceRow[]
  const historyMap = new Map<string, Jam>()

  for (const row of hostedHistoryRows) {
    const jam = toJam(row)
    if (jam) {
      historyMap.set(jam.id, jam)
    }
  }
  for (const row of attendingHistoryRows) {
    if (!row.jam) continue
    const jam = toJam(row.jam)
    if (jam) {
      historyMap.set(jam.id, jam)
    }
  }

  const historyJams = Array.from(historyMap.values())
    .sort((a, b) => new Date(b.jam_time).getTime() - new Date(a.jam_time).getTime())
    .slice(0, 50)

  const createParam = resolvedSearchParams?.create
  const showCreateModal = Array.isArray(createParam) ? createParam.includes('1') : createParam === '1'

  return (
    <JamsExperience
      upcomingJams={myJams}
      suggestedJams={suggestedJams}
      participationMap={participationBadges}
      incomingRequests={incomingRequests}
      outgoingRequests={outgoingRequests}
      historyJams={historyJams}
      suggestionBlocker={suggestionBlocker}
      autoOpenCreate={showCreateModal}
      currentUserId={user.id}
    />
  )
}

function normalizeStatus(value: string | null | undefined): 'pending' | 'approved' | 'declined' {
  switch (value) {
    case 'approved':
    case 'declined':
      return value
    default:
      return 'pending'
  }
}

function formatLocation(city?: string | null, country?: string | null) {
  const parts = [city, country].filter((part): part is string => Boolean(part && part.trim()))
  return parts.length ? parts.join(', ') : null
}

function buildSuggestedJams(
  profile: Profile,
  allJams: Jam[],
  excludedJamIds: Set<string>,
  userId: string
): { suggestedJams: SuggestedJamPreview[]; suggestionBlocker: SuggestionBlocker } {
  if (profile.lat == null || profile.lng == null) {
    return { suggestedJams: [], suggestionBlocker: 'location' }
  }

  const instrumentInterests = profile.instruments ?? []
  const genreInterests = profile.genres ?? []
  const hasInstrumentInterests = instrumentInterests.length > 0
  const hasGenreInterests = genreInterests.length > 0

  if (!hasInstrumentInterests && !hasGenreInterests) {
    return { suggestedJams: [], suggestionBlocker: 'interests' }
  }

  const suggestions = allJams
    .filter((jam) => jam.host_id !== userId && !excludedJamIds.has(jam.id))
    .map((jam) => {
      if (jam.lat == null || jam.lng == null) return null
      const distanceMiles = kilometersToMiles(
        haversineDistanceKm(profile.lat as number, profile.lng as number, jam.lat, jam.lng)
      )
      const matchedInstruments = jam.desired_instruments.filter((instrument) => instrumentInterests.includes(instrument))
      const hostGenres = jam.host?.genres ?? []
      const matchedGenres = hostGenres.filter((genre) => genreInterests.includes(genre))
      const matchesInterest = matchedInstruments.length > 0 || matchedGenres.length > 0
      if (!matchesInterest || Number.isNaN(distanceMiles)) return null
      if (distanceMiles > RECOMMENDED_RADIUS_MILES) return null
      return { jam, distanceMiles, matchedInstruments, matchedGenres }
    })
    .filter((entry): entry is SuggestedJamPreview => entry !== null)
    .sort((a, b) => {
      if (a.distanceMiles !== b.distanceMiles) {
        return a.distanceMiles - b.distanceMiles
      }
      return new Date(a.jam.jam_time).getTime() - new Date(b.jam.jam_time).getTime()
    })
    .slice(0, 4)

  return { suggestedJams: suggestions, suggestionBlocker: null }
}

const RECOMMENDED_RADIUS_MILES = 25

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function kilometersToMiles(kilometers: number) {
  return kilometers * 0.621371
}
