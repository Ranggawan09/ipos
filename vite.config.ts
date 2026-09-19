import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { WebSocketServer, WebSocket } from 'ws'

function syncRelayPlugin(): Plugin {
  return {
    name: 'ipos-sync-relay',
    configureServer(server) {
      if (!server.httpServer) return
      const wss = new WebSocketServer({ noServer: true })

      server.httpServer.on('upgrade', (req, socket, head) => {
        const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : ''
        if (pathname === '/ws-sync') {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req)
          })
        }
      })

      const broadcastCount = () => {
        const payload = JSON.stringify({ type: 'PEER_COUNT_UPDATE', count: wss.clients.size })
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) c.send(payload)
        })
      }

      wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress
        console.log(`\x1b[32m[iPOS Sync]\x1b[0m Perangkat terhubung: ${ip} (Total aktif: ${wss.clients.size})`)

        ws.send(JSON.stringify({ type: 'SYNC_CONNECTED', clientCount: wss.clients.size }))
        broadcastCount()

        ws.on('message', (data) => {
          try {
            const parsed = JSON.parse(data.toString())
            console.log(`\x1b[33m[iPOS Sync]\x1b[0m Broadcast mutasi stok:`, parsed.items?.map((i: any) => `${i.namaProduk} (${i.sisaStok})`).join(', '))
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === WebSocket.OPEN) {
                c.send(JSON.stringify(parsed))
              }
            })
          } catch (err) {
            console.error('[iPOS Sync] Error parsing message:', err)
          }
        })

        ws.on('close', () => {
          console.log(`\x1b[31m[iPOS Sync]\x1b[0m Perangkat terputus (Total aktif: ${wss.clients.size})`)
          broadcastCount()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), syncRelayPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
