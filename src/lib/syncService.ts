/**
 * iPOS Realtime Sync Service
 * Menghubungkan multi-perangkat via:
 * 1. WebSocket LAN (<10ms) langsung via port Vite (/ws-sync) atau port relay (:5174)
 * 2. HTTP Polling Fallback (dengan sequence revision) jika diakses via domain Shared Hosting
 * 3. BroadcastChannel untuk antar-tab di browser yang sama
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
  rev?: number
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
  private lastPollRev: number = 0
  private listeners: ((event: StockMutationEvent) => void)[] = []
  private statusListeners: ((status: SyncStatus) => void)[] = []
  private processedEventKeys = new Set<string>()
  private isAttemptingWs: boolean = false

  public status: SyncStatus = {
    mode: 'offline',
    connected: false,
    activePeers: 1,
    lastSyncTime: null,
  }

  constructor() {
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
    console.log(`[iPOS Sync] Inisialisasi sync service. Device ID: ${this.deviceId}`)
    this.connectWebSocket()
  }

  private updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial }
    this.statusListeners.forEach((fn) => fn(this.status))
  }

  /**
   * Helper untuk mendapatkan URL API relatif terhadap lokasi website
   * (Mendukung baik root domain https://domain.com/ maupun subfolder https://domain.com/ipos/)
   */
  private getApiUrl(action: string): string {
    const origin = window.location.origin
    const path = window.location.pathname
    // Ambil base folder URL (misal: / atau /ipos/)
    const dir = path.substring(0, path.lastIndexOf('/') + 1) || '/'
    return `${origin}${dir}api/live-sync.php?action=${action}`
  }

  private connectWebSocket() {
    if (this.isAttemptingWs) return
    this.isAttemptingWs = true

    const host = window.location.host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    // Prioritas 1: Langsung via Vite server (/ws-sync) pada port yang sama (mis. :5173)
    const wsUrl = `${protocol}//${host}/ws-sync`
    console.log(`[iPOS Sync] Mencoba koneksi WebSocket ke ${wsUrl}...`)

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.isAttemptingWs = false
        console.log(`\x1b[32m[iPOS Sync] Terhubung ke WebSocket LAN Relay!\x1b[0m`)
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
        this.isAttemptingWs = false
        if (this.status.mode === 'ws') {
          this.updateStatus({ connected: false })
        }
        // Fallback otomatis ke HTTP polling
        this.startPollingFallback()
      }

      this.ws.onerror = () => {
        this.isAttemptingWs = false
        // Jika WebSocket gagal (misal di shared hosting publik)
        this.startPollingFallback()
      }
    } catch {
      this.isAttemptingWs = false
      this.startPollingFallback()
    }
  }

  private startPollingFallback() {
    if (this.pollTimer) return

    console.log('[iPOS Sync] Mengaktifkan mode HTTP Polling Relay (Shared Hosting / Fallback)...')
    this.updateStatus({
      mode: 'poll',
      connected: true,
    })

    const poll = async () => {
      try {
        const url = `${this.getApiUrl('poll')}&since_rev=${this.lastPollRev}&exclude=${this.deviceId}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.ok) {
            if (Array.isArray(data.events) && data.events.length > 0) {
              data.events.forEach((ev: StockMutationEvent) => {
                this.handleIncomingEvent(ev)
              })
            }
            if (typeof data.current_rev === 'number') {
              this.lastPollRev = data.current_rev
            }
            this.updateStatus({
              connected: true,
              lastSyncTime: Date.now(),
            })
          }
        }
      } catch (err) {
        // Jangan putus, tetap coba
      }
    }

    // Lakukan poll pertama segera
    poll()
    // Lanjutkan setiap 1200ms
    this.pollTimer = window.setInterval(poll, 1200)
  }

  private handleIncomingEvent(event: StockMutationEvent) {
    if (event.senderDevice === this.deviceId) return

    const key = event.rev ? `rev-${event.rev}` : `${event.senderDevice}-${event.timestamp}`
    if (this.processedEventKeys.has(key)) return
    this.processedEventKeys.add(key)
    if (this.processedEventKeys.size > 200) {
      const first = Array.from(this.processedEventKeys)[0]
      this.processedEventKeys.delete(first)
    }

    console.log(`\x1b[32m[iPOS Sync] Menerima mutasi stok dari ${event.kasirNama || event.senderDevice}:\x1b[0m`, event.items)
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

    console.log(`[iPOS Sync] Memancarkan pengurangan stok:`, items)

    // 1. WebSocket (jika terhubung)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    }

    // 2. BroadcastChannel (antar-tab di komputer yang sama)
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event)
    }

    // 3. HTTP Broadcast (ke live-sync.php di shared hosting)
    fetch(this.getApiUrl('broadcast'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && typeof data.rev === 'number') {
          this.lastPollRev = data.rev
        }
      })
      .catch(() => {
        // Abaikan jika offline / dev mode
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
