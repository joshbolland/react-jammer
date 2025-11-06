import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { otherUserId } = body

  if (!otherUserId) {
    return NextResponse.json({ error: 'otherUserId required' }, { status: 400 })
  }

  // Ensure user_a < user_b for consistent DM IDs
  const userIds = [session.user.id, otherUserId].sort()
  const userA = userIds[0]
  const userB = userIds[1]

  // Check if DM already exists
  const { data: existing } = await supabase
    .from('dms')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .single()

  if (existing) {
    return NextResponse.json({ dmId: existing.id })
  }

  // Create new DM
  const { data: dm, error } = await supabase
    .from('dms')
    .insert({
      user_a: userA,
      user_b: userB,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dmId: dm.id })
}
