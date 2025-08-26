import React, { useEffect, useRef, useState } from 'react'
import { fetchRoute, fetchPoint, fetchHighlight } from '../api'

export default function MapView({ sectionId }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [libReady, setLibReady] = useState(() => typeof window !== 'undefined' && !!window.maplibregl)

  // load MapLibre via CDN once
  useEffect(() => {
    if (libReady) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.js'
    script.onload = () => setLibReady(true)
    document.body.appendChild(script)
  }, [libReady])

  // init map when library and section ready
  useEffect(() => {
    if (!sectionId || !libReady || !containerRef.current) return

    const map = new window.maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [0, 0],
      zoom: 12,
    })
    mapRef.current = map

    let cancelled = false

    map.on('load', async () => {
      try {
        const route = await fetchRoute(sectionId)
        if (cancelled) return
        if (route && route.geometry) {
          map.addSource('route', { type: 'geojson', data: route })
          map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#666', 'line-width': 3 } })

          const coords = route.geometry.type === 'LineString'
            ? route.geometry.coordinates
            : route.geometry.coordinates.flat()
          if (coords.length) {
            const bounds = coords.reduce(
              (b, c) => b.extend(c),
              new window.maplibregl.LngLatBounds(coords[0], coords[0])
            )
            map.fitBounds(bounds, { padding: 20, duration: 0 })
          }
        }

        map.addSource('highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({ id: 'highlight', type: 'line', source: 'highlight', paint: { 'line-color': '#e53935', 'line-width': 4 } })
        markerRef.current = new window.maplibregl.Marker({ color: '#1976d2' })
          .setLngLat(map.getCenter())
          .addTo(map)
      } catch (e) {
        console.error('map load', e)
      }
    })

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [sectionId, libReady])

  // listen for viewport events
  useEffect(() => {
    if (!sectionId || !libReady) return
    let detail = null
    let timer = null

    const process = async () => {
      timer = null
      if (!mapRef.current || !detail) return
      const map = mapRef.current
      const { centerM, activeRange } = detail
      try {
        map.stop()
        const pt = await fetchPoint(sectionId, centerM)
        if (pt?.geometry) {
          const [lng, lat] = pt.geometry.coordinates
          markerRef.current?.setLngLat([lng, lat])
          map.easeTo({ center: [lng, lat], duration: 300, easing: (t) => t })
        }
        if (activeRange) {
          const seg = await fetchHighlight(sectionId, activeRange.fromM, activeRange.toM)
          map.getSource('highlight')?.setData(seg || { type: 'FeatureCollection', features: [] })
        } else {
          map.getSource('highlight')?.setData({ type: 'FeatureCollection', features: [] })
        }
      } catch (e) {
        console.error('map update', e)
      }
    }

    const handle = (e) => {
      detail = e.detail
      if (!timer) timer = setTimeout(process, 33)
    }

    window.addEventListener('sld:viewport', handle)
    return () => {
      window.removeEventListener('sld:viewport', handle)
      if (timer) clearTimeout(timer)
    }
  }, [sectionId, libReady])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
