'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { JamForm } from '@/components/JamForm'
import { createSupabaseClient } from '@/lib/supabase-client'

export default function EditJamPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [jam, setJam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    // params may be a promise-like object on the client in Next's app router.
    // Resolve it inside the effect instead of accessing `params.id` synchronously.
    const run = async () => {
      const resolved = await params

      if (!authLoading && !user) {
        router.push('/auth')
        return
      }

      if (user) {
        // inline fetch logic so we don't reference `params.id` synchronously
        try {
          const { data, error } = await supabase
            .from('jams')
            .select('*')
            .eq('id', resolved.id)
            .single()

          if (error) throw error

          const jamData = data as any

          // Verify user is host
          if (jamData.host_id !== user!.id) {
            router.push(`/jams/${resolved.id}`)
            return
          }

          setJam(jamData)
        } catch (err) {
          console.error('Error fetching jam:', err)
          router.push('/jams')
        } finally {
          setLoading(false)
        }
      }
    }

    run()
    // keep params (the wrapper) in deps but don't access params.id synchronously
  }, [user, authLoading, router, params, supabase])



  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Jam</h1>
          <p className="text-gray-600">Update your jam session details</p>
        </div>

        <div className="card">
          <JamForm jam={jam} onSuccess={(jamId) => router.push(`/jams/${jamId}`)} />
        </div>
      </div>
    </div>
  )
}

