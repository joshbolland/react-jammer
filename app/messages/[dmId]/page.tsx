import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { Chat } from '@/components/Chat'
import { ProfileCard } from '@/components/ProfileCard'
import { toProfile } from '@/lib/transformers'

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Conversation</h1>
          {otherUser && <ProfileCard profile={otherUser} showFull />}
        </div>

        <div className="card">
          <Chat roomType="dm" roomId={dmId} />
        </div>
      </div>
    </div>
  )
}
