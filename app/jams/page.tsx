import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { JamList } from '@/components/JamList'
import { CreateJamModal } from '@/components/CreateJamModal'

type JamsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function JamsPage({ searchParams }: JamsPageProps) {
  const supabase = createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  const createParam = searchParams?.create
  const showCreateModal = Array.isArray(createParam)
    ? createParam.includes('1')
    : createParam === '1'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jams</h1>
          <p className="text-gray-600">Discover and join jam sessions</p>
        </div>
        <CreateJamModal autoOpen={showCreateModal} />
      </div>

      <JamList />
    </div>
  )
}
