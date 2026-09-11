import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.SYNC_PORT || 5174)

// Ambil IP lokal untuk akses perangkat lain di WiFi/WLAN yang sama
export function getLocalIp() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200)
    res.end(
      JSON.stringify({
        ok: true,
        service: 'iPOS LAN Sync Relay',
        connectedClients: wss.clients.size,
        localIp: getLocalIp(),
        port: PORT,
        timestamp: new Date().toISOString(),
      }),
    )
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  console.log(`[SYNC] Perangkat terhubung dari: ${clientIp} (Total aktif: ${wss.clients.size})`)

  // Kirim pesan selamat datang
  ws.send(
    JSON.stringify({
      type: 'SYNC_CONNECTED',
      message: 'Terhubung ke iPOS LAN Sync Relay',
      clientCount: wss.clients.size,
      serverTime: Date.now(),
    }),
  )

  // Broadcast update jumlah klien aktif ke semua perangkat
  broadcastClientCount()

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString())
      // Teruskan pesan mutasi stok ke seluruh perangkat lain
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsed))
        }
      })
    } catch (err) {
      console.error('[SYNC] Gagal memproses payload:', err)
    }
  })

  ws.on('close', () => {
    console.log(`[SYNC] Perangkat terputus. (Total aktif: ${wss.clients.size})`)
    broadcastClientCount()
  })

  ws.on('error', (err) => {
    console.error('[SYNC] Error socket:', err)
  })
})

function broadcastClientCount() {
  const payload = JSON.stringify({
    type: 'PEER_COUNT_UPDATE',
    count: wss.clients.size,
  })
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}

// Heartbeat tiap 25 detik agar koneksi di browser HP tidak di-suspend
const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping()
    }
  })
}, 25000)

wss.on('close', () => clearInterval(interval))

if (process.argv[1]?.endsWith('sync-server.js')) {
  server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp()
    console.log('====================================================')
    console.log('🚀 iPOS Realtime LAN Sync Relay Berjalan')
    console.log(`📡 WebSocket URL : ws://${ip}:${PORT}`)
    console.log(`🌐 Health Check : http://${ip}:${PORT}/health`)
    console.log('====================================================')
  })
}

export { server, wss }
