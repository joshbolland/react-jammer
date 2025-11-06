'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { ProfileForm } from '@/components/ProfileForm'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth')
      } else {
        // Check if profile exists
        const checkProfile = async () => {
          try {
            const response = await fetch('/api/profile/check')
            const data = await response.json()
            if (data.exists) {
              router.push('/')
            } else {
              setChecking(false)
            }
          } catch {
            setChecking(false)
          }
        }
        checkProfile()
      }
    }
  }, [user, loading, router])

  if (loading || checking) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Tell us about yourself so other musicians can find you
          </p>
        </div>

        <div className="card">
          <ProfileForm onSuccess={() => router.push('/')} />
        </div>
      </div>
    </div>
  )
}

