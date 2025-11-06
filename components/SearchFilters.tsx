'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { MultiSelect } from './MultiSelect'
import { GENRES, INSTRUMENTS } from '@/lib/types'

const DEFAULT_RADIUS_OPTIONS = [5, 10, 25, 50]
const DEFAULT_RADIUS_MILES = 25

interface SearchFiltersProps {
  variant?: 'hero' | 'sidebar'
  fallbackLocation?: {
    lat: number
    lng: number
    label?: string
  }
}

interface AddressResult {
  id: string
  name: string
  displayName: string
  lat: number
  lon: number
  locality?: string | null
  country?: string | null
}

export function SearchFilters({ variant = 'hero', fallbackLocation }: SearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()

  const selectedInstruments = useMemo(
    () => readArrayParam(searchParamsString, 'instrument'),
    [searchParamsString]
  )
  const selectedGenres = useMemo(
    () => readArrayParam(searchParamsString, 'genre'),
    [searchParamsString]
  )
  const selectedRadius = useMemo(() => {
    const params = new URLSearchParams(searchParamsString)
    const raw = params.get('radius')
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RADIUS_MILES
  }, [searchParamsString])
  const latLng = useMemo(() => {
    const params = new URLSearchParams(searchParamsString)
    const lat = params.get('lat')
    const lng = params.get('lng')
    if (!lat || !lng) return null
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null
    return { lat: latNum, lng: lngNum }
  }, [searchParamsString])
  const locationLabel = useMemo(() => {
    const params = new URLSearchParams(searchParamsString)
    return params.get('location') ?? ''
  }, [searchParamsString])

  const [locationInput, setLocationInput] = useState(locationLabel)
  const [locationFocused, setLocationFocused] = useState(false)
  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false)

  const debouncedLocation = useDebouncedValue(locationInput, 250)

  const {
    results: locationResults,
    loading: locationLoading,
    search: searchAddresses,
    clear: clearAddressResults,
  } = useAddressAutocomplete()

  const locationContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (latLng || autoLocationAttempted) return
    setAutoLocationAttempted(true)

    const applyLocationParams = (lat: number, lng: number, label?: string) => {
      const params = new URLSearchParams(searchParamsString)
      const resolvedLabel = label?.trim() ?? ''
      const updates: Record<string, string | string[] | null> = {
        lat: String(lat),
        lng: String(lng),
        location: resolvedLabel.length > 0 ? resolvedLabel : null,
      }
      if (!params.get('radius')) {
        updates.radius = String(DEFAULT_RADIUS_MILES)
      }
      setLocationInput(resolvedLabel)
      updateParams(router, pathname, searchParamsString, updates)
    }

    const applyFallback = () => {
      if (!fallbackLocation) return
      const fallbackLabel =
        fallbackLocation.label && fallbackLocation.label.trim().length > 0
          ? fallbackLocation.label
          : 'Profile location'
      applyLocationParams(fallbackLocation.lat, fallbackLocation.lng, fallbackLabel)
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      applyFallback()
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyLocationParams(
            position.coords.latitude,
            position.coords.longitude,
            ''
          )
        },
        () => {
          applyFallback()
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      )
    } catch (error) {
      applyFallback()
    }
  }, [
    autoLocationAttempted,
    fallbackLocation,
    latLng,
    pathname,
    router,
    searchParamsString,
  ])

  const instrumentOptions = useMemo(
    () =>
      INSTRUMENTS.map((instrument) => ({
        value: instrument,
        label: formatFilterLabel(instrument),
      })),
    []
  )
  const genreOptions = useMemo(
    () =>
      GENRES.map((genre) => ({
        value: genre,
        label: formatFilterLabel(genre),
      })),
    []
  )

  useEffect(() => {
    setLocationInput(locationLabel)
  }, [locationLabel])

  useEffect(() => {
    if (!locationFocused) return
    const trimmed = debouncedLocation.trim()
    if (!trimmed || trimmed.length < 3) {
      clearAddressResults()
      return
    }
    searchAddresses(trimmed)
  }, [debouncedLocation, clearAddressResults, locationFocused, searchAddresses])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationContainerRef.current &&
        !locationContainerRef.current.contains(event.target as Node)
      ) {
        setLocationFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInstrumentChange = useCallback(
    (values: string[]) => {
      updateParams(router, pathname, searchParamsString, {
        instrument: values,
      })
    },
    [pathname, router, searchParamsString]
  )

  const handleGenreChange = useCallback(
    (values: string[]) => {
      updateParams(router, pathname, searchParamsString, {
        genre: values,
      })
    },
    [pathname, router, searchParamsString]
  )

  const handleRadiusChange = useCallback(
    (value: number) => {
      updateParams(router, pathname, searchParamsString, {
        radius: String(value),
      })
    },
    [pathname, router, searchParamsString]
  )

  const handleSelectLocation = useCallback(
    (result: AddressResult) => {
      setLocationInput(result.displayName ?? result.name)
      updateParams(router, pathname, searchParamsString, {
        lat: String(result.lat),
        lng: String(result.lon),
        location: result.displayName ?? result.name ?? result.id,
      })
      setLocationFocused(false)
      clearAddressResults()
    },
    [clearAddressResults, pathname, router, searchParamsString]
  )

  const handleClearLocation = useCallback(() => {
    setLocationInput('')
    updateParams(router, pathname, searchParamsString, {
      lat: null,
      lng: null,
      location: null,
    })
    clearAddressResults()
  }, [clearAddressResults, pathname, router, searchParamsString])

  const handleClearAll = useCallback(() => {
    router.replace(pathname, { scroll: false })
    setLocationInput('')
    clearAddressResults()
  }, [clearAddressResults, pathname, router])

  const showLocationSuggestions =
    locationFocused &&
    locationInput.trim().length >= 3 &&
    (locationResults.length > 0 || locationLoading)

  const isSidebar = variant === 'sidebar'

  return (
    <section
      className={
        isSidebar
          ? 'border-b z-10 border-white/20 bg-white/70 px-6 pb-6 pt-4 backdrop-blur-sm'
          : 'mx-auto mt-10 w-full max-w-5xl px-4 sm:px-6 lg:px-0'
      }
    >
      <div
        className={
          isSidebar
            ? 'flex flex-col gap-6'
            : 'relative overflow-hidden rounded-[32px] border border-primary-100/80 bg-white/90 px-6 py-8 shadow-[0_60px_160px_-80px_rgba(94,67,255,0.5)] backdrop-blur sm:px-10 sm:py-10'
        }
      >
        <header
          className={
            isSidebar
              ? 'flex flex-col gap-2 text-left'
              : 'flex flex-col items-center text-center'
          }
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.4em] text-primary-400">
            Find nearby jams
          </span>
          <h2
            className={
              isSidebar
                ? 'text-2xl font-semibold text-slate-900'
                : 'mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl'
            }
          >
            Filter your search
          </h2>
          <p
            className={
              isSidebar
                ? 'text-sm text-slate-500'
                : 'mt-3 max-w-2xl text-sm text-slate-500 sm:text-base'
            }
          >
            Pick instruments, genres, and distance to find the jams that fit.
          </p>
        </header>

        <div className={isSidebar ? 'flex flex-col gap-6' : 'mt-6 flex flex-col gap-6'}>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold uppercase tracking-[0.32em] text-primary-500 transition hover:text-primary-600"
            >
              Clear all
            </button>
          </div>
          <div
            className={
              isSidebar
                ? 'grid gap-4 sm:grid-cols-2'
                : 'grid gap-4 sm:grid-cols-2 sm:items-end'
            }
          >
            <MultiSelect
              id="instrument-filter"
              label="Instruments"
              options={instrumentOptions}
              selected={selectedInstruments}
              onChange={handleInstrumentChange}
              placeholder="Select instruments..."
            />
            <MultiSelect
              id="genre-filter"
              label="Genres"
              options={genreOptions}
              selected={selectedGenres}
              onChange={handleGenreChange}
              placeholder="Select genres..."
            />
          </div>




          <div
            className={
              isSidebar
                ? 'grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
                : 'grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(160px,220px)]'
            }
          >
            <div ref={locationContainerRef} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="location-filter"
                  className="text-sm font-medium text-slate-600"
                >
                  Location
                </label>
              </div>
              <div className="relative">
                <input
                  id="location-filter"
                  type="text"
                  value={locationInput}
                  onChange={(event) => {
                    setLocationInput(event.target.value)
                    if (!locationFocused) setLocationFocused(true)
                  }}
                  onFocus={() => setLocationFocused(true)}
                  placeholder="City, town, or postcode"
                  className="input-field filter-input w-full rounded-2xl border border-primary-100 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
                />
                {showLocationSuggestions && (
                  <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-[0_30px_70px_-45px_rgba(112,66,255,0.35)]">
                    <ul className="max-h-64 overflow-auto py-2">
                      {locationLoading && (
                        <li className="px-4 py-2 text-sm text-slate-500">
                          Searching…
                        </li>
                      )}
                      {!locationLoading && locationResults.length === 0 && (
                        <li className="px-4 py-2 text-sm text-slate-500">
                          No matches found
                        </li>
                      )}
                      {locationResults.map((result) => (
                        <li key={result.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectLocation(result)}
                            className="flex w-full flex-col items-start gap-1 px-4 py-2 text-left text-sm text-slate-600 transition hover:bg-primary-50/80"
                          >
                            <span className="font-medium text-slate-800">
                              {result.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {result.displayName}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label
                htmlFor="radius-filter"
                className="text-sm font-medium text-slate-600"
              >
                Radius
              </label>
              <select
                id="radius-filter"
                value={selectedRadius}
                onChange={(event) => handleRadiusChange(Number(event.target.value))}
                className="input-field filter-input rounded-2xl border border-primary-100 bg-white px-3 py-3 text-sm font-medium text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
              >
                {DEFAULT_RADIUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Within {option} miles
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function updateParams(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParamsString: string,
  updates: Record<string, string | string[] | null>
) {
  const params = new URLSearchParams(searchParamsString)
  for (const [key, value] of Object.entries(updates)) {
    params.delete(key)
    if (value == null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        const trimmed = entry.trim()
        if (trimmed.length > 0) {
          params.append(key, trimmed)
        }
      }
      continue
    }
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      params.set(key, trimmed)
    }
  }
  const next = params.toString()
  router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
}

function readArrayParam(searchParamsString: string, key: string) {
  const params = new URLSearchParams(searchParamsString)
  const entries = params.getAll(key)
  return entries
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0)
}

function formatFilterLabel(value: string) {
  return value
    .split(' ')
    .map((segment) =>
      segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-')
    )
    .join(' ')
    .replace(/&[a-z]/g, (match) => match.toUpperCase())
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}

function useAddressAutocomplete() {
  const [results, setResults] = useState<AddressResult[]>([])
  const [loading, setLoading] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim()
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
    if (trimmed.length < 3) {
      setResults([])
      return
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        }
      )
      if (!response.ok) throw new Error('Failed to search location')
      const payload: any[] = await response.json()
      setResults(
        payload.map((entry, index) => ({
          id: String(entry.place_id ?? index),
          name: entry.display_name?.split(',')?.[0]?.trim() ?? trimmed,
          displayName: entry.display_name ?? trimmed,
          lat: Number(entry.lat),
          lon: Number(entry.lon),
          locality: entry.address?.city || entry.address?.town || entry.address?.village || null,
          country: entry.address?.country || null,
        }))
      )
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
    setResults([])
    setLoading(false)
  }, [])

  return { results, loading, search, clear }
}
