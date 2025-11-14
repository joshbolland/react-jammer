import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { toProfile } from '@/lib/transformers'
import type { Profile } from '@/lib/types'
import type { Database } from '@/lib/database.types'
import {
  ConnectionsView,
  type NetworkEntry,
  type RequestEntry,
  type SuggestedEntry,
} from '@/components/ConnectionsView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ConnectionRow = Database['public']['Tables']['connections']['Row']

export default async function ConnectionsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const viewerProfile = toProfile(profileRow)

  if (!viewerProfile) {
    redirect('/onboarding')
  }

  const [
    { data: connectedRows, error: connectedError },
    { data: incomingRows, error: incomingError },
    { data: outgoingRows, error: outgoingError },
  ] = await Promise.all([
    supabase
      .from('connections')
      .select('*')
      .eq('status', 'connected')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('resolved_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false }),
    supabase
      .from('connections')
      .select('*')
      .eq('status', 'pending')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('connections')
      .select('*')
      .eq('status', 'pending')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (connectedError || incomingError || outgoingError) {
    console.error('[ConnectionsPage] fetch error', {
      connectedError,
      incomingError,
      outgoingError,
    })
  }

  const connected = (connectedRows ?? []) as ConnectionRow[]
  const incoming = (incomingRows ?? []) as ConnectionRow[]
  const outgoing = (outgoingRows ?? []) as ConnectionRow[]

  const relatedProfileIds = new Set<string>()
  for (const entry of connected) {
    relatedProfileIds.add(entry.requester_id === user.id ? entry.receiver_id : entry.requester_id)
  }
  for (const entry of incoming) {
    relatedProfileIds.add(entry.requester_id)
  }
  for (const entry of outgoing) {
    relatedProfileIds.add(entry.receiver_id)
  }

  const profileMap = new Map<string, Profile>()
  if (relatedProfileIds.size > 0) {
    const { data: relatedProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(relatedProfileIds))

    relatedProfiles
      ?.map((row) => toProfile(row))
      .filter((profile): profile is Profile => profile !== null)
      .forEach((profile) => profileMap.set(profile.id, profile))
  }

  const network: NetworkEntry[] = connected.map((edge) => {
    const otherId = edge.requester_id === user.id ? edge.receiver_id : edge.requester_id
    const otherProfile = profileMap.get(otherId)
    return {
      connectionId: edge.id,
      profile: ensureProfile(otherProfile, otherId),
      connectedAt: edge.resolved_at ?? edge.updated_at ?? edge.created_at,
    }
  })

  const incomingRequests: RequestEntry[] = incoming.map((edge) => {
    const otherProfile = profileMap.get(edge.requester_id)
    return {
      connectionId: edge.id,
      profile: ensureProfile(otherProfile, edge.requester_id),
      requestedAt: edge.created_at,
      status: 'incoming',
    }
  })

  const outgoingRequests: RequestEntry[] = outgoing.map((edge) => {
    const otherProfile = profileMap.get(edge.receiver_id)
    return {
      connectionId: edge.id,
      profile: ensureProfile(otherProfile, edge.receiver_id),
      requestedAt: edge.created_at,
      status: 'pending',
    }
  })

  const suggested = await buildSuggestedConnections(supabase, viewerProfile, network, user.id)

  return (
    <ConnectionsView
      network={network}
      incomingRequests={incomingRequests}
      outgoingRequests={outgoingRequests}
      suggested={suggested}
    />
  )
}

function ensureProfile(profile: Profile | null | undefined, fallbackId: string): Profile {
  if (profile) return profile
  const now = new Date(0).toISOString()
  return {
    id: fallbackId,
    display_name: 'Musician',
    instruments: [],
    genres: [],
    experience_level: null,
    bio: null,
    availability: null,
    city: null,
    country: null,
    lat: null,
    lng: null,
    links: {},
    avatar_url: null,
    last_active_at: null,
    created_at: now,
    updated_at: now,
  }
}

async function buildSuggestedConnections(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  viewer: Profile,
  network: NetworkEntry[],
  viewerId: string
): Promise<SuggestedEntry[]> {
  const excludeIds = new Set<string>([viewerId, ...network.map((entry) => entry.profile.id)])
  const candidateRows: unknown[] = []

  if (viewer.instruments?.length) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', viewerId)
      .overlaps('instruments', viewer.instruments)
      .limit(40)
    if (data) candidateRows.push(...data)
  }

  if (candidateRows.length < 12 && viewer.genres?.length) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', viewerId)
      .overlaps('genres', viewer.genres)
      .limit(40)
    if (data) candidateRows.push(...data)
  }

  if (candidateRows.length < 12) {
    let fallbackQuery = supabase
      .from('profiles')
      .select('*')
      .neq('id', viewerId)
      .order('updated_at', { ascending: false })
      .limit(40)
    const locationFilters: string[] = []
    if (viewer.city) locationFilters.push(`city.eq.${viewer.city}`)
    if (viewer.country) locationFilters.push(`country.eq.${viewer.country}`)
    if (locationFilters.length) {
      fallbackQuery = fallbackQuery.or(locationFilters.join(','))
    }
    const { data } = await fallbackQuery
    if (data) candidateRows.push(...data)
  }

  const seen = new Set<string>()
  const suggestions: SuggestedEntry[] = []

  for (const row of candidateRows) {
    const profile = toProfile(row)
    if (!profile) continue
    if (excludeIds.has(profile.id) || seen.has(profile.id)) continue
    seen.add(profile.id)
    suggestions.push({
      profile,
      reason: buildSuggestionReason(profile, viewer),
    })
    if (suggestions.length >= 8) {
      break
    }
  }

  return suggestions
}

function buildSuggestionReason(profile: Profile, viewer: Profile) {
  const formatInstrumentLabel = (value: string) =>
    value
      .replace(/_/g, ' ')
      .split(' ')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')

  const sharedInstrument = profile.instruments?.find((instrument) =>
    viewer.instruments?.includes(instrument)
  )
  const sharedGenre = profile.genres?.find((genre) => viewer.genres?.includes(genre))
  const sameCity = viewer.city && profile.city && viewer.city === profile.city
  const sameCountry = viewer.country && profile.country && viewer.country === profile.country

  if (sharedInstrument && sameCity) {
    return `You both play ${formatInstrumentLabel(sharedInstrument)} in ${viewer.city}.`
  }
  if (sharedInstrument && sameCountry) {
    return `You both play ${formatInstrumentLabel(sharedInstrument)} across ${viewer.country}.`
  }
  if (sharedGenre && sameCity) {
    return `Shared love for ${sharedGenre} in ${viewer.city}. Say hello and line up a jam.`
  }
  if (sharedInstrument) {
    return `You both play ${formatInstrumentLabel(sharedInstrument)}, so connect to stay in sync.`
  }
  if (sharedGenre) {
    return `You both like ${sharedGenre}. Reach out and see if you click.`
  }
  return `Musician nearby who complements your style.`
}
