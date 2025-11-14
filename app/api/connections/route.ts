import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

function deriveStatus(edge: { status: string; requester_id: string; receiver_id: string } | null, userId: string) {
  if (!edge) return 'none'
  if (edge.status === 'connected') return 'connected'
  return edge.requester_id === userId ? 'pending' : 'incoming'
}

async function fetchEdgeBetween(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userA: string,
  userB: string
) {
  return supabase
    .from('connections')
    .select('*')
    .or(
      `and(requester_id.eq.${userA},receiver_id.eq.${userB}),and(requester_id.eq.${userB},receiver_id.eq.${userA})`
    )
    .maybeSingle()
}

async function ensureDm(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userA: string,
  userB: string,
  welcomeMessage?: { sender: string; content: string }
) {
  const sorted = [userA, userB].sort()
  const { data: existing } = await supabase
    .from('dms')
    .select('id')
    .eq('user_a', sorted[0])
    .eq('user_b', sorted[1])
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  const { data: dm, error } = await supabase
    .from('dms')
    .insert({
      user_a: sorted[0],
      user_b: sorted[1],
    })
    .select('id')
    .single()

  if (error || !dm) {
    throw new Error(error?.message ?? 'Failed to start DM')
  }

  if (welcomeMessage) {
    await supabase.from('messages').insert({
      room_type: 'dm',
      room_id: dm.id,
      sender_id: welcomeMessage.sender,
      content: welcomeMessage.content,
    })
  }

  return dm.id
}

export async function GET(request: NextRequest) {
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const targetUserId = searchParams.get('targetUserId')

  if (targetUserId) {
    if (targetUserId === session.user.id) {
      return NextResponse.json({ status: 'self', connection: null })
    }

    const { data: edge, error } = await fetchEdgeBetween(supabase, session.user.id, targetUserId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: deriveStatus(edge, session.user.id),
      connection: edge ?? null,
    })
  }

  const scope = searchParams.get('status') ?? 'connected'
  let query = supabase
    .from('connections')
    .select('*')
    .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)

  if (scope === 'connected') {
    query = query.eq('status', 'connected')
  } else if (scope === 'pending') {
    query = query.eq('status', 'pending').eq('requester_id', session.user.id)
  } else if (scope === 'incoming') {
    query = query.eq('status', 'pending').eq('receiver_id', session.user.id)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ connections: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const targetUserId = body?.targetUserId as string | undefined
  const contextJamId = body?.contextJamId as string | null | undefined

  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })
  }

  const { data: existing, error: fetchError } = await fetchEdgeBetween(
    supabase,
    session.user.id,
    targetUserId
  )

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (existing) {
    if (existing.status === 'pending' && existing.requester_id === targetUserId) {
      const { data: updated, error } = await supabase
        .from('connections')
        .update({
          status: 'connected',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const dmId = await ensureDm(supabase, session.user.id, targetUserId, {
        sender: session.user.id,
        content: 'Start planning your next jam.',
      }).catch((dmError) => {
        console.error('[connections] Failed to start DM', dmError)
        return null
      })

      return NextResponse.json({
        status: 'connected',
        connection: updated,
        dmId,
      })
    }

    return NextResponse.json({
      status: deriveStatus(existing, session.user.id),
      connection: existing,
    })
  }

  const { data, error } = await supabase
    .from('connections')
    .insert({
      requester_id: session.user.id,
      receiver_id: targetUserId,
      status: 'pending',
      context_jam_id: contextJamId ?? null,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    status: 'pending',
    connection: data,
  })
}
