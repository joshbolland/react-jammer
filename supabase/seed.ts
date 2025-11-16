import crypto from 'crypto'
import { createClient, type User } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../lib/database.types'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const BASE_PASSWORD = process.env.SEED_USER_PASSWORD || 'SeedPass123!'
const supabase = createClient(supabaseUrl, supabaseKey)

type ProfilesInsert = Database['public']['Tables']['profiles']['Insert']
type JamInsert = Database['public']['Tables']['jams']['Insert']
type JamMemberInsert = Database['public']['Tables']['jam_members']['Insert']

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional'

interface City {
  name: string
  country: string
  lat: number
  lng: number
}

const CITY_GROUPS: Record<
  'northAmerica' | 'europe' | 'asiaPacific' | 'latinAmerica' | 'australiaNz',
  City[]
> = {
  northAmerica: [
    { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006 },
    { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
    { name: 'Austin', country: 'USA', lat: 30.2672, lng: -97.7431 },
    { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
    { name: 'Seattle', country: 'USA', lat: 47.6062, lng: -122.3321 },
    { name: 'Nashville', country: 'USA', lat: 36.1627, lng: -86.7816 },
  ],
  europe: [
    { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
    { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
    { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
    { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
    { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  ],
  asiaPacific: [
    { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
    { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
    { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
    { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  ],
  latinAmerica: [
    { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
    { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
    { name: 'São Paulo', country: 'Brazil', lat: -23.5558, lng: -46.6396 },
    { name: 'Bogotá', country: 'Colombia', lat: 4.711, lng: -74.0721 },
  ],
  australiaNz: [
    { name: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth', country: 'Australia', lat: -31.9505, lng: 115.8605 },
    { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },
  ],
}

const UK_CITIES: City[] = [
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'UK', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', country: 'UK', lat: 52.4862, lng: -1.8904 },
  { name: 'Bristol', country: 'UK', lat: 51.4545, lng: -2.5879 },
  { name: 'Glasgow', country: 'UK', lat: 55.8642, lng: -4.2518 },
]

// Temporarily restrict seeding to UK cities; set to null to restore global distribution.
const LOCATION_OVERRIDE: City[] | null = UK_CITIES

type LocationGroup = keyof typeof CITY_GROUPS

const FIRST_NAMES = [
  'Alex',
  'Taylor',
  'Jordan',
  'Casey',
  'Riley',
  'Morgan',
  'Reese',
  'Elliot',
  'Quinn',
  'Harper',
  'Rowan',
  'Sawyer',
  'Parker',
  'Skyler',
  'Avery',
  'Dakota',
  'Peyton',
  'Sage',
  'Nico',
  'Lennon',
  'Sasha',
  'Kai',
  'Indigo',
  'Phoenix',
  'Emerson',
  'Marlow',
  'River',
  'Shiloh',
  'Jules',
  'Briar',
] as const

const LAST_NAMES = [
  'Hudson',
  'Brooks',
  'Parker',
  'Ellis',
  'Monroe',
  'Bailey',
  'Reed',
  'Spencer',
  'Gray',
  'Reese',
  'Collins',
  'Dawson',
  'Wilder',
  'Hayes',
  'Hendrix',
  'Rivers',
  'Knight',
  'Archer',
  'Lane',
  'Sutton',
  'Fox',
  'Blake',
  'Rowe',
  'Vale',
  'Frost',
  'Hart',
  'Banks',
  'Miles',
  'West',
  'Stone',
] as const

interface Archetype {
  slug: string
  persona: string
  count: number
  instrumentPool: string[]
  genrePool: string[]
  experiencePool: ExperienceLevel[]
  availabilityOptions: string[]
  bioTemplates: string[]
  locationGroup: LocationGroup
  hostRatio: number
  linkFocus?: Array<'spotify' | 'youtube' | 'instagram'>
  jamGenreTags: string[]
}

const USER_ARCHETYPES: Archetype[] = [
  {
    slug: 'weekend-guitarists',
    persona: 'weekend guitarist',
    count: 10,
    instrumentPool: ['guitar', 'vocals', 'bass'],
    genrePool: ['rock', 'blues', 'indie', 'folk'],
    experiencePool: ['intermediate', 'advanced'],
    availabilityOptions: ['Friday nights', 'Saturday afternoons', 'Sunday evenings'],
    bioTemplates: [
      'Weekend {persona} steeped in {genres_list}. Down for {availability} meetups around town.',
      'Rhythm-first guitarist who lives for {genres_list}. Always chasing new setlists on {availability}.',
      'Songwriter with a love for {genres_list}. Let’s build a groove for {availability}.',
    ],
    locationGroup: 'northAmerica',
    hostRatio: 0.5,
    linkFocus: ['spotify', 'instagram'],
    jamGenreTags: ['rock', 'blues', 'indie'],
  },
  {
    slug: 'improv-jazz',
    persona: 'jazz improviser',
    count: 8,
    instrumentPool: ['piano', 'saxophone', 'trumpet', 'bass', 'drums'],
    genrePool: ['jazz', 'blues'],
    experiencePool: ['advanced', 'professional'],
    availabilityOptions: ['weeknight sessions', 'late-night hangs', 'Sunday brunch'],
    bioTemplates: [
      'Modern {persona} inspired by {genres_list}. Always ready for charts or open improv on {availability}.',
      'Gigging player mixing {genres_list}. Seeking collaborators for {availability} sessions.',
      'Conservatory-trained {persona} looking to stretch out on {genres_list} tunes during {availability}.',
    ],
    locationGroup: 'europe',
    hostRatio: 0.625,
    linkFocus: ['youtube', 'instagram'],
    jamGenreTags: ['jazz'],
  },
  {
    slug: 'electronic-producers',
    persona: 'electronic producer',
    count: 6,
    instrumentPool: ['keyboard', 'piano', 'vocals'],
    genrePool: ['electronic', 'pop', 'indie'],
    experiencePool: ['intermediate', 'advanced'],
    availabilityOptions: ['late nights', 'midweek evenings', 'studio weekends'],
    bioTemplates: [
      'Bedroom {persona} blending {genres_list}. Looking for topliners and live players for {availability}.',
      'Synth-heavy {persona} chasing new textures in {genres_list}. Open studio during {availability}.',
      'Producer focused on {genres_list}; let’s co-write or remix during {availability}.',
    ],
    locationGroup: 'asiaPacific',
    hostRatio: 0.5,
    linkFocus: ['spotify', 'youtube'],
    jamGenreTags: ['electronic', 'pop'],
  },
  {
    slug: 'folk-storytellers',
    persona: 'folk storyteller',
    count: 7,
    instrumentPool: ['guitar', 'banjo', 'mandolin', 'violin', 'vocals'],
    genrePool: ['folk', 'indie', 'country'],
    experiencePool: ['beginner', 'intermediate', 'advanced'],
    availabilityOptions: ['Sunday mornings', 'weekend markets', 'campfire evenings'],
    bioTemplates: [
      'Acoustic {persona} crafting {genres_list} tunes. Love swapping harmonies on {availability}.',
      'Story-first {persona} weaving {genres_list}. Keen on intimate circles during {availability}.',
      'Roots-inspired {persona} chasing organic sounds. Free on {availability} for collabs.',
    ],
    locationGroup: 'latinAmerica',
    hostRatio: 0.43,
    linkFocus: ['instagram'],
    jamGenreTags: ['folk', 'country'],
  },
  {
    slug: 'percussion-groove',
    persona: 'percussion groove architect',
    count: 6,
    instrumentPool: ['drums', 'percussion', 'bass'],
    genrePool: ['funk', 'soul', 'jazz', 'rock'],
    experiencePool: ['intermediate', 'advanced', 'professional'],
    availabilityOptions: ['weeknight rehearsals', 'late-night grooves', 'festival prep'],
    bioTemplates: [
      'Pocket-obsessed {persona} working through {genres_list}. Looking for tight rhythm sections on {availability}.',
      'Groove-first drummer blending {genres_list}. Hit me up for {availability} sessions.',
      'Session-ready {persona} who loves {genres_list}. Available {availability}.',
    ],
    locationGroup: 'northAmerica',
    hostRatio: 0.5,
    linkFocus: ['youtube', 'instagram'],
    jamGenreTags: ['funk', 'soul', 'rock'],
  },
  {
    slug: 'vocal-collective',
    persona: 'vocal arranger',
    count: 6,
    instrumentPool: ['vocals', 'piano', 'guitar'],
    genrePool: ['pop', 'r&b', 'soul'],
    experiencePool: ['beginner', 'intermediate', 'advanced'],
    availabilityOptions: ['weekday evenings', 'Sunday brunch', 'studio Saturdays'],
    bioTemplates: [
      'Harmony-loving {persona} into {genres_list}. Let’s stack vocals on {availability}.',
      'Lead/backup vocalist shaping {genres_list}. Open to co-writing during {availability}.',
      'Arranger focusing on {genres_list}. Building a collective for {availability} sessions.',
    ],
    locationGroup: 'australiaNz',
    hostRatio: 0.5,
    linkFocus: ['spotify', 'instagram'],
    jamGenreTags: ['pop', 'r&b', 'soul'],
  },
] as const

interface JamTheme {
  slug: string
  title: string
  description: string
  genreHints: string[]
  desiredInstrumentOptions: string[][]
  maxAttendeesRange: [number, number]
}

const JAM_THEMES: JamTheme[] = [
  {
    slug: 'blues-groove-night',
    title: '{city} Blues & Groove Night',
    description: 'Host {display_name} is building a relaxed {genres_list} set. Bring charts or improv ideas for {availability}.',
    genreHints: ['blues', 'rock', 'soul'],
    desiredInstrumentOptions: [
      ['bass', 'drums'],
      ['harmonica', 'piano'],
      ['saxophone', 'trumpet'],
    ],
    maxAttendeesRange: [6, 9],
  },
  {
    slug: 'jazz-improv-lab',
    title: '{city} Jazz Improv Lab',
    description: '{display_name} is hosting a {genres_list} exploration. Expect real books, modal jams, and dynamic interplay.',
    genreHints: ['jazz'],
    desiredInstrumentOptions: [
      ['bass', 'drums'],
      ['piano', 'saxophone'],
      ['trumpet', 'vocals'],
    ],
    maxAttendeesRange: [5, 8],
  },
  {
    slug: 'electronic-collab-club',
    title: '{city} Electronic Collab Club',
    description: 'Producer {display_name} wants to co-create {genres_list} ideas. Bring synths, controllers, or topline concepts.',
    genreHints: ['electronic', 'pop'],
    desiredInstrumentOptions: [
      ['vocals', 'keyboard'],
      ['guitar', 'bass'],
      ['drums', 'percussion'],
    ],
    maxAttendeesRange: [4, 7],
  },
  {
    slug: 'acoustic-circle',
    title: '{city} Acoustic Song Circle',
    description: '{display_name} is curating a cozy {genres_list} circle. Expect storytelling, harmonies, and relaxed {availability} hangs.',
    genreHints: ['folk', 'country', 'indie'],
    desiredInstrumentOptions: [
      ['banjo', 'mandolin'],
      ['violin', 'vocals'],
      ['guitar', 'bass'],
    ],
    maxAttendeesRange: [6, 10],
  },
  {
    slug: 'soul-session',
    title: '{city} Soul Session & Vocal Lab',
    description: 'Join {display_name} for layered {genres_list}. Warm ups, harmonies, and arrangement experiments on {availability}.',
    genreHints: ['soul', 'r&b', 'pop'],
    desiredInstrumentOptions: [
      ['vocals', 'keyboard'],
      ['bass', 'drums'],
      ['guitar', 'percussion'],
    ],
    maxAttendeesRange: [6, 9],
  },
] as const

interface GeneratedUser {
  user: User
  email: string
  displayName: string
  persona: string
  instruments: string[]
  genres: string[]
  availability: string
  experience: ExperienceLevel
  location: City
  isHost: boolean
  slug: string
}

function randomElement<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomElements<T>(array: readonly T[], count: number): T[] {
  const copy = [...array] as T[]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.max(0, Math.min(copy.length, count)))
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''
  const rest = values.slice(0, -1).join(', ')
  return `${rest} & ${values[values.length - 1]}`
}

function fillTemplate(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => replacements[key] ?? '')
}

function jitterCoordinate(value: number, variance = 0.2): number {
  return value + (Math.random() - 0.5) * variance
}

function createStableUUID(seedValue: string): string {
  const hash = crypto.createHash('sha1').update(seedValue).digest()
  const bytes = hash.subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function buildExistingUserCache(): Promise<Map<string, User>> {
  const cache = new Map<string, User>()
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }
    if (!data?.users?.length) break

    for (const user of data.users) {
      if (user.email) {
        cache.set(user.email.toLowerCase(), user)
      }
    }

    if (data.users.length < perPage) break
    page += 1
  }

  return cache
}

async function ensureAuthUser(
  email: string,
  metadata: Record<string, unknown>,
  password: string,
  cache: Map<string, User>,
) {
  const emailKey = email.toLowerCase()
  const cachedUser = cache.get(emailKey)

  if (cachedUser) {
    const updated = await supabase.auth.admin.updateUserById(cachedUser.id, {
      user_metadata: { ...(cachedUser.user_metadata ?? {}), ...metadata },
    })

    if (updated.error) {
      throw updated.error
    }

    const user = updated.data?.user ?? cachedUser
    cache.set(emailKey, user)
    return { user, created: false }
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (created.error || !created.data?.user) {
    throw created.error ?? new Error(`Failed to create auth user for ${email}`)
  }

  cache.set(emailKey, created.data.user)
  return { user: created.data.user, created: true }
}

async function seed() {
  console.log('🌱 Starting extended seed for Jammer')
  console.log(`   Using ${USER_ARCHETYPES.length} archetypes across ${Object.keys(CITY_GROUPS).length} regions\n`)

  const profiles: ProfilesInsert[] = []
  const generatedUsers: GeneratedUser[] = []
  const userCache = await buildExistingUserCache()

  let globalIndex = 0
  let totalNewAuthUsers = 0
  let totalExistingAuthUsers = 0

  for (const archetype of USER_ARCHETYPES) {
    if (archetype.count <= 0) continue

    const hostTargets =
      archetype.hostRatio > 0
        ? Math.min(
            archetype.count,
            Math.max(1, Math.round(archetype.count * archetype.hostRatio)),
          )
        : 0

    const hostIndexes = new Set<number>()
    while (hostIndexes.size < hostTargets) {
      hostIndexes.add(Math.floor(Math.random() * archetype.count))
    }

    for (let i = 0; i < archetype.count; i++) {
      const isHost = hostIndexes.has(i)
      const first = FIRST_NAMES[globalIndex % FIRST_NAMES.length]
      const last = LAST_NAMES[Math.floor(globalIndex / FIRST_NAMES.length) % LAST_NAMES.length]
      const baseName = `${first} ${last}`
      const displayName = isHost ? `${baseName} ${randomElement(['Collective', 'Project', 'Quartet', 'Band'])}` : baseName
      const slug = slugify(displayName) || slugify(baseName)
      const email = `seed-${String(globalIndex + 1).padStart(2, '0')}-${archetype.slug}@jammer.test`

      const instrumentCount = Math.max(1, Math.floor(Math.random() * Math.min(3, archetype.instrumentPool.length)) + 1)
      const instruments = randomElements(archetype.instrumentPool, instrumentCount)
      const genreCount = Math.max(1, Math.floor(Math.random() * Math.min(4, archetype.genrePool.length)) + 1)
      const genres = randomElements(archetype.genrePool, genreCount)
      const experience = randomElement(archetype.experiencePool)
      const availability = randomElement(archetype.availabilityOptions)
      const locationPool = LOCATION_OVERRIDE ?? CITY_GROUPS[archetype.locationGroup]
      const location = randomElement(locationPool)

      const bio = fillTemplate(randomElement(archetype.bioTemplates), {
        persona: archetype.persona,
        genres_list: formatList(genres),
        availability,
      })

      const links = {
        spotify:
          archetype.linkFocus?.includes('spotify') && Math.random() < 0.6
            ? `https://open.spotify.com/artist/${slug}`
            : null,
        youtube:
          archetype.linkFocus?.includes('youtube') && Math.random() < 0.5
            ? `https://www.youtube.com/@${slug}`
            : null,
        instagram:
          archetype.linkFocus?.includes('instagram') && Math.random() < 0.75
            ? `https://www.instagram.com/${slug}`
            : null,
      }

      const includeAvatar = Math.random() < 0.85
      const avatarUrl = includeAvatar
        ? `https://i.pravatar.cc/240?u=${encodeURIComponent(slug || email)}`
        : null

      const metadata = {
        display_name: displayName,
        persona: archetype.persona,
        archetype: archetype.slug,
        instruments,
        genres,
        availability,
        location: `${location.name}, ${location.country}`,
      }

      const { user, created } = await ensureAuthUser(email, metadata, BASE_PASSWORD, userCache)
      created ? totalNewAuthUsers++ : totalExistingAuthUsers++

      const profileRecord: ProfilesInsert = {
        id: user.id,
        display_name: displayName,
        instruments,
        genres,
        experience_level: experience,
        bio,
        availability,
        city: location.name,
        country: location.country,
        lat: Number(jitterCoordinate(location.lat, 0.15).toFixed(6)),
        lng: Number(jitterCoordinate(location.lng, 0.15).toFixed(6)),
        links: {
          spotify: links.spotify,
          youtube: links.youtube,
          instagram: links.instagram,
        },
        avatar_url: avatarUrl,
        last_active_at: new Date(
          Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000),
        ).toISOString(),
      }

      profiles.push(profileRecord)
      generatedUsers.push({
        user,
        email,
        displayName,
        persona: archetype.persona,
        instruments,
        genres,
        availability,
        experience,
        location,
        isHost,
        slug,
      })

      globalIndex++
    }
  }

  if (!profiles.length) {
    console.log('⚠️ No profiles generated; check archetype configuration.')
    return
  }

  const { error: profileError } = await supabase.from('profiles').upsert(profiles, { onConflict: 'id' })
  if (profileError) {
    console.error('Error upserting profiles:', profileError)
    throw profileError
  }

  console.log(
    `✅ Upserted ${profiles.length} profiles (${totalNewAuthUsers} new auth users, ${totalExistingAuthUsers} reused)\n`,
  )

  const hostUsers = generatedUsers.filter((entry) => entry.isHost)
  if (!hostUsers.length) {
    console.log('⚠️ No host-capable users generated; skipping jam creation.')
    console.log('✨ Seed complete!')
    return
  }

  const jams: JamInsert[] = []
  const jamMembers: JamMemberInsert[] = []

  for (const host of hostUsers) {
    const themeCandidates = JAM_THEMES.filter((theme) =>
      theme.genreHints.some((hint) => host.genres.includes(hint)),
    )
    const theme = themeCandidates.length ? randomElement(themeCandidates) : randomElement(JAM_THEMES)
    const desiredList = randomElement(theme.desiredInstrumentOptions)

    const replacements = {
      display_name: host.displayName,
      city: host.location.name,
      genres_list: formatList(host.genres),
      availability: host.availability.toLowerCase(),
      needed_instruments: formatList(desiredList),
    }

    const jamId = createStableUUID(`${host.user.id}:${theme.slug}`)
    const jamDate = new Date()
    jamDate.setDate(jamDate.getDate() + Math.floor(Math.random() * 18) + 2)
    jamDate.setHours(18 + Math.floor(Math.random() * 4), Math.random() < 0.5 ? 0 : 30, 0, 0)

    const maxRange = theme.maxAttendeesRange
    const maxAttendees =
      maxRange[0] + Math.floor(Math.random() * Math.max(1, maxRange[1] - maxRange[0] + 1))

    const jamRecord: JamInsert = {
      id: jamId,
      host_id: host.user.id,
      title: fillTemplate(theme.title, replacements),
      description: fillTemplate(theme.description, replacements),
      jam_time: jamDate.toISOString(),
      city: host.location.name,
      country: host.location.country,
      lat: Number(jitterCoordinate(host.location.lat, 0.05).toFixed(6)),
      lng: Number(jitterCoordinate(host.location.lng, 0.05).toFixed(6)),
      desired_instruments: desiredList,
      max_attendees: maxAttendees,
    }

    jams.push(jamRecord)

    const attendeeOptions = generatedUsers.filter((entry) => entry.user.id !== host.user.id)
    const attendeeCount = Math.min(attendeeOptions.length, Math.floor(Math.random() * 4) + 3)
    const attendees = randomElements(attendeeOptions, attendeeCount)

    for (const attendee of attendees) {
      jamMembers.push({
        jam_id: jamId,
        user_id: attendee.user.id,
        role: 'attendee',
        status: Math.random() < 0.75 ? 'approved' : 'pending',
      })
    }
  }

  const { error: jamsError } = await supabase.from('jams').upsert(jams, { onConflict: 'id' })
  if (jamsError) {
    console.error('Error creating jams:', jamsError)
    throw jamsError
  }

  if (jamMembers.length) {
    const { error: membersError } = await supabase
      .from('jam_members')
      .upsert(jamMembers, { onConflict: 'jam_id,user_id' })
    if (membersError) {
      console.error('Error creating jam members:', membersError)
      throw membersError
    }
  }

  console.log(`🎶 Upserted ${jams.length} jams with ${jamMembers.length} member records`)
  console.log('✨ Seed complete!\n')
  console.log(
    'Tip: run `npm run seed` anytime you need a fresh set of demo users. Provide SEED_USER_PASSWORD to customise passwords.',
  )
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exitCode = 1
})
