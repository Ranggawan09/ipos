import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MetodePembayaran, Produk, SatuanBertingkat, Transaksi, VarianBobot } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah, tanggalJam } from '@/lib/format'
import { cetakStruk } from '@/lib/print'
import { Button, CurrencyInput, Input, Label, Modal, Select } from '@/components/ui'
import { syncService, type SyncStatus } from '@/lib/syncService'

function BukaShift() {
  const { bukaShift } = useDataStore()
  const { currentUser, setShiftId, selectedShiftNomor, setSelectedShiftNomor } = useSessionStore()
  const push = useToast((s) => s.push)
  const [saldo, setSaldo] = useState(200000)
  const [shiftNo, setShiftNo] = useState<1 | 2>((selectedShiftNomor === 2 ? 2 : 1))

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
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as const).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setShiftNo(num)}
                className={`flex flex-col items-center justify-center border py-2.5 text-xs font-semibold transition ${
                  shiftNo === num
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Shift {num}</span>
                <span className={`text-[10px] ${shiftNo === num ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {num === 1 ? 'Pagi (08:00 - 15:00)' : 'Siang / Malam (15:00 - 22:00)'}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <Label>Saldo kas awal (modal laci)</Label>
          <CurrencyInput value={saldo} onChange={setSaldo} />
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
  const { produk } = useDataStore()
  const subtotalKotor = trx.detail.reduce((a, d) => a + d.qty * d.hargaSatuan, 0)
  const totalDiskonItem = trx.detail.reduce((a, d) => a + (d.diskonItem || 0), 0)
  const diskonNota = trx.diskonNominal || 0
  const totalDiskon = totalDiskonItem + diskonNota
  const totalItem = trx.detail.reduce((a, d) => a + d.qty, 0)

  const items = trx.detail.map((d) => {
    const p = produk.find((x) => x.id === d.produkId)
    const satuan = d.satuan || (d.varianId ? 'pcs' : (p?.satuan || 'pcs'))
    return {
      nama: d.namaProduk,
      qty: d.qty,
      satuan,
      harga: d.hargaSatuan,
      diskonItem: d.diskonItem,
      subtotal: d.subtotal,
    }
  })

  const cetak = () =>
    cetakStruk({
      namaToko: 'TOKO PASAR JAYA',
      alamat: 'Pasar Induk Blok A No. 12, Jakarta',
      nomor: trx.nomor,
      waktu: tanggalJam(trx.waktu),
      kasir: namaKasir,
      items,
      totalItem,
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
                <span>{i.qty} {i.satuan} x {angka(i.harga)}</span>
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
        <div className="flex justify-between"><span>Jumlah Item</span><span>{totalItem}</span></div>
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
  const [varianModalProduk, setVarianModalProduk] = useState<Produk | null>(null)

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
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
    if (isTouch) return
    if (!bayarOpen && !struk) setTimeout(() => barcodeRef.current?.focus(), 60)
  }

  useEffect(() => {
    focusBarcode()
  }, [])

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
    const p = produk.find((x) =>
      x.barcode === code ||
      x.sku.toLowerCase() === code.toLowerCase() ||
      x.satuanBertingkat?.some((s) => s.barcode && s.barcode === code),
    )
    if (!p) {
      push({ tipe: 'error', judul: 'Produk tidak ditemukan', pesan: `Kode: ${code}` })
    } else if (p.stok <= 0) {
      push({ tipe: 'peringatan', judul: 'Stok habis', pesan: p.nama })
    } else {
      const matchedTier = p.satuanBertingkat?.find((s) => s.barcode === code)
      if (matchedTier) {
        if (p.stok < matchedTier.multiplierToBase) {
          push({
            tipe: 'peringatan',
            judul: `Stok tidak cukup untuk 1 ${matchedTier.namaSatuan}`,
            pesan: p.nama,
          })
        } else {
          addToCart(p, 1, undefined, matchedTier)
          push({
            tipe: 'sukses',
            judul: `${p.nama} (${matchedTier.namaSatuan})`,
            pesan: 'Ditambahkan ke keranjang',
          })
        }
      } else if ((p.varian && p.varian.length > 0) || (p.satuanBertingkat && p.satuanBertingkat.length > 0)) {
        setVarianModalProduk(p)
      } else {
        addToCart(p)
        push({ tipe: 'sukses', judul: p.nama, pesan: 'Ditambahkan ke keranjang' })
      }
    }
    setBarcode('')
  }

  const klikProduk = (p: Produk) => {
    // Tutup keyboard jika ada input yang sedang aktif dan jangan memicu fokus ke input barcode
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    if ((p.varian && p.varian.length > 0) || (p.satuanBertingkat && p.satuanBertingkat.length > 0)) {
      setVarianModalProduk(p)
    } else {
      addToCart(p)
    }
  }

  const pilihVarian = (p: Produk, v: VarianBobot) => {
    addToCart(p, 1, v)
    setVarianModalProduk(null)
    push({ tipe: 'sukses', judul: `${p.nama} (${v.nama})`, pesan: 'Ditambahkan ke keranjang' })
  }

  const pilihSatuanBertingkat = (p: Produk, s: SatuanBertingkat) => {
    addToCart(p, 1, undefined, s)
    setVarianModalProduk(null)
    push({
      tipe: 'sukses',
      judul: `${p.nama} (${s.namaSatuan})`,
      pesan: `Ditambahkan ke keranjang (1 ${s.namaSatuan} = ${s.multiplierToBase} ${p.satuan || 'pcs'})`,
    })
  }

  const pilihSatuanDasar = (p: Produk) => {
    addToCart(p, 1)
    setVarianModalProduk(null)
    push({
      tipe: 'sukses',
      judul: `${p.nama} (1 ${p.satuan || 'pcs'})`,
      pesan: 'Ditambahkan ke keranjang',
    })
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
        satuan: c.satuan || 'pcs',
        diskonItem: c.diskonItem,
        subtotal: Math.max(0, c.hargaJual * c.qty - (c.diskonItem || 0)),
        varianId: c.varianId,
        namaVarian: c.namaVarian,
        bobot: c.bobot,
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
                  openShift.shiftNomor === 1 ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              >
                Shift {openShift.shiftNomor || 1}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/kasir/pengeluaran')}
                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100 hover:border-rose-300 transition"
                title="Buka halaman pengeluaran kas kecil kasir"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z" />
                </svg>
                <span>Kas Keluar</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition"
              >
                Hubungkan HP (QR)
              </button>
            </div>
          </div>

          <form onSubmit={handleBarcode} className="mb-2 flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Pindai barcode atau ketik SKU lalu tekan Enter..."
                className="text-base"
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
              const hasVarian = p.varian && p.varian.length > 0
              const hasSatuan = p.satuanBertingkat && p.satuanBertingkat.length > 0
              return (
                <button
                  key={p.id}
                  onClick={() => klikProduk(p)}
                  className={`flex flex-col rounded-xl border bg-white p-3 text-left transition active:scale-[0.98] ${
                    isRecent
                      ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400 shadow-md animate-pulse'
                      : hasSatuan
                        ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md'
                        : hasVarian
                          ? 'border-indigo-200 hover:border-indigo-400 hover:shadow-md'
                          : 'border-slate-200 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 min-h-[34px] text-xs font-medium text-slate-700">{p.nama}</p>
                    {isRecent && (
                      <span className="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-xs">
                        Stok Berubah
                      </span>
                    )}
                  </div>
                  {hasSatuan ? (
                    <>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                          Multi-Satuan
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {p.satuanBertingkat!.length + 1} satuan
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                        {rupiah(p.hargaJual)} – {rupiah(Math.max(...p.satuanBertingkat!.map((s) => s.hargaJual)))}
                      </p>
                    </>
                  ) : hasVarian ? (
                    <>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                          Varian Bobot
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {p.varian!.length} pilihan
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                        {rupiah(Math.min(...p.varian!.map((v) => v.hargaJual)))} – {rupiah(Math.max(...p.varian!.map((v) => v.hargaJual)))}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-bold text-emerald-600">{rupiah(p.hargaJual)}</p>
                  )}
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
                      stok {p.stok} {p.satuan || 'pcs'}
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
              <span className="text-xs font-semibold">{totalItem} Item</span>
              <span className="text-sm font-bold">{rupiah(total)}</span>
              <span className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold">Buka Keranjang</span>
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
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 md:hidden"
              title="Kembali ke katalog"
            >
              Kembali
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
            cart.map((c) => {
              const itemKey = c.cartItemId || c.produkId
              return (
                <div key={itemKey} className="mb-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-700">{c.nama}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-slate-400">{rupiah(c.hargaJual)} / {c.sku}</p>
                        {c.namaVarian && (
                          <span className="inline-flex items-center rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-semibold text-indigo-700">
                            {c.namaVarian}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(itemKey)} className="shrink-0 text-slate-300 hover:text-rose-500">×</button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(itemKey, c.qty - 1)} className="h-7 w-7 rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">−</button>
                      <span className="w-8 text-center text-sm font-semibold">{c.qty}</span>
                      <button onClick={() => setQty(itemKey, c.qty + 1)} className="h-7 w-7 rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Pot.</span>
                      <CurrencyInput
                        sizeVariant="sm"
                        value={c.diskonItem || 0}
                        onChange={(val) => setDiskonItem(itemKey, val)}
                        wrapperClassName="w-24"
                        className="text-right py-0.5 rounded-md border-slate-200"
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {rupiah(Math.max(0, c.hargaJual * c.qty - (c.diskonItem || 0)))}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Diskon nota</span>
            <CurrencyInput
              sizeVariant="sm"
              value={diskonNota}
              onChange={setDiskonNota}
              wrapperClassName="w-32"
              className="text-right py-0.5 font-medium rounded-md border-slate-200"
            />
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
            Bayar {total > 0 ? `(${rupiah(total)})` : ''}
          </Button>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <button
              onClick={() => navigate('/kasir/riwayat')}
              className="hover:text-slate-600 hover:underline"
            >
              Riwayat Transaksi
            </button>
            <button
              onClick={() => navigate('/kasir/pengeluaran')}
              className="font-medium text-rose-600 hover:underline"
            >
              + Pengeluaran Kasir
            </button>
          </div>
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
            <p className="mt-1 text-xs text-slate-400">{totalItem} item | {cart.length} jenis produk</p>
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
                <CurrencyInput
                  sizeVariant="lg"
                  value={dibayar}
                  onChange={setDibayar}
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

      {/* Modal Pemilihan Varian Bobot */}
      <Modal
        open={!!varianModalProduk}
        onClose={() => setVarianModalProduk(null)}
        title={varianModalProduk ? `Pilih Varian — ${varianModalProduk.nama}` : 'Pilih Varian'}
        lebar="max-w-lg"
      >
        {varianModalProduk && (() => {
          const p = produk.find((x) => x.id === varianModalProduk.id) ?? varianModalProduk
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
                <div>
                  <p className="text-xs text-slate-400">Total Stok Tersedia</p>
                  <p className="text-2xl font-bold">{angka(p.stok)} <span className="text-sm font-medium text-slate-400">{p.satuan}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">SKU</p>
                  <p className="font-mono text-sm font-semibold">{p.sku}</p>
                </div>
              </div>

              <div className="grid gap-2">
                {p.varian?.map((v) => {
                  const kuotaBungkus = Math.floor(p.stok / v.bobot)
                  const disabled = kuotaBungkus <= 0
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => pilihVarian(p, v)}
                      className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                        disabled
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                          : 'border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md active:scale-[0.98]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">{v.nama}</p>
                        <p className="text-lg font-bold text-emerald-600">{rupiah(v.hargaJual)}</p>
                      </div>
                      <div className="text-right">
                        {disabled ? (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            Stok Tidak Cukup
                          </span>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500">Maks. bisa dibuat</p>
                            <p className="text-lg font-bold text-indigo-600">{kuotaBungkus} <span className="text-xs font-medium text-slate-500">bungkus</span></p>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setVarianModalProduk(null)}>Batal</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal QR Code untuk Multi-Device Demo */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Hubungkan Perangkat Kasir Tambahan"
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

          <div className="rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-700 border border-slate-200">
            <p className="font-semibold text-slate-800">Panduan Sinkronisasi Multi-Kasir:</p>
            <ul className="mt-1 list-disc pl-4 space-y-1 text-[11px] text-slate-600">
              <li>Buka tautan ini pada perangkat kasir kedua.</li>
              <li>Setiap transaksi yang diselesaikan langsung memperbarui sisa stok secara realtime di semua layar.</li>
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

      {/* Modal Pemilihan Satuan Bertingkat & Varian */}
      <Modal
        open={!!varianModalProduk}
        onClose={() => setVarianModalProduk(null)}
        title={
          varianModalProduk?.satuanBertingkat && varianModalProduk.satuanBertingkat.length > 0
            ? `Pilih Satuan: ${varianModalProduk?.nama || ''}`
            : `Pilih Ukuran Varian: ${varianModalProduk?.nama || ''}`
        }
        lebar="max-w-lg"
      >
        {varianModalProduk && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div>
                <p className="text-xs text-slate-500 font-medium">Stok Fisik Tersedia (Satuan Terkecil)</p>
                <p className="text-lg font-bold text-slate-800">
                  {varianModalProduk.stok} <span className="text-sm font-normal text-slate-600">{varianModalProduk.satuan}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Shared Pool
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Potong otomatis ke satuan dasar</p>
              </div>
            </div>

            {/* Opsi Kemasan Satuan Bertingkat & Pecahan */}
            {varianModalProduk.satuanBertingkat && varianModalProduk.satuanBertingkat.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Pilih Ukuran / Kemasan Penjualan:</p>

                <div className="space-y-2.5">
                  {(() => {
                    const baseItem = {
                      id: 'base-unit',
                      namaSatuan: varianModalProduk.satuan || 'pcs',
                      isi: 1,
                      satuanTurunan: varianModalProduk.satuan || 'pcs',
                      multiplierToBase: 1,
                      hargaBeli: varianModalProduk.hargaBeli,
                      hargaJual: varianModalProduk.hargaJual,
                      marginPersen: 0,
                      isBase: true as const,
                      isPecahan: false,
                    }

                    const allTiers = [
                      baseItem,
                      ...varianModalProduk.satuanBertingkat.map((t) => ({ ...t, isBase: false as const })),
                    ].sort((a, b) => a.multiplierToBase - b.multiplierToBase)

                    return allTiers.map((tier) => {
                      const maxQuota = Math.floor(varianModalProduk.stok / tier.multiplierToBase)
                      const cukup = maxQuota > 0

                      return (
                        <div
                          key={tier.id}
                          className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                            cukup
                              ? 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs'
                              : 'border-slate-200 bg-slate-50/70 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm capitalize">
                                {tier.namaSatuan}
                              </span>
                              {tier.isBase ? (
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                                  Satuan Dasar / Eceran
                                </span>
                              ) : tier.isPecahan ? (
                                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
                                  Pecahan {tier.rasio === 0.5 ? '1/2' : tier.rasio === 0.25 ? '1/4' : `${Math.round((tier.rasio || 0) * 100)}%`} {tier.indukSatuan} ({tier.multiplierToBase} {varianModalProduk.satuan})
                                </span>
                              ) : (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                  isi {tier.isi} {tier.satuanTurunan} ({tier.multiplierToBase} {varianModalProduk.satuan})
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-bold text-emerald-600">
                              {rupiah(tier.hargaJual)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {cukup
                                ? `Tersedia maks. ~${maxQuota} ${tier.namaSatuan}`
                                : `Stok tidak cukup (butuh ${tier.multiplierToBase} ${varianModalProduk.satuan})`}
                            </p>
                          </div>

                          <Button
                            variant={cukup ? 'primary' : 'secondary'}
                            disabled={!cukup}
                            size="sm"
                            onClick={() => {
                              if (tier.isBase) {
                                pilihSatuanDasar(varianModalProduk)
                              } else {
                                pilihSatuanBertingkat(varianModalProduk, tier)
                              }
                            }}
                          >
                            + Pilih
                          </Button>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            ) : varianModalProduk.varian && varianModalProduk.varian.length > 0 ? (
              /* Opsi Varian Bobot Khusus Barang Curah */
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Pilih Varian Kemasan Curah:</p>
                <div className="space-y-2.5">
                  {varianModalProduk.varian.map((v) => {
                    const maxKemasan = Math.floor(varianModalProduk.stok / v.bobot)
                    const cukup = maxKemasan > 0

                    return (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                          cukup
                            ? 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs'
                            : 'border-slate-200 bg-slate-50/70 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{v.nama}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                              {v.bobot} {varianModalProduk.satuan}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-bold text-emerald-600">{rupiah(v.hargaJual)}</p>
                          <p className="text-[11px] text-slate-400">
                            {cukup ? `Tersedia maks. ~${maxKemasan} bungkus` : 'Stok curah tidak cukup'}
                          </p>
                        </div>

                        <Button
                          variant={cukup ? 'primary' : 'secondary'}
                          disabled={!cukup}
                          size="sm"
                          onClick={() => pilihVarian(varianModalProduk, v)}
                        >
                          + Pilih
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
