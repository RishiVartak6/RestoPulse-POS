import { useEffect, useRef, useCallback } from 'react'

// Derive WebSocket base URL dynamically so it works on localhost, LAN IPs, and public tunnels.
function getWsBase() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}`
}

export function useAdminWebSocket(onMessage) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(`${getWsBase()}/ws/admin`)

      ws.current.onopen = () => {
        console.log('[WS] Admin connected')
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (e) {}
      }

      ws.current.onclose = () => {
        console.log('[WS] Admin disconnected, reconnecting in 3s...')
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])
}

export function useOrderWebSocket(orderId, onMessage) {
  const ws = useRef(null)

  useEffect(() => {
    if (!orderId) return
    ws.current = new WebSocket(`${getWsBase()}/ws/order/${orderId}`)
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (e) {}
    }
    return () => ws.current?.close()
  }, [orderId])
}
