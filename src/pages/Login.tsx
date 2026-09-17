import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { Button, Input } from '@/components/ui'

const homeFor = (role: string) =>
  role === 'kasir' ? '/kasir' : role === 'owner' ? '/owner' : '/admin'

export function Login() {
  const navigate = useNavigate()
  const { users } = useDataStore()
  const { currentUser, login, selectedShiftNomor, setSelectedShiftNomor } = useSessionStore()
  const push = useToast((s) => s.push)
  const [username, setUsername] = useState('admin')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  if (currentUser) return <Navigate to={homeFor(currentUser.role)} replace />

  const daftar = users.filter((u) => u.aktif)
  const targetUser = users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase())
  const isKasir = targetUser?.role === 'kasir'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const u = users.find((x) => x.username === username)
    if (!u) {
      setError('Akun tidak ditemukan')
      return
    }
    if (u.pin !== pin) {
      setError('PIN salah')
      return
    }
    login(u)
    push({
      tipe: 'sukses',
      judul: `Selamat datang, ${u.nama}`,
      pesan: u.role === 'kasir' ? `Masuk sebagai kasir (Shift ${selectedShiftNomor})` : `Masuk sebagai ${u.role}`,
    })
    navigate(homeFor(u.role), { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        {/* Kiri: brand */}
        <div className="hidden flex-col justify-between bg-slate-900 p-8 text-white md:flex">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold">
              iPOS
            </span>
            <h1 className="mt-6 text-2xl font-bold leading-tight">
              Sistem Inventory, POS &amp; Keuangan
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Platform manajemen terpadu untuk operasional toko retail: persediaan barang,
              kasir POS, dan pelaporan keuangan berkala.
            </p>
          </div>
          <ul className="mt-8 space-y-2.5 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span>Inventory: produk, stok, supplier, stock opname</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span>POS: transaksi penjualan, shift kasir, cetak struk</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span>Keuangan: pembukuan, laba rugi, rekonsiliasi kas</span>
            </li>
          </ul>
          <p className="mt-8 text-xs text-slate-500">Versi 1.0 (Produksi) | Toko Pasar Jaya</p>
        </div>

        {/* Kanan: form */}
        <div className="p-8">
          <h2 className="text-lg font-bold text-slate-800">Masuk ke Sistem</h2>
          <p className="mt-1 text-sm text-slate-500">Pilih akun pengguna atau masukkan kredensial.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Username</label>
              <Input value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError('') }}
                placeholder="4 digit PIN"
                maxLength={4}
                autoComplete="off"
              />
            </div>

            {isKasir && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Pilih Shift Kerja</label>
                  <span className="text-[11px] font-semibold text-emerald-600">Shift {selectedShiftNomor} Terpilih</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([1, 2] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedShiftNomor(s)}
                      className={`flex flex-col items-center justify-center border py-2.5 text-xs font-semibold transition ${
                        selectedShiftNomor === s
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>Shift {s}</span>
                      <span
                        className={`text-[10px] font-normal ${
                          selectedShiftNomor === s ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {s === 1 ? 'Pagi (08:00 - 15:00)' : 'Siang / Malam (15:00 - 22:00)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
            <Button type="submit" className="w-full" size="lg">
              {isKasir ? `Masuk (Shift ${selectedShiftNomor})` : 'Masuk'}
            </Button>
          </form>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pilihan Akun Pengguna Cepat
            </p>
            <div className="grid grid-cols-2 gap-2">
              {daftar.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setUsername(u.username); setPin(u.pin); setError('') }}
                  className="rounded-lg border border-slate-200 p-2 text-left transition hover:border-brand-400 hover:bg-brand-50"
                >
                  <p className="text-xs font-semibold text-slate-700">{u.nama}</p>
                  <p className="text-[10px] text-slate-400">
                    @{u.username} | PIN {u.pin} | {u.role.toUpperCase()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
