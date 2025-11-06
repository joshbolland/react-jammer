'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OutgoingRequest {
  jamId: string
  jamTitle: string
  jamTime: string | null
  jamLocation?: string | null
  status: 'pending' | 'approved' | 'declined'
  joinedAt: string
}

function statusClasses(status: OutgoingRequest['status']) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700'
    case 'declined':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
}

function formatJamTime(jamTime: string | null) {
  if (!jamTime) return null
  const date = new Date(jamTime)
  if (Number.isNaN(date.getTime())) return null
  return format(date, 'PPP p')
}

export interface OutgoingRequestsListProps {
  requests: OutgoingRequest[]
  currentUserId: string
}

export function OutgoingRequestsList({ requests, currentUserId }: OutgoingRequestsListProps) {
  const router = useRouter()
  const [cancellingJamId, setCancellingJamId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleCancel = async (jamId: string) => {
    setCancellingJamId(jamId)
    setActionError(null)
    try {
      const response = await fetch(`/api/jams/${jamId}/members/${currentUserId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Failed to cancel request')
      }
      router.refresh()
    } catch (error: any) {
      setActionError(error.message ?? 'Failed to cancel request')
    } finally {
      setCancellingJamId(null)
    }
  }

  if (!requests.length) {
    return <p className="text-sm text-gray-600">You have not sent any requests yet.</p>
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      {requests.map((request) => {
        const formattedTime = formatJamTime(request.jamTime)
        const requestedDate = new Date(request.joinedAt)
        const formattedRequestedAt = Number.isNaN(requestedDate.getTime())
          ? null
          : format(requestedDate, 'PPP p')
        return (
          <div
            key={`${request.jamId}-${request.joinedAt}`}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border rounded-lg bg-white"
          >
            <div>
              <Link
                href={`/jams/${request.jamId}`}
                className="text-base font-semibold text-gray-900 hover:text-primary-600"
              >
                {request.jamTitle}
              </Link>
              {formattedTime && (
                <p className="text-sm text-gray-600 mt-1">{formattedTime}</p>
              )}
              {request.jamLocation && (
                <p className="text-sm text-gray-500">{request.jamLocation}</p>
              )}
              {formattedRequestedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Requested {formattedRequestedAt}
                </p>
              )}
            </div>
            {request.status === 'pending' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCancel(request.jamId)}
                  disabled={cancellingJamId === request.jamId}
                  className="px-3 py-1 text-xs font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {cancellingJamId === request.jamId ? 'Cancelling…' : 'Cancel request'}
                </button>
              </div>
            ) : (
              <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded ${statusClasses(request.status)}`}>
                {request.status}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
