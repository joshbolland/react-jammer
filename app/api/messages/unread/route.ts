import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createSupabaseRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ total: 0 })
  }

  const { data: dms, error } = await supabase
    .from('dms')
    .select('id, user_a, user_b, user_a_last_read_at, user_b_last_read_at')
    .or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`)

  if (error) {
    console.error('Error loading DMs for unread count:', error)
    return NextResponse.json({ total: 0 }, { status: 500 })
  }

  let totalUnread = 0

  if (dms) {
    const counts = await Promise.all(
      dms.map(async (dm) => {
        const lastReadAt =
          dm.user_a === session.user.id ? dm.user_a_last_read_at : dm.user_b_last_read_at

        let unreadQuery = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_type', 'dm')
          .eq('room_id', dm.id)
          .neq('sender_id', session.user.id)

        if (lastReadAt) {
          unreadQuery = unreadQuery.gt('created_at', lastReadAt)
        }

        const { count, error: unreadError } = await unreadQuery

        if (unreadError) {
          console.error(`Error calculating unread count for DM ${dm.id}:`, unreadError)
          return 0
        }

        return count ?? 0
      })
    )

    totalUnread = counts.reduce((sum, count) => sum + count, 0)
  }

  return NextResponse.json({ total: totalUnread })
}
