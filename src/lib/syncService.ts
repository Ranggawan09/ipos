/**
 * iPOS Realtime Sync Service
 * Menghubungkan multi-perangkat via:
 * 1. WebSocket LAN (<10ms, jika dijalankan via npm run lan di WLAN yang sama)
 * 2. HTTP Polling Fallback (jika diakses via domain Shared Hosting tanpa WebSocket)
 * 3. BroadcastChannel (fallback antar-tab di browser yang sama)
 */

export interface StockMutationItem {
  produkId: string
  namaProduk: string
  qty: number
  sisaStok: number
}

export interface StockMutationEvent {
  type: 'STOCK_MUTATION'
  senderDevice: string
  kasirNama?: string
  items: StockMutationItem[]
  timestamp: number
}

export type SyncMode = 'ws' | 'poll' | 'offline'

export interface SyncStatus {
  mode: SyncMode
  connected: boolean
  activePeers: number
  lastSyncTime: number | null
}

class SyncService {
  private deviceId: string
  private ws: WebSocket | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private pollTimer: number | null = null
  private lastPollTimestamp: number = Date.now()
  private listeners: ((event: StockMutationEvent) => void)[] = []
  private statusListeners: ((status: SyncStatus) => void)[] = []
  private processedEventIds = new Set<string>()

  public status: SyncStatus = {
    mode: 'offline',
    connected: false,
    activePeers: 1,
    lastSyncTime: null,
  }

  constructor() {
    // ID unik perangkat ini
    let savedId = sessionStorage.getItem('ipos_device_id')
    if (!savedId) {
      savedId = `DEV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      sessionStorage.setItem('ipos_device_id', savedId)
    }
    this.deviceId = savedId

    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('ipos-lan-sync')
      this.broadcastChannel.onmessage = (ev) => {
        if (ev.data?.type === 'STOCK_MUTATION') {
          this.handleIncomingEvent(ev.data)
        }
      }
    }
  }

  public init() {
    this.connectWebSocket()
  }

  private updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial }
    this.statusListeners.forEach((fn) => fn(this.status))
  }

  private connectWebSocket() {
    // Port sync relay LAN default: 5174
    const hostname = window.location.hostname || 'localhost'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Jika diakses via IP LAN atau localhost, port relay adalah 5174
    const wsUrl = `${protocol}//${hostname}:5174`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.updateStatus({
          mode: 'ws',
          connected: true,
          lastSyncTime: Date.now(),
        })
        if (this.pollTimer) {
          clearInterval(this.pollTimer)
          this.pollTimer = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'STOCK_MUTATION') {
            this.handleIncomingEvent(data)
          } else if (data.type === 'PEER_COUNT_UPDATE') {
            this.updateStatus({ activePeers: data.count || 1 })
          } else if (data.type === 'SYNC_CONNECTED') {
            this.updateStatus({ activePeers: data.clientCount || 1 })
          }
        } catch {}
      }

      this.ws.onclose = () => {
        if (this.status.mode === 'ws') {
          this.updateStatus({ connected: false })
          // Coba fallback ke HTTP polling jika koneksi WS terputus
          this.startPollingFallback()
          // Dan coba reconnect WS setelah 5 detik
          setTimeout(() => this.connectWebSocket(), 5000)
        }
      }

      this.ws.onerror = () => {
        // Jika WS gagal (misal aplikasi dibuka di shared hosting publik tanpa server WS)
        this.startPollingFallback()
      }
    } catch {
      this.startPollingFallback()
    }
  }

  private startPollingFallback() {
    if (this.pollTimer) return

    this.updateStatus({
      mode: 'poll',
      connected: true,
    })

    // Polling setiap 1.5 detik ke endpoint live-sync.php
    this.pollTimer = window.setInterval(async () => {
      try {
        const url = `/api/live-sync.php?action=poll&since=${this.lastPollTimestamp}&exclude=${this.deviceId}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.ok && Array.isArray(data.events)) {
            data.events.forEach((ev: StockMutationEvent) => {
              this.handleIncomingEvent(ev)
            })
            if (data.now) {
              this.lastPollTimestamp = data.now
            }
          }
          this.updateStatus({
            connected: true,
            lastSyncTime: Date.now(),
          })
        }
      } catch {
        this.updateStatus({ connected: false })
      }
    }, 1500)
  }

  private handleIncomingEvent(event: StockMutationEvent) {
    // Abaikan jika event dikirim dari perangkat ini sendiri
    if (event.senderDevice === this.deviceId) return

    // Cegah duplikasi event
    const eventKey = `${event.senderDevice}-${event.timestamp}`
    if (this.processedEventIds.has(eventKey)) return
    this.processedEventIds.add(eventKey)
    if (this.processedEventIds.size > 200) {
      const first = Array.from(this.processedEventIds)[0]
      this.processedEventIds.delete(first)
    }

    this.updateStatus({ lastSyncTime: Date.now() })
    this.listeners.forEach((cb) => cb(event))
  }

  public broadcastStockMutation(items: StockMutationItem[], kasirNama?: string) {
    const event: StockMutationEvent = {
      type: 'STOCK_MUTATION',
      senderDevice: this.deviceId,
      kasirNama,
      items,
      timestamp: Date.now(),
    }

    // 1. Kirim via WebSocket jika terhubung
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    }

    // 2. Kirim via BroadcastChannel untuk tab lain di laptop/HP yang sama
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event)
    }

    // 3. Kirim via HTTP broadcast (untuk fallback shared hosting)
    fetch('/api/live-sync.php?action=broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Abaikan jika server PHP lokal tidak aktif (mode WS tetap jalan)
    })
  }

  public onStockMutation(callback: (event: StockMutationEvent) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback)
    }
  }

  public onStatusChange(callback: (status: SyncStatus) => void) {
    this.statusListeners.push(callback)
    callback(this.status)
    return () => {
      this.statusListeners = this.statusListeners.filter((fn) => fn !== callback)
    }
  }

  public getDeviceId() {
    return this.deviceId
  }
}

export const syncService = new SyncService()
