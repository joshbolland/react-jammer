import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { JamMemberCard } from '@/components/JamMemberCard'
import { Chat } from '@/components/Chat'
import Link from 'next/link'
import Image from 'next/image'
import { EditJamModal } from '@/components/EditJamModal'
import { getInstrumentIcon } from '@/components/InstrumentIcon'
import type { Jam } from '@/lib/types'

type JamDetailPageProps = {
  params: any
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function JamDetailPage({ params, searchParams }: JamDetailPageProps) {
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

  const jam = jamData as Jam

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
  const { data: memberRows } = await supabase
    .from('jam_members')
    .select('*, user:profiles!jam_members_user_id_fkey(*)')
    .eq('jam_id', id)
    .in('status', ['approved', 'pending'])
  const members = memberRows ?? []

  const jamDate = new Date(jam.jam_time)
  const isPast = jamDate < new Date()
  const locationLine = [jam.city, jam.country].filter(Boolean).join(', ')
  const hostName = jam.host?.display_name ?? 'Unknown host'
  const hostAvatar = jam.host?.avatar_url
  const hostInitial = hostName.charAt(0).toUpperCase()
  const hostGenres = jam.host?.genres ?? []
  const confirmedMembers = members.filter((member) => member.status === 'approved')
  const confirmedCount = confirmedMembers.length
  const pendingCount = members.filter((member) => member.status === 'pending').length
  const instruments = jam.desired_instruments ?? []
  const spotsOpen = Math.max(jam.max_attendees - confirmedCount, 0)
  const capacityCopy =
    spotsOpen > 0 ? `${spotsOpen} spot${spotsOpen === 1 ? '' : 's'} open` : 'Full house'
  const statusCopy = isPast
    ? 'Wrapped'
    : isHost
    ? 'You are hosting'
    : isMember
    ? 'You are confirmed'
    : isPending
    ? 'Awaiting approval'
    : 'Not joined yet'
  const participantProfiles = [
    { id: jam.host_id, name: hostName, avatar: hostAvatar },
    ...confirmedMembers.map((member) => ({
      id: member.user_id,
      name: member.user?.display_name ?? 'Unknown',
      avatar: member.user?.avatar_url ?? null,
    })),
  ].filter(
    (profile, index, arr) => arr.findIndex((candidate) => candidate.id === profile.id) === index
  )
  const participantDisplay = participantProfiles.slice(0, 6)
  const extraParticipants = Math.max(participantProfiles.length - participantDisplay.length, 0)

  const editParam = searchParams?.edit
  const showEditModal = Array.isArray(editParam) ? editParam.includes('1') : editParam === '1'

  if (showEditModal && !isHost) {
    redirect(`/jams/${id}`)
  }

  const formatInstrumentLabel = (instrument: string) =>
    instrument
      .replace(/_/g, ' ')
      .split(' ')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')

  const membershipBadge = isHost
    ? "You're hosting"
    : isMember
    ? "You're in"
    : isPending
    ? 'Request pending'
    : isPast
    ? 'Event ended'
    : 'Not joined yet'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-10 px-4 pt-24 pb-10 sm:px-6">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-gradient-to-br from-[#f3edff]/90 via-white/95 to-[#eef6ff]/95 p-8 shadow-[0_60px_150px_-70px_rgba(97,76,200,0.5)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 via-transparent to-transparent" />
            <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-primary-200/40 blur-[140px]" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-100/80 blur-[160px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)] motion-safe:animate-pulse" />
          </div>
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
                  <span>{format(jamDate, 'EEE • MMM d')}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{format(jamDate, 'h:mm a')}</span>
                  {isPast && (
                    <span className="rounded-full bg-slate-900/10 px-3 py-1 text-[10px] text-slate-700">
                      Past Event
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[2.75rem] font-semibold leading-[1.05] text-slate-900 sm:text-[3.25rem]">
                      {jam.title}
                    </h1>
                    {jam.description && (
                      <p className="mt-3 text-base leading-relaxed tracking-[0.08em] text-slate-500">
                        {jam.description}
                      </p>
                    )}
                  </div>
                  {isHost && (
                    <div className="shrink-0">
                      <EditJamModal jam={jam} autoOpen={showEditModal} />
                    </div>
                  )}
                </div>
                {hostGenres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hostGenres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full bg-gradient-to-r from-indigo-100/70 to-slate-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-3 text-right">
                <Link
                  href={`/profile/${jam.host_id}`}
                  className="group inline-flex items-center gap-3 self-end rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 text-left text-slate-700 shadow-[0_18px_40px_-25px_rgba(24,39,75,0.45)] transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700"
                >
                  {hostAvatar ? (
                    <Image
                      src={hostAvatar}
                      alt={hostName}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-white"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700 ring-2 ring-white">
                      {hostInitial}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Host
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {hostName}
                    </p>
                    <span className="mt-1 inline-flex items-center text-xs font-medium text-primary-600 opacity-0 transition group-hover:opacity-100">
                      View profile
                      <svg
                        className="ml-1 h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </div>
            </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                When
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {format(jamDate, 'PPP')}
              </p>
              <p className="text-sm text-slate-500">
                {format(jamDate, 'p')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Where
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {locationLine || 'To be announced'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Capacity
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {confirmedCount}/{jam.max_attendees}
              </p>
              <p className="text-sm text-slate-500">
                {capacityCopy}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Your status
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {membershipBadge}
              </p>
              <p className="text-sm text-slate-500">
                {statusCopy}
              </p>
            </div>
          </div>

          {instruments.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Recruiting
              </p>
              <div className="flex flex-wrap gap-3">
                {instruments.map((instrument) => (
                  <span
                    key={instrument}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-medium capitalize text-slate-700 shadow-[0_12px_28px_-20px_rgba(24,39,75,0.4)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_20px_40px_-24px_rgba(99,102,241,0.4)]"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center text-primary-600">
                      {getInstrumentIcon(instrument, { className: 'h-5 w-5' })}
                    </span>
                    {formatInstrumentLabel(instrument)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {participantDisplay.length > 0 && (
        <section className="rounded-[32px] border border-white/80 bg-white/90 px-6 py-5 shadow-[0_25px_70px_-55px_rgba(24,39,75,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Participants
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {participantProfiles.length} {participantProfiles.length === 1 ? 'musician' : 'musicians'} on the bill
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {participantDisplay.map((participant) =>
                participant.avatar ? (
                  <Image
                    key={participant.id}
                    src={participant.avatar}
                    alt={participant.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-[0_12px_30px_-20px_rgba(24,39,75,0.4)]"
                    unoptimized
                  />
                ) : (
                  <div
                    key={participant.id}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-sm font-semibold text-slate-500 shadow-[0_12px_30px_-20px_rgba(24,39,75,0.4)]"
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                )
              )}
              {extraParticipants > 0 && (
                <span className="rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white">
                  +{extraParticipants}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {!isHost && (
        <section className="rounded-[28px] border border-dashed border-primary-200/70 bg-white/80 p-6 shadow-[0_25px_60px_-40px_rgba(112,66,255,0.3)]">
          {!isMember && !isPending && !isPast && (
            <div className="flex flex-col gap-4 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">Ready to jump in?</p>
                <p className="text-sm text-slate-500">
                  Send a request and the host will get a notification right away.
                </p>
              </div>
              <form action={`/api/jams/${id}/join`} method="post" className="sm:flex-shrink-0">
                <button type="submit" className="btn-primary">
                  Request to Join
                </button>
              </form>
            </div>
          )}

          {isPending && (
            <div className="flex flex-col gap-2 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">Request sent</p>
                <p className="text-sm text-slate-500">
                  {hostName} has your request and will approve or decline soon.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                Pending review
              </span>
            </div>
          )}

          {!isMember && isPast && (
            <p className="text-sm text-slate-500">
              This jam has wrapped, but keep an eye on the feed for the next one.
            </p>
          )}
        </section>
      )}

      {members.length > 0 && (
        <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_-60px_rgba(24,39,75,0.35)]">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Roll call
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Members ({members.length})
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {confirmedCount} confirmed • {pendingCount} pending
            </p>
          </div>
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
        </section>
      )}

      {isMember && (
        <section className="rounded-[32px] border border-white/80 bg-white/95 p-6 shadow-[0_25px_80px_-60px_rgba(24,39,75,0.35)]">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Backstage
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">Jam Chat</h2>
          </div>
          <Chat roomType="jam" roomId={id} />
        </section>
      )}
      </div>
    </div>
  )
}
