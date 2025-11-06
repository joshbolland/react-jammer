import { createSupabaseServerClient } from '@/lib/supabase-server'
import { JamCard } from './JamCard'
import type { Jam } from '@/lib/types'
import { toJam } from '@/lib/transformers'

interface JamListProps {
  limit?: number
  hostId?: string
  jams?: Jam[]
}

export async function JamList({ limit, hostId, jams: preloadedJams }: JamListProps = {}) {
  let jams = preloadedJams

  if (!jams) {
    const supabase = createSupabaseServerClient()
    let query = supabase
      .from('jams')
      .select('*, host:profiles!jams_host_id_fkey(*)')
      .order('jam_time', { ascending: true })

    if (hostId) {
      query = query.eq('host_id', hostId)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data } = await query
    jams = (data ?? [])
      .map((entry) => toJam(entry))
      .filter((jam): jam is Jam => jam !== null)
  }

  jams = jams ?? []

  const displayJams = limit ? jams.slice(0, limit) : jams

  if (displayJams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/70 px-6 py-10 text-center shadow-inner">
        <p className="text-base font-medium text-slate-600">
          No upcoming jams match these filters. Spark one and invite the crowd.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {displayJams.map((jam) => (
        <JamCard key={jam.id} jam={jam} />
      ))}
    </div>
  )
}
