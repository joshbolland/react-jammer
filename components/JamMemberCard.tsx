'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface JamMemberCardProps {
  member: any
  jamId: string
  isHost: boolean
}

export function JamMemberCard({ member, jamId, isHost }: JamMemberCardProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStatusUpdate = async (status: 'approved' | 'declined') => {
    if (!isHost) return

    setLoading(true)
    try {
      const response = await fetch(`/api/jams/${jamId}/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating member status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {member.user?.avatar_url ? (
          <Image
            src={member.user.avatar_url}
            alt={member.user.display_name}
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-400">
            {member.user?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div>
          <Link
            href={`/profile/${member.user_id}`}
            className="font-medium text-gray-900 hover:text-primary-600"
          >
            {member.user?.display_name || 'Unknown'}
          </Link>
          <p className="text-xs text-gray-500">
            {member.role === 'host' ? 'Host' : 'Member'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {member.status === 'pending' && isHost ? (
          <>
            <button
              onClick={() => handleStatusUpdate('approved')}
              disabled={loading}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusUpdate('declined')}
              disabled={loading}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
            >
              Decline
            </button>
          </>
        ) : (
          <span
            className={`px-3 py-1 text-xs font-medium rounded ${
              member.status === 'approved'
                ? 'bg-green-100 text-green-700'
                : member.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {member.status}
          </span>
        )}
      </div>
    </div>
  )
}
