"use client"

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
// Ensure marker icons are found when bundling with Next.js
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Merge the default icon options so markers show up. Next.js' bundler will
// return a URL string for these imports.
try {
  // @ts-ignore
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x as unknown as string,
    iconUrl: markerIcon as unknown as string,
    shadowUrl: markerShadow as unknown as string,
  })
} catch (e) {
  // If leaflet isn't available during SSR or something else breaks, ignore.
}
import { Jam } from '@/lib/types'
import { format } from 'date-fns'

export function LeafletMap({
  jams = [],
  mapCenter = [51.505, -0.09] as [number, number],
  height = 400,
}: {
  jams?: Jam[]
  mapCenter?: [number, number]
  height?: number | string
}) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const containerIdRef = useRef<string>(`leaflet-map-${Math.random().toString(36).slice(2)}`)

  // On mount, remove any leftover leaflet container elements inside the
  // wrapper produced by previous renders/HMR so Leaflet doesn't throw
  // "Map container is already initialized." when re-initializing.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      // delay so React StrictMode's double-mount doesn't race with initialization
      const t = setTimeout(() => setReady(true), 0)
      return () => clearTimeout(t)
    }
    const existing = wrapper.querySelector('.leaflet-container')
    if (existing && existing.parentElement) {
      existing.parentElement.removeChild(existing)
    }
    // delay final mount to the next macrotask to avoid StrictMode double-init
    const t = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(t)
  }, [])

  // Ensure we explicitly remove the Leaflet map instance on unmount so
  // HMR/StrictMode doesn't leave a stale map attached to the DOM. The
  // CaptureMapInstance child writes the map instance into `mapRef`.
  useEffect(() => {
    return () => {
      try {
        if (mapRef.current && typeof mapRef.current.remove === 'function') {
          mapRef.current.remove()
          mapRef.current = null
        }
      } catch (e) {
        // ignore removal errors in cleanup
      }
    }
  }, [])

  // Keep the markup simple and give the map container a concrete height so
  // it doesn't depend on parent element heights. We'll initialize Leaflet
  // imperatively inside a useEffect to avoid react-leaflet's MapContainer
  // double-initialization under StrictMode/HMR.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      const t = setTimeout(() => setReady(true), 0)
      return () => clearTimeout(t)
    }
    // remove any leftover DOM nodes from previous mounts
    const existing = wrapper.querySelector('.leaflet-container')
    if (existing && existing.parentElement) existing.parentElement.removeChild(existing)
    const t = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(t)
  }, [])

  // Initialize Leaflet map imperatively once `ready` is true
  useEffect(() => {
    if (!ready) return
    const id = containerIdRef.current
    const container = document.getElementById(id)
    if (!container) return

    // If a map already exists for this ref, remove it first
    if (mapRef.current) {
      try {
        mapRef.current.remove()
      } catch (e) {
        // ignore
      }
      mapRef.current = null
    }

    const map = L.map(container, { preferCanvas: true }).setView(mapCenter, 13)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersRef.current = markersGroup

    ; (jams || []).forEach((jam) => {
      if (!jam || jam.lat == null || jam.lng == null) return
      // use a circle marker for a compact, crisp marker
      const m = L.circleMarker([jam.lat, jam.lng], {
        radius: 7,
        color: '#1f2937', // gray-800
        weight: 1,
        fillColor: '#3b82f6', // blue-500
        fillOpacity: 0.9,
        className: 'jam-marker',
      })

      const time = jam.jam_time ? format(new Date(jam.jam_time), 'PPP p') : ''
      const hostName = jam.host?.display_name || ''
      const tooltipTime = jam.jam_time
        ? format(new Date(jam.jam_time), 'EEE, MMM d · h:mm a')
        : ''
      const popupHtml = `
            <div style="min-width:180px">
              <h3 style="font-weight:600;margin:0 0 4px">${escapeHtml(jam.title)}</h3>
              ${hostName ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px">Hosted by ${escapeHtml(hostName)}</div>` : ''}
              ${time ? `<div style="font-size:12px;color:#6b7280;margin-bottom:6px">${escapeHtml(time)}</div>` : ''}
              <a href="/jams/${jam.id}" style="color:#2563eb;text-decoration:none;font-size:13px">View Jam →</a>
            </div>
          `
      m.bindPopup(L.popup().setContent(popupHtml))
      const tooltipHtml = `
            <div class="map-tooltip-inner">
              <strong>${escapeHtml(jam.title)}</strong>
              ${tooltipTime ? `<span>${escapeHtml(tooltipTime)}</span>` : ''}
            </div>
          `
      m.bindTooltip(tooltipHtml, {
        direction: 'top',
        offset: [0, -12],
        opacity: 0.95,
        className: 'map-tooltip',
        sticky: true,
      })
      markersGroup.addLayer(m)
    })

    mapRef.current = map

    return () => {
      try {
        map.remove()
      } catch (e) {
        // ignore
      }
      mapRef.current = null
      markersRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Update markers when jam data changes
  useEffect(() => {
    const mg = markersRef.current
    if (!mg) return
    mg.clearLayers()
    if (jams && jams.length > 0) {
      jams.forEach((jam) => {
        if (!jam || jam.lat == null || jam.lng == null) return
        const m = L.circleMarker([jam.lat, jam.lng], {
          radius: 9,
          color: '#8a55ff',
          weight: 1,
          fillColor: '#8a55ff',
          fillOpacity: 0.9,
          className: 'jam-marker',
        })
        const time = jam.jam_time ? format(new Date(jam.jam_time), 'PPP p') : ''
        const hostName = jam.host?.display_name || ''
        const tooltipTime = jam.jam_time
          ? format(new Date(jam.jam_time), 'EEE, MMM d · h:mm a')
          : ''
        const popupHtml = `
          <div style="min-width:180px">
            <h3 style="font-weight:600;margin:0 0 4px">${escapeHtml(jam.title)}</h3>
            ${hostName ? `<div style=\"font-size:12px;color:#6b7280;margin-bottom:4px\">Hosted by ${escapeHtml(hostName)}</div>` : ''}
            ${time ? `<div style=\"font-size:12px;color:#6b7280;margin-bottom:6px\">${escapeHtml(time)}</div>` : ''}
            <a href="/jams/${jam.id}" style="color:#2563eb;text-decoration:none;font-size:13px">View Jam →</a>
          </div>
        `
        m.bindPopup(L.popup().setContent(popupHtml))
        const tooltipHtml = `
          <div class="map-tooltip-inner">
            <strong>${escapeHtml(jam.title)}</strong>
            ${tooltipTime ? `<span>${escapeHtml(tooltipTime)}</span>` : ''}
          </div>
        `
        m.bindTooltip(tooltipHtml, {
          direction: 'top',
          offset: [0, -12],
          opacity: 0.95,
          className: 'map-tooltip',
          sticky: true,
        })
        mg.addLayer(m)
      })
    }
  }, [jams])

  // Recenter map when mapCenter prop changes
  useEffect(() => {
    if (mapRef.current) {
      try {
        const zoom = mapRef.current.getZoom?.() ?? 13
        mapRef.current.setView(mapCenter, zoom)
      } catch (e) {
        // ignore
      }
    }
  }, [mapCenter])

  // small util to escape HTML in strings inserted into popup markup
  function escapeHtml(str?: string | null) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const resolvedHeight = height ?? 400
  const containerStyle =
    typeof resolvedHeight === 'number'
      ? { width: '100%', minHeight: resolvedHeight }
      : { width: '100%', height: resolvedHeight }
  const mapStyle =
    typeof resolvedHeight === 'number'
      ? { height: resolvedHeight, width: '100%' }
      : { height: resolvedHeight, width: '100%' }

  return (
    <div ref={wrapperRef} style={containerStyle}>
      <div id={containerIdRef.current} style={mapStyle} />
    </div>
  )
}

// Provide a MapView named export for consumers that import { MapView }
// from '@/components/MapView'. This keeps backwards compatibility
// and matches the import used in `app/page.tsx`.
export const MapView = LeafletMap
