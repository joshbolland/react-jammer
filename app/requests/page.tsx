import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { IncomingRequestsList } from '@/components/IncomingRequestsList'
import { OutgoingRequestsList } from '@/components/OutgoingRequestsList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type JamPreview = {
  id: string
  title: string | null
  jam_time: string | null
  city: string | null
  country: string | null
  host_id?: string | null
}

type UserPreview = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type OutgoingRow = {
  jam_id: string | null
  status: string | null
  joined_at: string | null
  jam?: unknown
}

type IncomingRow = {
  jam_id: string | null
  user_id: string | null
  status: string | null
  joined_at: string | null
  jam?: unknown
  user?: unknown
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

function locationString(city?: string | null, country?: string | null) {
  const parts = [city, country].filter((part): part is string => Boolean(part && part.trim()))
  return parts.length ? parts.join(', ') : null
}

function toJamPreview(value: unknown): JamPreview | null {
  if (!value || typeof value !== 'object' || value === null) return null
  const jam = value as Record<string, unknown>
  const id = typeof jam.id === 'string' ? jam.id : null
  if (!id) return null
  return {
    id,
    title: typeof jam.title === 'string' ? jam.title : null,
    jam_time: typeof jam.jam_time === 'string' ? jam.jam_time : null,
    city: typeof jam.city === 'string' ? jam.city : null,
    country: typeof jam.country === 'string' ? jam.country : null,
    host_id: typeof jam.host_id === 'string' ? jam.host_id : null,
  }
}

function toUserPreview(value: unknown): UserPreview | null {
  if (!value || typeof value !== 'object' || value === null) return null
  const user = value as Record<string, unknown>
  const id = typeof user.id === 'string' ? user.id : null
  if (!id) return null
  return {
    id,
    display_name: typeof user.display_name === 'string' ? user.display_name : null,
    avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : null,
  }
}

export default async function RequestsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const [outgoingRes, incomingRes] = await Promise.all([
    supabase
      .from('jam_members')
      .select(
        'jam_id, status, joined_at, jam:jams(id, title, jam_time, city, country)'
      )
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
  ])

  const outgoingData = (outgoingRes.data ?? []) as OutgoingRow[]
  const incomingData = (incomingRes.data ?? []) as IncomingRow[]

  const outgoingRequests = outgoingData
    .map((row) => {
      if (!row?.jam_id) return null
      const jam = toJamPreview(row.jam ?? null)
      const jamTitle = jam?.title ?? 'Jam no longer available'
      const jamTime = jam?.jam_time ?? null
      const jamLocation = locationString(jam?.city, jam?.country)
      const joinedAt = row.joined_at ?? new Date().toISOString()

      return {
        jamId: jam?.id ?? row.jam_id,
        jamTitle,
        jamTime,
        jamLocation,
        status: normalizeStatus(row.status),
        joinedAt,
      }
    })
    .filter(
      (request): request is NonNullable<typeof request> =>
        request != null && Boolean(request.jamId)
    )

  const incomingRequests = incomingData
    .map((row) => {
      if (!row?.jam_id || !row?.user_id) return null
      const jam = toJamPreview(row.jam ?? null)
      const userProfile = toUserPreview(row.user ?? null)
      const jamLocation = locationString(jam?.city, jam?.country)
      const joinedAt = row.joined_at ?? new Date().toISOString()

      return {
        jamId: jam?.id ?? row.jam_id,
        jamTitle: jam?.title ?? 'Jam',
        jamTime: jam?.jam_time ?? null,
        jamLocation,
        requesterId: row.user_id,
        requesterName: userProfile?.display_name ?? null,
        requesterAvatar: userProfile?.avatar_url ?? null,
        joinedAt,
        status: normalizeStatus(row.status),
      }
    })
    .filter(
      (request): request is NonNullable<typeof request> =>
        request != null && Boolean(request.jamId) && Boolean(request.requesterId)
    )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requests</h1>
          <p className="text-gray-600 mt-2">
            Review join requests from other musicians and keep track of the jams you&apos;ve
            asked to join.
          </p>
        </div>

        <section className="card space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Incoming requests</h2>
            <p className="text-sm text-gray-500">
              Approve or decline musicians who want to join the jams you host.
            </p>
          </div>
          <IncomingRequestsList requests={incomingRequests} />
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your requests</h2>
            <p className="text-sm text-gray-500">
              Check the status of the jams you&apos;ve requested to join.
            </p>
          </div>
          <OutgoingRequestsList requests={outgoingRequests} currentUserId={user.id} />
        </section>
      </div>
    </div>
  )
}
