import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'

function getLocalIps() {
  const nets = networkInterfaces()
  const results = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address })
      }
    }
  }
  return results.length > 0 ? results : [{ name: 'Local', address: 'localhost' }]
}

const ips = getLocalIps()
const isWindows = process.platform === 'win32'
const npxCmd = isWindows ? 'npx.cmd' : 'npx'

console.log('\n' + '='.repeat(64))
console.log('  ⚡ iPOS MULTI-DEVICE REALTIME DEMO (WLAN / LAN) ⚡')
console.log('='.repeat(64))
console.log('\n👉 Buka di HP Kasir 1 & HP Kasir 2 (Pilih IP adapter WiFi Anda):')
ips.forEach((ip) => {
  console.log(`   \x1b[32m\x1b[1mhttp://${ip.address}:5173\x1b[0m  \x1b[90m[Adapter: ${ip.name}]\x1b[0m`)
})
console.log('\n   (Di laptop ini Anda bisa buka: http://localhost:5173)')
console.log('='.repeat(64) + '\n')

// Jalankan Vite dev server (WebSocket relay terintegrasi otomatis di /ws-sync)
const viteProc = spawn(npxCmd, ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
  shell: isWindows,
})

function cleanup() {
  console.log('\n[iPOS] Mematikan server...')
  try {
    viteProc.kill()
  } catch {}
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
