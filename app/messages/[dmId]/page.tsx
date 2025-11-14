import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { Chat } from '@/components/Chat'
import { ProfileCard } from '@/components/ProfileCard'
import { toProfile } from '@/lib/transformers'
import { ConnectButton } from '@/components/ConnectButton'
import type { ConnectionStatus } from '@/lib/types'

export default async function DMPage({
  params,
}: {
  params: Promise<{ dmId: string }> | { dmId: string }
}) {
  const { dmId } = await Promise.resolve(params)
  const supabase = createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  // Fetch DM and verify user is part of it
  const { data: dm, error } = await supabase
    .from('dms')
    .select(`
      *,
      user_a_profile:profiles!dms_user_a_fkey(*),
      user_b_profile:profiles!dms_user_b_fkey(*)
    `)
    .eq('id', dmId)
    .single()

  if (error || !dm) {
    notFound()
  }

  // Verify user is part of DM
  if (dm.user_a !== session.user.id && dm.user_b !== session.user.id) {
    redirect('/messages')
  }

  const otherUser = toProfile(
    dm.user_a === session.user.id ? dm.user_b_profile : dm.user_a_profile
  )
  let connectionStatus: ConnectionStatus = 'none'
  let connectionId: string | null = null

  if (otherUser) {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${session.user.id},receiver_id.eq.${otherUser.id}),and(requester_id.eq.${otherUser.id},receiver_id.eq.${session.user.id})`
      )
      .maybeSingle()

    if (connection) {
      connectionId = connection.id
      if (connection.status === 'connected') {
        connectionStatus = 'connected'
      } else if (connection.requester_id === session.user.id) {
        connectionStatus = 'pending'
      } else {
        connectionStatus = 'incoming'
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Conversation</h1>
          {otherUser && (
            <>
              <ProfileCard profile={otherUser} showFull />
              {connectionStatus !== 'connected' && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-100/80 bg-primary-50/70 px-4 py-3 text-sm text-primary-800">
                  <p>
                    You&apos;re not connected yet. Connect to see when {otherUser.display_name} hosts new jams.
                  </p>
                  <ConnectButton
                    targetUserId={otherUser.id}
                    targetDisplayName={otherUser.display_name}
                    initialStatus={connectionStatus}
                    initialConnectionId={connectionId}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <Chat roomType="dm" roomId={dmId} />
        </div>
      </div>
    </div>
  )
}
