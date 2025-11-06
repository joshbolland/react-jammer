import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { JamMemberCard } from '@/components/JamMemberCard'
import { Chat } from '@/components/Chat'
import Link from 'next/link'

export default async function JamDetailPage({ params }: { params: any }) {
  // Next may pass `params` as a Promise in some environments — unwrap it first
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: jamData, error } = await supabase
    .from('jams')
    .select('*, host:profiles!jams_host_id_fkey(*)')
    .eq('id', id)
    .single()

  const jam: any = jamData

  if (error || !jam) {
    notFound()
  }

  // Check if user is a member
  const membershipRes = await supabase
    .from('jam_members')
    .select('*')
    .eq('jam_id', id)
    .eq('user_id', user.id)
    .single()
  const membership: any = membershipRes.data

  const isHost = jam.host_id === user.id
  const isMember = membership?.status === 'approved' || isHost
  const isPending = membership?.status === 'pending'

  // Fetch all members
  const { data: members } = await supabase
    .from('jam_members')
    .select('*, user:profiles!jam_members_user_id_fkey(*)')
    .eq('jam_id', id)
    .in('status', ['approved', 'pending'])

  const jamDate = new Date(jam.jam_time)
  const isPast = jamDate < new Date()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{jam.title}</h1>
              {isPast && (
                <span className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 rounded">
                  Past Event
                </span>
              )}
            </div>
            {isHost && (
              <Link href={`/jams/${id}/edit`} className="btn-secondary text-sm">
                Edit
              </Link>
            )}
          </div>

          {jam.description && (
            <p className="text-gray-700 mb-4">{jam.description}</p>
          )}

          <div className="space-y-2 text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium">{format(jamDate, 'PPP p')}</span>
            </div>

            {(jam.city || jam.country) && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>
                  {jam.city}
                  {jam.city && jam.country && ', '}
                  {jam.country}
                </span>
              </div>
            )}

            {jam.desired_instruments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {jam.desired_instruments.map((instrument: string) => (
                  <span
                    key={instrument}
                    className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-700 rounded"
                  >
                    {instrument}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Host:</span>{' '}
                <Link
                  href={`/profile/${jam.host_id}`}
                  className="text-primary-600 hover:text-primary-700"
                >
                  {jam.host?.display_name || 'Unknown'}
                </Link>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Max attendees: {jam.max_attendees}
              </p>
            </div>
          </div>

          {!isHost && !isMember && !isPending && !isPast && (
            <div className="mt-6 pt-6 border-t">
              <form action={`/api/jams/${id}/join`} method="post">
                <button type="submit" className="btn-primary">
                  Request to Join
                </button>
              </form>
            </div>
          )}

          {isPending && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600">Your request is pending approval</p>
            </div>
          )}
        </div>

        {members && members.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Members ({members.length})</h2>
            <div className="space-y-3">
              {members.map((member: any) => (
                <JamMemberCard
                  key={member.user_id}
                  member={member}
                  jamId={id}
                  isHost={isHost}
                />
              ))}
            </div>
          </div>
        )}

        {isMember && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Jam Chat</h2>
            <Chat roomType="jam" roomId={id} />
          </div>
        )}
      </div>
    </div>
  )
}

