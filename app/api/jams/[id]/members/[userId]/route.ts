import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await context.params
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is host
  const { data: jam } = await supabase
    .from('jams')
    .select('host_id')
    .eq('id', id)
    .single()

  if (!jam || jam.host_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { status } = body

  if (!['approved', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('jam_members')
    .update({ status })
    .eq('jam_id', id)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await context.params
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: membership, error: memberError } = await supabase
    .from('jam_members')
    .select('status')
    .eq('jam_id', id)
    .eq('user_id', userId)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (membership.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 400 })
  }

  const { error } = await supabase
    .from('jam_members')
    .delete()
    .eq('jam_id', id)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
