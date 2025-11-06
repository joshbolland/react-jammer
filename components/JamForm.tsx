'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jamSchema } from '@/lib/validations'
import { INSTRUMENTS } from '@/lib/types'
import { useState, useRef } from 'react'
// Simple address autocomplete using OpenStreetMap Nominatim API
function useAddressAutocomplete() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const search = (q: string) => {
    setQuery(q)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!q || q.length < 3) {
      setResults([])
      return
    }
    setLoading(true)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`)
        const data = await res.json()
        setResults(data)
      } catch (e) {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  return { query, setQuery: search, results, loading }
}
import { createSupabaseClient } from '@/lib/supabase-client'

interface JamFormProps {
  jam?: any
  onSuccess?: (jamId: string) => void
}

export function JamForm({ jam, onSuccess }: JamFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  // Address autocomplete state
  const { query: addressQuery, setQuery: setAddressQuery, results: addressResults, loading: addressLoading } = useAddressAutocomplete()
  const [addressSelected, setAddressSelected] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(jamSchema),
    defaultValues: jam
      ? {
        title: jam.title,
        description: jam.description || '',
        jam_time: jam.jam_time ? new Date(jam.jam_time).toISOString().slice(0, 16) : '',
        city: jam.city || '',
        country: jam.country || '',
        lat: jam.lat,
        lng: jam.lng,
        address: jam.city && jam.country ? `${jam.city}, ${jam.country}` : '',
        desired_instruments: jam.desired_instruments || [],
        max_attendees: jam.max_attendees || 10,
      }
      : {
        address: '',
        desired_instruments: [],
        max_attendees: 10,
      },
  })

  const selectedInstruments = watch('desired_instruments') || []
  const addressValue = watch('address')

  const toggleInstrument = (instrument: string) => {
    const current = selectedInstruments
    const updated = current.includes(instrument)
      ? current.filter((i: string) => i !== instrument)
      : [...current, instrument]
    setValue('desired_instruments', updated)
  }

  const onSubmit = async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      const jamData = {
        host_id: user.id,
        title: data.title,
        description: data.description || null,
        jam_time: new Date(data.jam_time).toISOString(),
        city: data.city || null,
        country: data.country || null,
        lat: data.lat || null,
        lng: data.lng || null,
        desired_instruments: data.desired_instruments,
        max_attendees: data.max_attendees,
        // address is not stored in DB, just used for lookup
      }

      let result: any = null
      if (jam) {
        const { data: updated, error } = await supabase
          .from('jams')
          .update(jamData as unknown as never)
          .eq('id', jam.id)
          .select()
          .single()

        if (error) throw error
        result = updated
      } else {
        const { data: created, error } = await supabase
          .from('jams')
          .insert(jamData as unknown as never)
          .select()
          .single()

        if (error) throw error
        result = created
      }

      if (onSuccess && result) {
        onSuccess(result.id)
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save jam')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Address autocomplete input */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Location *
        </label>
        <input
          id="address"
          type="text"
          autoComplete="off"
          className="input-field"
          placeholder="Start typing an address, city, or place..."
          {...register('address', { required: true })}
          value={addressValue}
          onChange={e => {
            setAddressSelected(false)
            setValue('address', e.target.value)
            setAddressQuery(e.target.value)
          }}
        />
        {addressLoading && <div className="text-xs text-gray-500 mt-1">Searching...</div>}
        {!addressSelected && addressResults.length > 0 && (
          <ul className="border rounded bg-white shadow mt-1 max-h-48 overflow-auto z-10 relative">
            {addressResults.map((result, idx) => (
              <li
                key={result.place_id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                onClick={() => {
                  setValue('address', result.display_name)
                  setAddressSelected(true)
                  // Try to extract city/country/lat/lng from result
                  setValue('city', result.address?.city || result.address?.town || result.address?.village || result.address?.hamlet || '')
                  setValue('country', result.address?.country || '')
                  setValue('lat', parseFloat(result.lat))
                  setValue('lng', parseFloat(result.lon))
                  setAddressQuery('')
                }}
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        )}
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">Location is required</p>
        )}
      </div>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          id="title"
          {...register('title')}
          className="input-field"
          placeholder="e.g., Casual Jazz Jam Session"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          className="input-field"
          placeholder="Tell musicians what to expect..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="jam_time" className="block text-sm font-medium text-gray-700 mb-1">
          Date & Time *
        </label>
        <input
          id="jam_time"
          type="datetime-local"
          {...register('jam_time')}
          className="input-field"
        />
        {errors.jam_time && (
          <p className="mt-1 text-sm text-red-600">{errors.jam_time.message as string}</p>
        )}
      </div>

      {/* Hidden city/country/lat/lng fields (populated by address picker) */}
      <input type="hidden" {...register('city')} />
      <input type="hidden" {...register('country')} />
      <input type="hidden" {...register('lat', { valueAsNumber: true })} />
      <input type="hidden" {...register('lng', { valueAsNumber: true })} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Desired Instruments * (Select at least one)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {INSTRUMENTS.map((instrument) => (
            <label
              key={instrument}
              className={`flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${selectedInstruments.includes(instrument)
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300'
                }`}
            >
              <input
                type="checkbox"
                checked={selectedInstruments.includes(instrument)}
                onChange={() => toggleInstrument(instrument)}
                className="mr-2"
              />
              <span className="text-sm capitalize">{instrument}</span>
            </label>
          ))}
        </div>
        {errors.desired_instruments && (
          <p className="mt-1 text-sm text-red-600">
            {errors.desired_instruments.message as string}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="max_attendees" className="block text-sm font-medium text-gray-700 mb-1">
          Max Attendees
        </label>
        <input
          id="max_attendees"
          type="number"
          {...register('max_attendees', { valueAsNumber: true })}
          min="1"
          max="50"
          className="input-field"
        />
        {errors.max_attendees && (
          <p className="mt-1 text-sm text-red-600">{errors.max_attendees.message as string}</p>
        )}
      </div>

      <button type="submit" disabled={loading} className="w-full btn-primary">
        {loading ? 'Saving...' : jam ? 'Update Jam' : 'Create Jam'}
      </button>
    </form>
  )
}

