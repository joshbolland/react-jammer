import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ProfileCard } from '@/components/ProfileCard'
import { JamOverviewCard } from '@/components/JamsExperience'
import { StartDMButton } from '@/components/StartDMButton'
import { ConnectButton } from '@/components/ConnectButton'
import { toJam, toProfile } from '@/lib/transformers'
import type { ConnectionStatus, Jam } from '@/lib/types'

export default async function ProfilePage({ params }: { params: any }) {
  // Unwrap possibly-promised params (Next may pass params as a Promise)
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()
  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  const profile = toProfile(profileData)

  if (error || !profile) {
    notFound()
  }

  // Fetch user's jams
  const { data: jamsData } = await supabase
    .from('jams')
    .select('*, host:profiles!jams_host_id_fkey(*)')
    .eq('host_id', id)
    .order('jam_time', { ascending: true })

  const hostedJams = (jamsData ?? [])
    .map((jam) => toJam(jam))
    .filter((jam): jam is Jam => jam !== null)

  let initialConnectionStatus: ConnectionStatus = viewer?.id === profile.id ? 'self' : 'none'
  let initialConnectionId: string | null = null

  if (viewer && viewer.id !== profile.id) {
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${viewer.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${viewer.id})`
      )
      .maybeSingle()

    if (connection) {
      initialConnectionId = connection.id
      if (connection.status === 'connected') {
        initialConnectionStatus = 'connected'
      } else if (connection.requester_id === viewer.id) {
        initialConnectionStatus = 'pending'
      } else {
        initialConnectionStatus = 'incoming'
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <ProfileCard profile={profile} showFull />
          {viewer?.id !== profile.id ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StartDMButton otherUserId={profile.id} />
              <ConnectButton
                targetUserId={profile.id}
                targetDisplayName={profile.display_name}
                initialStatus={initialConnectionStatus}
                initialConnectionId={initialConnectionId}
              />
            </div>
          ) : null}
        </div>
        {hostedJams.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Hosted Jams</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {hostedJams.map((jam) => (
                <JamOverviewCard
                  key={jam.id}
                  jam={jam}
                  participation={viewer?.id === profile.id ? 'hosting' : 'open'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
