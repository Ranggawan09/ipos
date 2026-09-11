import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'

function getLocalIp() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

const localIp = getLocalIp()
const isWindows = process.platform === 'win32'
const npxCmd = isWindows ? 'npx.cmd' : 'npx'

console.log('\n' + '='.repeat(60))
console.log('  ⚡ iPOS MULTI-DEVICE REALTIME DEMO (LAN / WLAN) ⚡')
console.log('='.repeat(60))
console.log(`\n👉 Buka di HP Kasir 1 & Kasir 2 (Pastikan 1 WiFi/Hotspot):`)
console.log(`   \x1b[32m\x1b[1mhttp://${localIp}:5173\x1b[0m\n`)
console.log(`   (Di laptop ini Anda juga bisa buka: http://localhost:5173)`)
console.log('='.repeat(60) + '\n')

// Jalankan WebSocket sync server
const syncProc = spawn(process.execPath, ['scripts/sync-server.js'], {
  stdio: 'inherit',
  env: { ...process.env, SYNC_PORT: '5174' },
})

// Jalankan Vite dev server dengan flag --host
const viteProc = spawn(npxCmd, ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
})

function cleanup() {
  console.log('\n[iPOS] Mematikan server...')
  try {
    syncProc.kill()
    viteProc.kill()
  } catch {}
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
