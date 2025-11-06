import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ProfileCard } from './ProfileCard'
import type { Profile } from '@/lib/types'

interface ProfileListProps {
  profiles?: Profile[]
}

export async function ProfileList({ profiles: preloadedProfiles }: ProfileListProps = {}) {
  let profiles = preloadedProfiles

  if (!profiles) {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('last_active_at', { ascending: false, nullsFirst: false })
      .limit(10)

    profiles = (data ?? []) as Profile[]
  }

  profiles = profiles ?? []

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/70 px-6 py-10 text-center shadow-inner">
        <p className="text-base font-medium text-slate-600">
          No musicians match your filters yet. Try widening the radius or instruments.
        </p>
      </div>
    )
  }

  const limitedProfiles = profiles.slice(0, 6)

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {limitedProfiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  )
}
