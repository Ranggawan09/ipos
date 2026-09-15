import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MetodePembayaran, Produk, Transaksi } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah, tanggalJam } from '@/lib/format'
import { cetakStruk } from '@/lib/print'
import { Button, Input, Label, Modal, Select } from '@/components/ui'
import { syncService, type SyncStatus } from '@/lib/syncService'

function BukaShift() {
  const { bukaShift } = useDataStore()
  const { currentUser, setShiftId, selectedShiftNomor, setSelectedShiftNomor } = useSessionStore()
  const push = useToast((s) => s.push)
  const [saldo, setSaldo] = useState(200000)
  const [shiftNo, setShiftNo] = useState<1 | 2 | 3 | 4>(selectedShiftNomor || 1)

  const buka = () => {
    if (!currentUser) return
    setSelectedShiftNomor(shiftNo)
    const s = bukaShift(currentUser.id, saldo, shiftNo)
    setShiftId(s.id)
    push({ tipe: 'sukses', judul: `Shift ${shiftNo} dibuka`, pesan: `Saldo kas awal ${rupiah(saldo)}` })
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center bg-emerald-50 text-emerald-600 font-bold">
            POS
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-800">Buka Shift Kasir</h2>
            <p className="text-xs text-slate-500">Pilih shift kerja dan modal kas awal.</p>
          </div>
        </div>
        <div className="mb-3 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Kasir: <span className="font-semibold text-slate-800">{currentUser?.nama}</span>
        </div>
        <div className="mb-3">
          <Label>Pilih Shift</Label>
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setShiftNo(num)}
                className={`flex flex-col items-center justify-center border py-2 text-xs font-semibold transition ${
                  shiftNo === num
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Shift {num}</span>
                <span className={`text-[10px] ${shiftNo === num ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {num === 1 ? 'Pagi' : num === 2 ? 'Siang' : num === 3 ? 'Sore' : 'Malam'}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <Label>Saldo kas awal (modal laci)</Label>
          <Input type="number" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} />
        </div>
        <Button className="w-full" size="lg" variant="success" onClick={buka}>
          Buka Shift {shiftNo} Sekarang
        </Button>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Mencatat pembukaan shift {shiftNo} beserta saldo kas awal.
        </p>
      </div>
    </div>
  )
}

