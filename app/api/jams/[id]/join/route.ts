import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if jam exists
  const { data: jam } = await supabase
    .from('jams')
    .select('*')
    .eq('id', id)
    .single()

  if (!jam) {
    return NextResponse.json({ error: 'Jam not found' }, { status: 404 })
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('jam_members')
    .select('*')
    .eq('jam_id', id)
    .eq('user_id', session.user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 })
  }

  // Create join request
  const insertPayload: Database['public']['Tables']['jam_members']['Insert'] = {
    jam_id: id,
    user_id: session.user.id,
    role: 'attendee',
    status: 'pending',
  }

  const { error } = await supabase.from('jam_members').insert(insertPayload)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
