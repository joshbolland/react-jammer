import type { Database } from './database.types'
import type { Jam, Message, Profile } from './types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type MessageRow = Database['public']['Tables']['messages']['Row'] & {
  sender?: unknown
}
type JamRow = Database['public']['Tables']['jams']['Row'] & {
  host?: unknown
}

function isSelectError(value: unknown): value is { error: true } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    (value as Record<string, unknown>).error === true
  )
}

export function toProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object' || isSelectError(value)) {
    return null
  }

  const profile = value as ProfileRow
  const rawLinks = (profile.links ?? {}) as Record<string, string | null | undefined>

  return {
    ...profile,
    instruments: (profile.instruments ?? []) as Profile['instruments'],
    genres: (profile.genres ?? []) as Profile['genres'],
    experience_level: profile.experience_level as Profile['experience_level'],
    links: {
      spotify: rawLinks.spotify ?? null,
      youtube: rawLinks.youtube ?? null,
      instagram: rawLinks.instagram ?? null,
    },
  }
}

export function toMessage(value: unknown): Message | null {
  if (!value || typeof value !== 'object' || isSelectError(value)) {
    return null
  }

  const message = value as MessageRow

  return {
    id: message.id,
    room_type: message.room_type as Message['room_type'],
    room_id: message.room_id,
    sender_id: message.sender_id,
    content: message.content,
    created_at: message.created_at,
    sender: toProfile((message as { sender?: unknown }).sender ?? null) ?? undefined,
  }
}

export function toJam(value: unknown): Jam | null {
  if (!value || typeof value !== 'object' || isSelectError(value)) {
    return null
  }

  const jam = value as JamRow

  return {
    ...jam,
    desired_instruments: (jam.desired_instruments ?? []) as Jam['desired_instruments'],
    host: toProfile((jam as { host?: unknown }).host ?? null) ?? undefined,
  }
}
