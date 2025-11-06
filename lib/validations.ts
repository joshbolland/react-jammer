import { z } from 'zod'
import { INSTRUMENTS, GENRES, EXPERIENCE_LEVELS } from './types'

export const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50),
  instruments: z.array(z.enum(INSTRUMENTS as any)).min(1, 'Select at least one instrument'),
  genres: z.array(z.enum(GENRES as any)).min(1, 'Select at least one genre'),
  experience_level: z.enum(EXPERIENCE_LEVELS as any).nullable(),
  bio: z.string().max(500).nullable().optional(),
  availability: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  links: z
    .object({
      spotify: z.union([z.string().url(), z.literal('')]).optional(),
      youtube: z.union([z.string().url(), z.literal('')]).optional(),
      instagram: z.union([z.string().url(), z.literal('')]).optional(),
    })
    .partial()
    .optional()
    .default({}),
})

export const jamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(1000).nullable().optional(),
  // Accept the HTML datetime-local value (e.g. "2025-11-03T14:30") by
  // preprocessing it into a full ISO datetime string. This lets the
  // client keep using <input type="datetime-local" /> while still
  // validating against an ISO datetime for storage.
  jam_time: z.preprocess((val) => {
    if (typeof val === 'string') {
      // Some browsers provide "YYYY-MM-DDTHH:mm" (no seconds / timezone).
      // Try to coerce into an ISO string. If invalid, leave as-is so the
      // downstream zod check fails with a clear message.
      const d = new Date(val)
      if (!isNaN(d.getTime())) return d.toISOString()
    }
    return val
  }, z.string().datetime()),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  desired_instruments: z.array(z.enum(INSTRUMENTS as any)).min(1, 'Select at least one desired instrument'),
  max_attendees: z.number().int().min(1).max(50).default(10),
})

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
  room_type: z.enum(['dm', 'jam']),
  room_id: z.string().uuid(),
})
