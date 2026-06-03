// WebSocket realtime client. Connects to <wss>/api/ws?token=<JWT> and dispatches
// server push events. Auto-reconnects with backoff while a token is present.
// React Native ships a global WebSocket; the base host comes from EXPO_PUBLIC_DOMAIN.

import { getToken, onTokenChange, API_BASE } from './api/client'
import type { Message, Notification } from './api/types'

export type RealtimeEvent =
  | { type: 'message'; payload: Message }
  | { type: 'notification'; payload: Notification }

type Listener = (event: RealtimeEvent) => void

const listeners = new Set<Listener>()
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let attempts = 0
let started = false

function wsUrl(token: string): string {
  // API_BASE is like `https://<domain>/api` (or `/api` as a dev fallback).
  const wsBase = API_BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`
}

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function scheduleReconnect() {
  clearReconnect()
  const delay = Math.min(1000 * 2 ** attempts, 30_000)
  attempts += 1
  reconnectTimer = setTimeout(connect, delay)
}

function connect() {
  const token = getToken()
  if (!token) {
    disconnect()
    return
  }
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  try {
    socket = new WebSocket(wsUrl(token))
  } catch {
    scheduleReconnect()
    return
  }

  socket.addEventListener('open', () => {
    attempts = 0
  })

  socket.addEventListener('message', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data as string) as RealtimeEvent
      if (data && (data.type === 'message' || data.type === 'notification')) {
        for (const listener of listeners) listener(data)
      }
    } catch {
      // ignore malformed frames
    }
  })

  socket.addEventListener('close', () => {
    socket = null
    if (getToken()) scheduleReconnect()
  })

  socket.addEventListener('error', () => {
    socket?.close()
  })
}

export function disconnect() {
  clearReconnect()
  attempts = 0
  if (socket) {
    const s = socket
    socket = null
    s.close()
  }
}

/** Subscribe to realtime events. Starts the connection lazily. */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener)
  if (!started) {
    started = true
    onTokenChange((token) => {
      if (token) {
        attempts = 0
        connect()
      } else {
        disconnect()
      }
    })
  }
  connect()
  return () => {
    listeners.delete(listener)
  }
}
