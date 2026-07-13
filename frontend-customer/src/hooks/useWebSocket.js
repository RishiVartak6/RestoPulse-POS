import { useEffect, useRef, useCallback } from 'react'

// Dynamically resolve WebSocket base URL from the current page origin.
// This ensures WS works on localhost, local IP, AND public tunnel URLs (https → wss).
function getWsBase() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host  // includes port if non-standard
  return `${proto}://${host}`
}

export function useOrderWebSocket(orderId, onMessage) {
  const ws = useRef(null)
  const reconnect = useRef(null)

  const connect = useCallback(() => {
    if (!orderId) return
    ws.current = new WebSocket(`${getWsBase()}/ws/order/${orderId}`)
    ws.current.onopen = () => { clearTimeout(reconnect.current) }
    ws.current.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch {}
    }
    ws.current.onclose = () => {
      reconnect.current = setTimeout(connect, 3000)
    }
  }, [orderId, onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnect.current)
      ws.current?.close()
    }
  }, [connect])
}
