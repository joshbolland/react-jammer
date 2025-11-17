import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import type { DM, Message, Profile } from '@/lib/types'
import { toMessage, toProfile } from '@/lib/transformers'
import { MessagesExperience } from '@/components/MessagesExperience'

type DMListItem = DM & {
  otherUser: Profile | null
  lastMessage: Message | null
  unreadCount: number
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ dm?: string }> | { dm?: string }
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const requestedDmId =
    typeof resolvedSearchParams?.dm === 'string' ? resolvedSearchParams.dm : null

  const supabase = createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  const { data: dms } = await supabase
    .from('dms')
    .select(`
      *,
      user_a_profile:profiles!dms_user_a_fkey(*),
      user_b_profile:profiles!dms_user_b_fkey(*)
    `)
    .or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`)
    .order('created_at', { ascending: false })

  const dmsWithMessages: DMListItem[] = dms
    ? await Promise.all(
        dms.map(async (dm) => {
          const userAProfile = toProfile(dm.user_a_profile) ?? undefined
          const userBProfile = toProfile(dm.user_b_profile) ?? undefined

          const baseDm: DM = {
            id: dm.id,
            user_a: dm.user_a,
            user_b: dm.user_b,
            created_at: dm.created_at,
            user_a_profile: userAProfile,
            user_b_profile: userBProfile,
            user_a_last_read_at: dm.user_a_last_read_at ?? null,
            user_b_last_read_at: dm.user_b_last_read_at ?? null,
          }

          const otherUser =
            (baseDm.user_a === session.user.id ? baseDm.user_b_profile : baseDm.user_a_profile) ??
            null

          const lastReadAt =
            baseDm.user_a === session.user.id
              ? baseDm.user_a_last_read_at
              : baseDm.user_b_last_read_at

          const lastMessagePromise = supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(*)')
            .eq('room_type', 'dm')
            .eq('room_id', dm.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          let unreadQuery = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_type', 'dm')
            .eq('room_id', dm.id)
            .neq('sender_id', session.user.id)

          if (lastReadAt) {
            unreadQuery = unreadQuery.gt('created_at', lastReadAt)
          }

          const [lastMsgResult, unreadResult] = await Promise.all([lastMessagePromise, unreadQuery])

          const lastMessage = toMessage(lastMsgResult.data) ?? null
          const unreadCount = unreadResult.count ?? 0

          return {
            ...baseDm,
            otherUser,
            lastMessage,
            unreadCount,
          }
        })
      )
    : []

  dmsWithMessages.sort((a, b) => {
    const aDate = a.lastMessage?.created_at ?? a.created_at
    const bDate = b.lastMessage?.created_at ?? b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  const initialSelectedId =
    (requestedDmId && dmsWithMessages.some((dm) => dm.id === requestedDmId) && requestedDmId) ||
    dmsWithMessages[0]?.id ||
    null

  return (
    <MessagesExperience
      dms={dmsWithMessages}
      initialSelectedId={initialSelectedId}
      currentUserId={session.user.id}
    />
  )
}
