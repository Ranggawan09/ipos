import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { stokKritis } from '@/store/selectors'
import { useToast } from '@/store/useToast'
import { angka, jam } from '@/lib/format'
import { Badge } from './ui'
import { ModalRestockSupplier } from './ModalRestockSupplier'

export function Topbar({ judul }: { judul?: string }) {
  const navigate = useNavigate()
  const { produk, logSinkron, tambahLogSinkron } = useDataStore()
  const { currentUser, logout, offlineMode, setOffline, pendingQueue, flushPending } =
    useSessionStore()
  const push = useToast((s) => s.push)
  const [bukaNotif, setBukaNotif] = useState(false)
  const [bukaUser, setBukaUser] = useState(false)
  const [modalRestock, setModalRestock] = useState(false)

  const kritis = useMemo(() => stokKritis(produk), [produk])
  const terakhirCloud = logSinkron.find((l) => l.jenis === 'cloud')

  const toggleOffline = () => {
    if (!offlineMode) {
      setOffline(true)
      push({ tipe: 'peringatan', judul: 'Mode Offline aktif', pesan: 'Transaksi akan diantrekan secara lokal.' })
    } else {
      setOffline(false)
      const jml = flushPending()
      push({
        tipe: 'sukses',
        judul: 'Kembali online',
        pesan: jml > 0 ? `${jml} transaksi offline berhasil disinkronkan.` : 'Tidak ada transaksi tertunda.',
      })
    }
  }

  const sinkronCloud = () => {
    tambahLogSinkron({
      waktu: new Date().toISOString(),
      jenis: 'cloud',
      jumlahData: 1,
      keterangan: 'Sinkronisasi manual ke basis data cloud',
      status: 'sukses',
    })
    push({ tipe: 'sukses', judul: 'Sinkronisasi cloud berhasil', pesan: 'Cadangan data terkirim ke cloud.' })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-700">{judul}</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Indikator server lokal (simulasi WebSocket) */}
        <span
          title="Terhubung ke server lokal toko melalui jaringan WiFi (simulasi WebSocket)"
          className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Server lokal aktif
        </span>

        {/* Mode offline (FR-POS-09) */}
        <button
          onClick={toggleOffline}
          title="Simulasikan koneksi internet terputus / pulih"
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            offlineMode ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {offlineMode ? 'Offline' : 'Online'}
        </button>

        {pendingQueue.length > 0 && (
          <Badge warna="amber">{angka(pendingQueue.length)} menunggu sinkron</Badge>
        )}

        {/* Sinkronisasi cloud */}
        <button
          onClick={sinkronCloud}
          title="Sinkronkan data ke basis data cloud (FR: pencadangan berkala)"
          className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 md:inline-flex"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />
          </svg>
          {terakhirCloud ? `Cloud: ${jam(terakhirCloud.waktu)}` : 'Sync cloud'}
        </button>

        {/* Notifikasi stok minimum (FR-INV-06) */}
        <div className="relative">
          <button
            onClick={() => setBukaNotif((v) => !v)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            title="Notifikasi stok di bawah minimum"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {kritis.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {kritis.length > 99 ? '99+' : kritis.length}
              </span>
            )}
          </button>
          {bukaNotif && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBukaNotif(false)} />
              <div className="absolute right-0 top-11 z-40 w-88 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-semibold text-slate-700">Notifikasi Stok Menipis</p>
                  {kritis.length > 0 && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 border border-rose-200">
                      {kritis.length} barang
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {kritis.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">Semua stok aman</p>
                  ) : (
                    kritis.slice(0, 20).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setBukaNotif(false)
                          setModalRestock(true)
                        }}
                        className="flex w-full items-start justify-between gap-2 border-b border-slate-50 px-4 py-2.5 text-left hover:bg-amber-50/50 transition group"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-700 group-hover:text-amber-800">{p.nama}</p>
                          <p className="text-[11px] text-slate-400">{p.sku}</p>
                        </div>
                        <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
                          {p.stok} / min {p.stokMinimum}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {kritis.length > 0 && (
                  <div className="border-t border-slate-100 p-2.5 bg-slate-50/80">
                    <button
                      onClick={() => {
                        setBukaNotif(false)
                        setModalRestock(true)
                      }}
                      className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition shadow-sm"
                    >
                      Detail Restock per Supplier & Cetak PO
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Menu pengguna */}
        <div className="relative">
          <button
            onClick={() => setBukaUser((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {currentUser?.nama?.charAt(0) ?? '?'}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold text-slate-700">{currentUser?.nama}</span>
              <span className="block text-[10px] capitalize text-slate-400">{currentUser?.role}</span>
            </span>
          </button>
          {bukaUser && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBukaUser(false)} />
              <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">{currentUser?.nama}</p>
                  <p className="text-xs text-slate-400">@{currentUser?.username}</p>
                </div>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setBukaUser(false)
                    logout()
                    navigate('/login')
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ModalRestockSupplier
        open={modalRestock}
        onClose={() => setModalRestock(false)}
      />
    </header>
  )
}

export function SyncFooter() {
  const { lastSyncAt, pendingQueue } = useSessionStore()
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-1.5 text-[11px] text-slate-400">
      <span>
        {lastSyncAt ? `Sinkronisasi terakhir: ${jam(lastSyncAt)}` : 'Belum ada sinkronisasi'}
      </span>
      <span>{pendingQueue.length > 0 ? `${pendingQueue.length} transaksi menunggu` : 'Semua data tersinkron'}</span>
    </div>
  )
}
