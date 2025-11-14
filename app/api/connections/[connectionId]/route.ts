import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

async function ensureDm(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userA: string,
  userB: string,
  sender?: string
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
    .insert({ user_a: sorted[0], user_b: sorted[1] })
    .select('id')
    .single()

  if (error || !dm) {
    throw new Error(error?.message ?? 'Failed to start DM')
  }

  if (sender) {
    await supabase.from('messages').insert({
      room_type: 'dm',
      room_id: dm.id,
      sender_id: sender,
      content: 'Start planning your next jam.',
    })
  }

  return dm.id
}

type RouteParams = Promise<{ connectionId: string }> | { connectionId: string }

export async function PATCH(
  request: NextRequest,
  context: { params: RouteParams }
) {
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { connectionId } = await Promise.resolve(context.params)
  const body = await request.json().catch(() => ({}))
  const requestedStatus = body?.status as 'connected' | 'pending' | undefined
  const nextStatus = requestedStatus ?? 'connected'

  if (!connectionId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: connection, error: fetchError } = await supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (fetchError || !connection) {
    return NextResponse.json({ error: fetchError?.message ?? 'Not found' }, { status: 404 })
  }

  if (connection.requester_id !== session.user.id && connection.receiver_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (nextStatus !== 'connected') {
    return NextResponse.json({ error: 'Unsupported status change' }, { status: 400 })
  }

  if (connection.status === 'connected') {
    return NextResponse.json({ status: 'connected', connection })
  }
  if (connection.receiver_id !== session.user.id) {
    return NextResponse.json({ error: 'Only the receiver can accept' }, { status: 403 })
  }

  const { data: updated, error } = await supabase
    .from('connections')
    .update({
      status: 'connected',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const otherUserId =
    connection.requester_id === session.user.id ? connection.receiver_id : connection.requester_id

  const dmId = await ensureDm(supabase, session.user.id, otherUserId, session.user.id).catch(
    (dmError) => {
      console.error('[connections] failed to seed dm after accept', dmError)
      return null
    }
  )

  return NextResponse.json({ status: 'connected', connection: updated, dmId })
}

export async function DELETE(
  _request: NextRequest,
  context: { params: RouteParams }
) {
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { connectionId } = await Promise.resolve(context.params)

  const { data: connection, error: fetchError } = await supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (fetchError || !connection) {
    return NextResponse.json({ error: fetchError?.message ?? 'Not found' }, { status: 404 })
  }

  if (connection.requester_id !== session.user.id && connection.receiver_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('connections').delete().eq('id', connectionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'none' })
}
