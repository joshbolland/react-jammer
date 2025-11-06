import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import Image from 'next/image'
import type { DM, Message, Profile } from '@/lib/types'
import { toMessage, toProfile } from '@/lib/transformers'

type DMListItem = DM & {
  otherUser: Profile | null
  lastMessage: Message | null
  unreadCount: number
}

export default async function MessagesPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  // Fetch user's DMs
  const { data: dms } = await supabase
    .from('dms')
    .select(`
      *,
      user_a_profile:profiles!dms_user_a_fkey(*),
      user_b_profile:profiles!dms_user_b_fkey(*)
    `)
    .or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`)
    .order('created_at', { ascending: false })

  // Fetch last message and unread count for each DM
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>

        {dmsWithMessages.length === 0 ? (
          <div className="card">
            <p className="text-gray-600 text-center py-8">No messages yet</p>
          </div>
        ) : (
          <div className="card p-0">
            <div className="divide-y">
              {dmsWithMessages.map((dm) => (
                <Link
                  key={dm.id}
                  href={`/messages/${dm.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {dm.otherUser?.avatar_url ? (
                      <Image
                        src={dm.otherUser.avatar_url}
                        alt={dm.otherUser.display_name}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-400">
                        {dm.otherUser?.display_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3
                            className={`font-semibold truncate ${
                              dm.unreadCount > 0 ? 'text-primary-600' : 'text-gray-900'
                            }`}
                          >
                            {dm.otherUser?.display_name || 'Unknown'}
                          </h3>
                          {dm.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {dm.unreadCount}
                            </span>
                          )}
                        </div>
                        {dm.lastMessage && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {format(new Date(dm.lastMessage.created_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                      {dm.lastMessage ? (
                        <p
                          className={`text-sm truncate ${
                            dm.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}
                        >
                          {dm.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 truncate">No messages yet</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
