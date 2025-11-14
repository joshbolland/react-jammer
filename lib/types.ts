export const INSTRUMENTS = [
  'guitar',
  'bass',
  'drums',
  'piano',
  'keyboard',
  'vocals',
  'violin',
  'viola',
  'cello',
  'saxophone',
  'trumpet',
  'trombone',
  'flute',
  'clarinet',
  'harmonica',
  'ukulele',
  'banjo',
  'mandolin',
] as const

export const GENRES = [
  'rock',
  'jazz',
  'pop',
  'indie',
  'folk',
  'blues',
  'electronic',
  'classical',
  'country',
  'metal',
  'punk',
  'reggae',
  'hip-hop',
  'r&b',
  'soul',
] as const

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'] as const

export type Instrument = typeof INSTRUMENTS[number]
export type Genre = typeof GENRES[number]
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number]

export interface Profile {
  id: string
  display_name: string
  instruments: Instrument[]
  genres: Genre[]
  experience_level: ExperienceLevel | null
  bio: string | null
  availability: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  links: {
    spotify?: string | null
    youtube?: string | null
    instagram?: string | null
  }
  avatar_url: string | null
  last_active_at: string | null
  created_at: string
  updated_at: string
}

export interface Jam {
  id: string
  host_id: string
  title: string
  description: string | null
  jam_time: string
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  desired_instruments: Instrument[]
  max_attendees: number
  created_at: string
  updated_at: string
  host?: Profile
}

export interface JamMember {
  jam_id: string
  user_id: string
  role: 'host' | 'attendee'
  status: 'pending' | 'approved' | 'declined'
  joined_at: string
  user?: Profile
}

export interface Message {
  id: string
  room_type: 'dm' | 'jam'
  room_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export interface DM {
  id: string
  user_a: string
  user_b: string
  created_at: string
  user_a_last_read_at?: string | null
  user_b_last_read_at?: string | null
  user_a_profile?: Profile
  user_b_profile?: Profile
  last_message?: Message
  unread_count?: number
}

export type ConnectionEdgeStatus = 'pending' | 'connected'
export type ConnectionStatus = 'none' | 'pending' | 'incoming' | 'connected' | 'self'

export interface ConnectionEdge {
  id: string
  requester_id: string
  receiver_id: string
  status: ConnectionEdgeStatus
  context_jam_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  requester?: Profile | null
  receiver?: Profile | null
}

export interface SuggestedConnection {
  profile: Profile
  reason: string
}
