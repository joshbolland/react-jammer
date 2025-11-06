"use client"

import dynamic from 'next/dynamic'
import React from 'react'

// Dynamically import the MapView component on the client only. This file
// is a Client Component so using `ssr: false` is allowed here.
const MapView = dynamic(
    () => import('./MapView').then((mod) => mod.MapView),
    { ssr: false }
)

export default function MapViewClient(props: any) {
    return <MapView {...props} />
}
