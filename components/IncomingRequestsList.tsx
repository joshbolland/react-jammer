'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface IncomingRequest {
  jamId: string
  jamTitle: string
  jamTime: string | null
  jamLocation?: string | null
  requesterId: string
  requesterName?: string | null
  requesterAvatar?: string | null
  joinedAt: string
  status: 'pending' | 'approved' | 'declined'
}

export interface IncomingRequestsListProps {
  requests: IncomingRequest[]
}

function statusClasses(status: IncomingRequest['status']) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700'
    case 'declined':
      return 'bg-gray-200 text-gray-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return format(date, 'PPP p')
}

export function IncomingRequestsList({ requests }: IncomingRequestsListProps) {
  const router = useRouter()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleAction = async (
    jamId: string,
    requesterId: string,
    status: 'approved' | 'declined'
  ) => {
    const key = `${jamId}:${requesterId}`
    setProcessingId(key)
    setActionError(null)

    try {
      const response = await fetch(`/api/jams/${jamId}/members/${requesterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Failed to update request')
      }

      router.refresh()
    } catch (error: any) {
      setActionError(error.message ?? 'Something went wrong updating the request.')
    } finally {
      setProcessingId(null)
    }
  }

  if (!requests.length) {
    return <p className="text-sm text-gray-600">No incoming requests right now.</p>
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      {requests.map((request) => {
        const formattedJamTime = request.jamTime ? formatDate(request.jamTime) : null
        const requestedAt = formatDate(request.joinedAt)
        const key = `${request.jamId}:${request.requesterId}`
        const isProcessing = processingId === key

        return (
          <div
            key={key}
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 border rounded-lg bg-white"
          >
            <div className="flex items-start gap-3">
              {request.requesterAvatar ? (
                <Image
                  src={request.requesterAvatar}
                  alt={request.requesterName ?? 'Requester avatar'}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-500">
                  {request.requesterName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}
              <div>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                  <Link
                    href={`/profile/${request.requesterId}`}
                    className="font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {request.requesterName ?? 'Unknown musician'}
                  </Link>
                  <span className="text-xs text-gray-500">
                    requested to join{' '}
                    <Link
                      href={`/jams/${request.jamId}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {request.jamTitle}
                    </Link>
                  </span>
                </div>
                {formattedJamTime && (
                  <p className="text-sm text-gray-600 mt-1">{formattedJamTime}</p>
                )}
                {request.jamLocation && (
                  <p className="text-sm text-gray-500">{request.jamLocation}</p>
                )}
                {requestedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Requested {requestedAt}
                  </p>
                )}
              </div>
            </div>

            {request.status === 'pending' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(request.jamId, request.requesterId, 'approved')}
                  disabled={isProcessing}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(request.jamId, request.requesterId, 'declined')}
                  disabled={isProcessing}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Decline
                </button>
              </div>
            ) : (
              <span
                className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded ${statusClasses(request.status)}`}
              >
                {request.status}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
