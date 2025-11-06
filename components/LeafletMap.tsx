'use client'

import { useEffect, useRef, useState, useMemo, useId } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'
import type { Profile } from '@/lib/types'

interface LeafletMapProps {
  profiles: Profile[]
  mapCenter: [number, number]
}

function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function CaptureMapInstance({ mapRef }: { mapRef: React.MutableRefObject<any | null> }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map;
    return () => {
      // Ensure the Leaflet map instance is fully removed on unmount.
      try {
        if (mapRef.current && typeof mapRef.current.remove === 'function') {
          mapRef.current.remove();
        }
      } catch (e) {
        // ignore
      } finally {
        mapRef.current = null;
      }
    };
  }, [map, mapRef]);
  return null
}

export function LeafletMap({ profiles, mapCenter }: LeafletMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const [ready, setReady] = useState(false);
  const mapNodeId = useId();

  useEffect(() => {
    const stale = document.getElementById(mapNodeId);
    if (stale && stale.parentElement) {
      stale.parentElement.removeChild(stale);
    }
    // Defensive: if Fast Refresh/Strict Mode left an existing Leaflet container in this wrapper,
    // remove it so we don't initialise a second map on the same node.
    const container = wrapperRef.current?.querySelector('.leaflet-container');
    if (container) {
      container.remove();
    }
    setReady(true);

    const created = mapRef.current
    return () => {
      // Remove any created Leaflet map instance on unmount to avoid duplicate initialisation
      if (created && typeof created.remove === 'function') {
        try {
          created.remove();
        } catch (e) {
          // ignore
        }
      }
    }
  }, [mapNodeId]);

  const mapElement = useMemo(() => (
    <MapContainer
      id={mapNodeId}
      center={mapCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnChange center={mapCenter} />
      <CaptureMapInstance mapRef={mapRef} />
      {profiles.map((profile) => {
        if (!profile.lat || !profile.lng) return null;
        return (
          <Marker key={profile.id} position={[profile.lat, profile.lng] as [number, number]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{profile.display_name}</h3>
                {profile.city && <p className="text-sm text-gray-600">{profile.city}</p>}
                <a
                  href={`/profile/${profile.id}`}
                  className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                >
                  View Profile →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  ), [mapCenter, mapNodeId, profiles]);

  if (!ready) return null;
  return (
    <div ref={wrapperRef} style={{ height: '100%', width: '100%' }}>
      {mapElement}
    </div>
  );
}
