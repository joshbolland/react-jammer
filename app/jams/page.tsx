import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { JamList } from '@/components/JamList'
import Link from 'next/link'

export default async function JamsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jams</h1>
          <p className="text-gray-600">Discover and join jam sessions</p>
        </div>
        <Link href="/jams/new" className="btn-primary">
          Create Jam
        </Link>
      </div>

      <JamList />
    </div>
  )
}

