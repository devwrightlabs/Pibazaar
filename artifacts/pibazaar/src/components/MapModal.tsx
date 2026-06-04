

import { useEffect, useState } from 'react'
import MapWrapper from '@/components/MapWrapper'
import { useStore } from '@/store/useStore'

/* ─── Props ────────────────────────────────────────────────────────────── */

interface MapModalProps {
  open: boolean
  onClose: () => void
  /** Heading shown in the modal header. Defaults to a location-picker title. */
  title?: string
}

type LocateState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'found'; lat: number; lng: number }
  | { status: 'error'; message: string }

/* ─── Component ────────────────────────────────────────────────────────── */

export default function MapModal({ open, onClose, title = 'Choose a location' }: MapModalProps) {
  const [locate, setLocate] = useState<LocateState>({ status: 'idle' })
  const setUserLocation = useStore((s) => s.setUserLocation)

  /* ── Lock body scroll when open ────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setLocate({ status: 'idle' })
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  /* ── Escape key closes modal ───────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocate({ status: 'error', message: 'Location is not supported on this device.' })
      return
    }
    setLocate({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        // Re-center the map on the detected location (MapBase reads userLocation).
        setUserLocation([lat, lng])
        setLocate({ status: 'found', lat, lng })
      },
      (err) => {
        setLocate({
          status: 'error',
          message:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Enable it to find sellers near you.'
              : 'Could not determine your location. Please try again.',
        })
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h2 id="map-modal-title" className="text-lg font-bold font-heading" style={{ color: 'var(--color-text)' }}>
          {title}
        </h2>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: 'var(--color-control-bg)' }}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Locate me control bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs sm:text-sm min-w-0 truncate" style={{ color: 'var(--color-subtext)' }}>
          {locate.status === 'found'
            ? `Located: ${locate.lat.toFixed(4)}, ${locate.lng.toFixed(4)}`
            : locate.status === 'error'
              ? locate.message
              : 'Browse sellers on the map or jump to your current location.'}
        </p>
        <button
          onClick={handleLocateMe}
          disabled={locate.status === 'locating'}
          className="inline-flex items-center gap-2 rounded-xl px-4 font-semibold text-sm shrink-0 transition-all active:scale-95 disabled:opacity-60"
          style={{ minHeight: 44, backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {locate.status === 'locating' ? 'Locating…' : 'Locate me'}
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0">
        <MapWrapper height="100%" />
      </div>
    </div>
  )
}