function StrukView({ trx, namaKasir }: { trx: Transaksi; namaKasir: string }) {
  const subtotalKotor = trx.detail.reduce((a, d) => a + d.qty * d.hargaSatuan, 0)
  const totalDiskonItem = trx.detail.reduce((a, d) => a + (d.diskonItem || 0), 0)
  const diskonNota = trx.diskonNominal || 0
  const totalDiskon = totalDiskonItem + diskonNota

  const items = trx.detail.map((d) => ({
    nama: d.namaProduk,
    qty: d.qty,
    harga: d.hargaSatuan,
    diskonItem: d.diskonItem,
    subtotal: d.subtotal,
  }))

  const cetak = () =>
    cetakStruk({
      namaToko: 'TOKO PASAR JAYA',
      alamat: 'Pasar Induk Blok A No. 12, Jakarta',
      nomor: trx.nomor,
      waktu: tanggalJam(trx.waktu),
      kasir: namaKasir,
      items,
      subtotal: subtotalKotor,
      diskonItem: totalDiskonItem,
      diskonNota: diskonNota,
      diskon: totalDiskon,
      total: trx.total,
      metode: trx.metode.toUpperCase(),
      dibayar: trx.dibayar,
      kembalian: trx.kembalian,
    })

  return (
    <div>
      <div className="mx-auto w-[300px] rounded-lg border border-dashed border-slate-300 bg-white p-4 font-mono text-[11px] text-slate-700">
        <p className="text-center text-sm font-bold">TOKO PASAR JAYA</p>
        <p className="text-center text-[10px] text-slate-500">Pasar Induk Blok A No. 12, Jakarta</p>
        <div className="my-2 border-t border-dashed border-slate-300" />
        <div className="flex justify-between"><span>No</span><span>{trx.nomor}</span></div>
        <div className="flex justify-between"><span>Waktu</span><span>{tanggalJam(trx.waktu)}</span></div>
        <div className="flex justify-between"><span>Kasir</span><span>{namaKasir}</span></div>
        <div className="my-2 border-t border-dashed border-slate-300" />
        {items.map((i, idx) => {
          const hargaAsli = i.qty * i.harga
          const diskon = i.diskonItem || 0
          return (
            <div key={idx} className="mb-1">
              <p>{i.nama}</p>
              <div className="flex justify-between text-slate-500">
                <span>{i.qty} x {angka(i.harga)}</span>
                <span>{angka(hargaAsli)}</span>
              </div>
              {diskon > 0 && (
                <div className="flex justify-between text-slate-500 pl-2 text-[10px]">
                  <span>Diskon</span>
                  <span>-{angka(diskon)}</span>
                </div>
              )}
            </div>
          )
        })}
        <div className="my-2 border-t border-dashed border-slate-300" />
        <div className="flex justify-between"><span>Subtotal</span><span>{angka(subtotalKotor)}</span></div>
        {totalDiskonItem > 0 && diskonNota > 0 ? (
          <>
            <div className="flex justify-between text-slate-500"><span>Diskon Item</span><span>-{angka(totalDiskonItem)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Diskon Nota</span><span>-{angka(diskonNota)}</span></div>
          </>
        ) : totalDiskon > 0 ? (
          <div className="flex justify-between text-slate-500"><span>Diskon</span><span>-{angka(totalDiskon)}</span></div>
        ) : null}
        <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{angka(trx.total)}</span></div>
        <div className="flex justify-between"><span>{trx.metode.toUpperCase()}</span><span>{angka(trx.dibayar)}</span></div>
        <div className="flex justify-between"><span>Kembali</span><span>{angka(trx.kembalian)}</span></div>
        <div className="my-2 border-t border-dashed border-slate-300" />
        <p className="text-center text-[10px]">Terima kasih telah berbelanja</p>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="secondary" onClick={cetak}>Cetak ke Printer Thermal</Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Struk dibuka pada jendela baru berukuran 80mm (simulasi printer ESC/POS).
      </p>
    </div>
  )
}

export function KasirPOS() {
  const navigate = useNavigate()
  const { produk, kategori, shifts, buatTransaksi } = useDataStore()
  const {
    currentUser, cart, diskonNota, addToCart, setQty, setDiskonItem, removeFromCart,
    clearCart, setDiskonNota, offlineMode, queuePending, setShiftId,
  } = useSessionStore()
  const push = useToast((s) => s.push)

  const barcodeRef = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [cari, setCari] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [bayarOpen, setBayarOpen] = useState(false)
  const [metode, setMetode] = useState<MetodePembayaran>('tunai')
  const [dibayar, setDibayar] = useState(0)
  const [struk, setStruk] = useState<Transaksi | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.status)
  const [recentUpdatedIds, setRecentUpdatedIds] = useState<Set<string>>(new Set())
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog')

  const openShift = shifts.find((s) => s.kasirId === currentUser?.id && s.status === 'buka') ?? null

  useEffect(() => {
    if (openShift) setShiftId(openShift.id)
  }, [openShift?.id])

  useEffect(() => {
    const unsubStatus = syncService.onStatusChange((status) => {
      setSyncStatus({ ...status })
    })

    const unsubMutation = syncService.onStockMutation((ev) => {
      const ids = ev.items.map((i) => i.produkId)
      setRecentUpdatedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })

      // Hilangkan efek visual highlight setelah 4 detik
      setTimeout(() => {
        setRecentUpdatedIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
      }, 4000)
    })

    return () => {
      unsubStatus()
      unsubMutation()
    }
  }, [])

  const focusBarcode = () => {
    if (!bayarOpen && !struk) setTimeout(() => barcodeRef.current?.focus(), 60)
  }

  const grid = useMemo(() => {
    const q = cari.toLowerCase()
    return produk
      .filter((p) => p.aktif && p.stok > 0)
      .filter((p) => (!q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) && (!filterKat || p.kategoriId === filterKat))
      .slice(0, 60)
  }, [produk, cari, filterKat])

  const subtotalKotor = cart.reduce((a, c) => a + c.hargaJual * c.qty, 0)
  const totalDiskonItem = cart.reduce((a, c) => a + (c.diskonItem || 0), 0)
  const subtotal = Math.max(0, subtotalKotor - totalDiskonItem)
  const diskonNominal = Math.min(subtotal, Math.max(0, diskonNota))
  const total = Math.max(0, subtotal - diskonNominal)
  const totalItem = cart.reduce((a, c) => a + c.qty, 0)

  const handleBarcode = (e: React.FormEvent) => {
    e.preventDefault()
    const code = barcode.trim()
    if (!code) return
    const p = produk.find((x) => x.barcode === code || x.sku.toLowerCase() === code.toLowerCase())
    if (!p) {
      push({ tipe: 'error', judul: 'Produk tidak ditemukan', pesan: `Kode: ${code}` })
    } else if (p.stok <= 0) {
      push({ tipe: 'peringatan', judul: 'Stok habis', pesan: p.nama })
    } else {
      addToCart(p)
      push({ tipe: 'sukses', judul: p.nama, pesan: 'Ditambahkan ke keranjang' })
    }
    setBarcode('')
  }

  const klikProduk = (p: Produk) => {
    addToCart(p)
    focusBarcode()
  }

  const bukaBayar = () => {
    if (cart.length === 0) {
      push({ tipe: 'peringatan', judul: 'Keranjang masih kosong' })
      return
    }
    setMetode('tunai')
    setDibayar(Math.ceil(total / 5000) * 5000)
    setBayarOpen(true)
  }

  const prosesBayar = () => {
    if (!openShift || !currentUser) return
    if (metode === 'tunai' && dibayar < total) {
      push({ tipe: 'error', judul: 'Pembayaran kurang', pesan: `Kurang ${rupiah(total - dibayar)}` })
      return
    }
    const bayarFinal = metode === 'tunai' ? dibayar : total

    if (offlineMode) {
      queuePending({
        id: `OFF-${Date.now()}`,
        shiftId: openShift.id,
        kasirId: currentUser.id,
        detail: [...cart],
        diskonNota,
        metode,
        dibayar: bayarFinal,
        waktu: new Date().toISOString(),
      })
      push({
        tipe: 'info',
        judul: 'Transaksi disimpan lokal (offline)',
        pesan: 'Akan tersinkron otomatis saat koneksi pulih.',
      })
      clearCart()
      setBayarOpen(false)
      focusBarcode()
      return
    }

    const trx = buatTransaksi({
      shiftId: openShift.id,
      kasirId: currentUser.id,
      detail: cart.map((c, i) => ({
        id: `DTL-${Date.now()}-${i}`,
        produkId: c.produkId,
        namaProduk: c.nama,
        sku: c.sku,
        hargaSatuan: c.hargaJual,
        hargaBeli: c.hargaBeli,
        qty: c.qty,
        diskonItem: c.diskonItem,
        subtotal: Math.max(0, c.hargaJual * c.qty - (c.diskonItem || 0)),
      })),
      diskonNota,
      metode,
      dibayar: bayarFinal,
    })
    clearCart()
    setBayarOpen(false)
    setStruk(trx)
    setMobileView('catalog')
    push({ tipe: 'sukses', judul: 'Transaksi berhasil', pesan: `Nomor ${trx.nomor}` })
  }

  if (!openShift) return <BukaShift />

  return (
    <div className="flex h-full">
      {/* Kiri: katalog produk */}
      <div className={`flex min-w-0 flex-1 flex-col ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-slate-200 bg-white p-3">
          {/* Status Bar Sinkronisasi Multi-Perangkat */}
          <div className="mb-2.5 flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              {syncStatus.mode === 'ws' && syncStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  LAN Realtime ({syncStatus.activePeers} Perangkat)
                </span>
              ) : syncStatus.mode === 'poll' && syncStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100/70 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                  <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                  Web Sync Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-200/60 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                  Lokal Standalone
                </span>
              )}
              <span className="hidden font-mono text-[11px] text-slate-500 sm:inline">
                ID: {syncService.getDeviceId()}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-bold text-white shadow-xs ${
                  openShift.shiftNomor === 1
                    ? 'bg-emerald-600'
                    : openShift.shiftNomor === 2
                      ? 'bg-amber-600'
                      : openShift.shiftNomor === 3
                        ? 'bg-purple-600'
                        : 'bg-cyan-700'
                }`}
              >
                Shift {openShift.shiftNomor || 1}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition"
            >
              <span>📱</span>
              <span>Hubungkan HP (QR)</span>
            </button>
          </div>

          <form onSubmit={handleBarcode} className="mb-2 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
                </svg>
              </span>
              <Input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Pindai barcode atau ketik SKU lalu Enter..."
                className="pl-10 text-base"
                autoFocus
              />
            </div>
          </form>
          <div className="flex gap-2">
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama produk..."
            />
            <Select value={filterKat} onChange={(e) => setFilterKat(e.target.value)} className="w-48">
              <option value="">Semua kategori</option>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {grid.map((p) => {
              const isRecent = recentUpdatedIds.has(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => klikProduk(p)}
                  className={`flex flex-col rounded-xl border bg-white p-3 text-left transition active:scale-[0.98] ${
                    isRecent
                      ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400 shadow-md animate-pulse'
                      : 'border-slate-200 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 min-h-[34px] text-xs font-medium text-slate-700">{p.nama}</p>
                    {isRecent && (
                      <span className="shrink-0 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white shadow-xs">
                        ⚡ Berkurang
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold text-emerald-600">{rupiah(p.hargaJual)}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                    <span
                      className={`text-[10px] font-medium ${
                        isRecent
                          ? 'font-bold text-amber-700'
                          : p.stok <= p.stokMinimum
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}
                    >
                      stok {p.stok}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {grid.length === 0 && (
            <p className="py-16 text-center text-sm text-slate-400">Tidak ada produk yang cocok.</p>
          )}
        </div>

        {/* Bar Checkout Mobile (hanya tampil di HP jika ada item di keranjang) */}
        {cart.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-2.5 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView('cart')}
              className="flex w-full items-center justify-between rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-md active:bg-emerald-700 transition"
            >
              <span className="flex items-center gap-1.5 text-xs">
                <span>🛒</span>
                <span>{totalItem} Item</span>
              </span>
              <span className="text-sm font-bold">{rupiah(total)}</span>
              <span className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-semibold">Buka Keranjang &rarr;</span>
            </button>
          </div>
        )}
      </div>

      {/* Kanan: keranjang (fullscreen di mobile jika aktif, kolom di tablet & desktop) */}
      <div
        className={`flex flex-col border-l border-slate-200 bg-white md:w-[330px] lg:w-[370px] xl:w-[400px] shrink-0 ${
          mobileView === 'catalog' ? 'hidden md:flex' : 'flex flex-1 w-full md:flex-initial'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileView('catalog')}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
              title="Kembali ke katalog"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Keranjang</h3>
              <p className="text-[11px] text-slate-400">{totalItem} item</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-rose-600" onClick={clearCart} disabled={cart.length === 0}>
            Kosongkan
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-400">Belum ada item</p>
              <p className="text-xs text-slate-300">Pindai barcode atau pilih produk</p>
            </div>
          ) : (
            cart.map((c) => (
              <div key={c.produkId} className="mb-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-700">{c.nama}</p>
                    <p className="text-[11px] text-slate-400">{rupiah(c.hargaJual)} / {c.sku}</p>
                  </div>
                  <button onClick={() => removeFromCart(c.produkId)} className="shrink-0 text-slate-300 hover:text-rose-500">×</button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(c.produkId, c.qty - 1)} className="h-7 w-7 rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">−</button>
                    <span className="w-8 text-center text-sm font-semibold">{c.qty}</span>
                    <button onClick={() => setQty(c.produkId, c.qty + 1)} className="h-7 w-7 rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">+</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Pot.</span>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-1.5 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={c.diskonItem || ''}
                        onChange={(e) => setDiskonItem(c.produkId, Number(e.target.value))}
                        placeholder="0"
                        className="w-20 rounded-md border border-slate-200 pl-6 pr-1.5 py-0.5 text-right text-xs"
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {rupiah(Math.max(0, c.hargaJual * c.qty - (c.diskonItem || 0)))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Diskon nota</span>
            <div className="flex items-center gap-1">
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-2 text-xs text-slate-400">Rp</span>
                <input
                  type="number"
                  min="0"
                  value={diskonNota || ''}
                  onChange={(e) => setDiskonNota(Number(e.target.value))}
                  placeholder="0"
                  className="w-28 rounded-md border border-slate-200 pl-7 pr-2 py-0.5 text-right text-xs font-medium"
                />
              </div>
            </div>
          </div>
          <div className="mb-1 flex justify-between text-sm text-slate-500">
            <span>Subtotal</span><span>{rupiah(subtotalKotor)}</span>
          </div>
          {totalDiskonItem > 0 && (
            <div className="mb-1 flex justify-between text-sm text-rose-500">
              <span>Diskon item</span><span>-{rupiah(totalDiskonItem)}</span>
            </div>
          )}
          {diskonNominal > 0 && (
            <div className="mb-1 flex justify-between text-sm text-rose-500">
              <span>Diskon nota</span><span>-{rupiah(diskonNominal)}</span>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-sm font-medium text-slate-600">Total</span>
            <span className="text-xl font-bold text-emerald-600">{rupiah(total)}</span>
          </div>
          <Button className="w-full" size="lg" variant="success" onClick={bukaBayar}>
            Bayar {total > 0 ? `· ${rupiah(total)}` : ''}
          </Button>
          <button
            onClick={() => navigate('/kasir/riwayat')}
            className="mt-2 w-full text-center text-[11px] text-slate-400 hover:text-slate-600"
          >
            Lihat riwayat transaksi shift ini
          </button>
        </div>
      </div>

      {/* Modal pembayaran */}
      <Modal
        open={bayarOpen}
        onClose={() => setBayarOpen(false)}
        title="Pembayaran"
        lebar="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBayarOpen(false)}>Batal</Button>
            <Button variant="success" onClick={prosesBayar} disabled={metode === 'tunai' && dibayar < total}>
              {offlineMode ? 'Simpan Offline' : 'Selesaikan Transaksi'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-900 p-4 text-white">
            <p className="text-xs text-slate-400">Total tagihan</p>
            <p className="text-3xl font-bold">{rupiah(total)}</p>
            <p className="mt-1 text-xs text-slate-400">{totalItem} item &middot; {cart.length} jenis produk</p>
            {offlineMode && (
              <p className="mt-2 inline-block rounded bg-amber-500/20 px-2 py-1 text-[11px] text-amber-300">
                Mode offline: transaksi akan diantrekan
              </p>
            )}
          </div>

          <div>
            <Label>Metode pembayaran</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['tunai', 'qris'] as MetodePembayaran[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMetode(m); if (m !== 'tunai') setDibayar(total) }}
                  className={`rounded-lg border-2 px-3 py-2.5 text-center text-sm font-medium capitalize transition ${metode === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  {m === 'tunai' ? 'Tunai' : 'QRIS'}
                </button>
              ))}
            </div>
          </div>

          {metode === 'tunai' && (
            <>
              <div>
                <Label>Jumlah dibayar</Label>
                <Input
                  type="number"
                  value={dibayar}
                  onChange={(e) => setDibayar(Number(e.target.value))}
                  className="text-lg font-semibold"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[...new Set([total, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000, 50000, 100000])]
                  .filter((v) => v >= total)
                  .slice(0, 5)
                  .map((v) => (
                    <button
                      key={v}
                      onClick={() => setDibayar(v)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {angka(v)}
                    </button>
                  ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                <span className="text-sm font-medium text-emerald-700">Kembalian</span>
                <span className="text-lg font-bold text-emerald-700">{rupiah(Math.max(0, dibayar - total))}</span>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal struk */}
      <Modal
        open={!!struk}
        onClose={() => { setStruk(null); focusBarcode() }}
        title="Transaksi Berhasil"
        lebar="max-w-md"
        footer={<Button onClick={() => { setStruk(null); focusBarcode() }}>Transaksi Baru</Button>}
      >
        {struk && <StrukView trx={struk} namaKasir={currentUser?.nama ?? ''} />}
      </Modal>

      {/* Modal QR Code untuk Multi-Device Demo */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="📱 Hubungkan HP Kasir Lain (Multi-Device Demo)"
        lebar="max-w-md"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-600">
            Arahkan kamera HP ke QR Code di bawah untuk membuka sistem kasir di HP Anda.
            Pastikan HP dan laptop terhubung ke <b>WiFi / Hotspot yang sama</b>.
          </p>

          <div className="mx-auto flex w-fit flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.href : '',
              )}`}
              alt="QR Code Akses HP"
              className="h-44 w-44 rounded-lg bg-white p-1"
            />
            <p className="mt-3 font-mono text-xs font-semibold text-brand-700 break-all">
              {typeof window !== 'undefined' ? window.location.href : ''}
            </p>
          </div>

          <div className="rounded-lg bg-emerald-50 p-3 text-left text-xs text-emerald-800 border border-emerald-200">
            <p className="font-semibold">💡 Tips Demo Multi-Kasir:</p>
            <ul className="mt-1 list-disc pl-4 space-y-1 text-[11px]">
              <li>Buka link ini di HP Kasir 1 dan HP Kasir 2.</li>
              <li>Lakukan transaksi checkout di HP Kasir 1.</li>
              <li>Lihat angka stok di HP Kasir 2 langsung berkurang realtime dengan badge ⚡ Berkurang!</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.href)
                  push({ tipe: 'sukses', judul: 'Link Disalin', pesan: window.location.href })
                }
              }}
            >
              Salin URL
            </Button>
            <Button variant="primary" onClick={() => setQrModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
