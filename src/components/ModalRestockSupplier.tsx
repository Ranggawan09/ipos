import { useEffect, useMemo, useState } from 'react'
import type { Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam } from '@/lib/format'
import { cetakPurchaseOrder, cetakSemuaPurchaseOrder, type POData, type POItem } from '@/lib/print'
import { Badge, Button, Input, Modal, Select } from '@/components/ui'

export function ModalRestockSupplier({
  open,
  onClose,
  targetSupplierId,
}: {
  open: boolean
  onClose: () => void
  targetSupplierId?: string | null
}) {
  const { produk, supplier, simpanProduk } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  // Filter supplier yang sedang ditampilkan
  const [filterSupplier, setFilterSupplier] = useState<string>('')

  // Map kuantitas pesanan restock yang dapat diedit oleh user: [produkId]: qty
  const [qtyOrders, setQtyOrders] = useState<Record<string, number>>({})

  // State untuk form Restock Manual
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualSupplierId, setManualSupplierId] = useState<string>('')
  const [manualProdukId, setManualProdukId] = useState<string>('')
  const [manualQty, setManualQty] = useState<number>(1)

  // Daftar item restock manual yang ditambahkan: { produkId: string, supplierId: string }
  const [manualItems, setManualItems] = useState<{ produkId: string; supplierId: string }[]>([])

  // Daftar produk yang dihapus/dikecualikan dari pesanan restock kali ini
  const [excludedIds, setExcludedIds] = useState<string[]>([])

  // Sinkronkan state saat modal dibuka / ditutup
  useEffect(() => {
    if (open) {
      setFilterSupplier(targetSupplierId || '')
      if (targetSupplierId) {
        setManualSupplierId(targetSupplierId)
      } else if (supplier.length > 0) {
        setManualSupplierId(supplier[0].id)
      }
    } else {
      setShowManualForm(false)
      setManualItems([])
      setExcludedIds([])
      setQtyOrders({})
      setManualProdukId('')
      setManualQty(1)
    }
  }, [open, targetSupplierId, supplier])

  // Semua barang dengan stok menipis (kritis)
  const itemsKritis = useMemo(() => {
    return produk.filter((p) => p.aktif && p.stok <= p.stokMinimum)
  }, [produk])

  // Dapatkan qty order untuk produk (default: stok minimum dikurangi stok saat ini, minimal 1)
  const getQtyOrder = (p: Produk) => {
    if (qtyOrders[p.id] !== undefined) {
      return qtyOrders[p.id]
    }
    const diff = p.stokMinimum - p.stok
    const ideal = diff > 0 ? diff : 1
    return ideal
  }

  const ubahQty = (produkId: string, val: number) => {
    setQtyOrders((prev) => ({
      ...prev,
      [produkId]: Math.max(1, Math.floor(val || 1)),
    }))
  }

  // Pengelompokan barang restock per Supplier (gabungan barang kritis + barang manual)
  const { kelompokSupplier, tanpaSupplier } = useMemo(() => {
    const map = new Map<string, { supplier: (typeof supplier)[0]; items: Produk[] }>()

    supplier.forEach((s) => {
      // 1. Barang kritis yang dipasok oleh supplier ini (dan tidak di-exclude)
      const kritisItems = itemsKritis.filter(
        (p) => p.supplierId === s.id && !excludedIds.includes(p.id),
      )

      // 2. Barang manual yang ditambahkan ke supplier ini (dan tidak di-exclude)
      const manualProds = manualItems
        .filter((m) => m.supplierId === s.id && !excludedIds.includes(m.produkId))
        .map((m) => produk.find((p) => p.id === m.produkId))
        .filter((p): p is Produk => Boolean(p && p.aktif))

      // Gabungkan tanpa duplikasi ID
      const itemMap = new Map<string, Produk>()
      kritisItems.forEach((p) => itemMap.set(p.id, p))
      manualProds.forEach((p) => itemMap.set(p.id, p))

      const items = Array.from(itemMap.values())
      if (items.length > 0) {
        map.set(s.id, { supplier: s, items })
      }
    })

    // Barang kritis yang belum terikat supplier dan belum dimasukkan manual
    const manualAssignedIds = new Set(manualItems.map((m) => m.produkId))
    const tanpa = itemsKritis.filter(
      (p) =>
        (!p.supplierId || !supplier.some((s) => s.id === p.supplierId)) &&
        !manualAssignedIds.has(p.id) &&
        !excludedIds.includes(p.id),
    )

    return {
      kelompokSupplier: Array.from(map.values()),
      tanpaSupplier: tanpa,
    }
  }, [itemsKritis, manualItems, excludedIds, supplier, produk])

  // Kelompok supplier yang aktif ditampilkan (bisa difilter)
  const kelompokTampil = useMemo(() => {
    if (!filterSupplier) return kelompokSupplier
    return kelompokSupplier.filter((k) => k.supplier.id === filterSupplier)
  }, [kelompokSupplier, filterSupplier])

  const supplierAktif = useMemo(() => {
    if (!filterSupplier) return null
    return supplier.find((s) => s.id === filterSupplier)
  }, [supplier, filterSupplier])

  // Seluruh barang yang sedang tampil di modal
  const allItemsTampil = useMemo(() => {
    return kelompokTampil.flatMap((k) => k.items)
  }, [kelompokTampil])

  // Hitung total estimasi untuk supplier yang ditampilkan
  const totalItemTampil = useMemo(() => {
    return allItemsTampil.reduce((a, p) => a + getQtyOrder(p), 0)
  }, [allItemsTampil, qtyOrders])

  const totalBiayaTampil = useMemo(() => {
    return allItemsTampil.reduce((a, p) => a + getQtyOrder(p) * p.hargaBeli, 0)
  }, [allItemsTampil, qtyOrders])

  // Produk yang tersedia untuk dipilih di Form Restock Manual
  const prodsSupplierIni = useMemo(() => {
    if (!manualSupplierId) return []
    return produk.filter((p) => p.aktif && p.supplierId === manualSupplierId)
  }, [produk, manualSupplierId])

  const prodsLainnya = useMemo(() => {
    if (!manualSupplierId) return []
    return produk.filter((p) => p.aktif && p.supplierId !== manualSupplierId)
  }, [produk, manualSupplierId])

  const produkTerpilihManual = useMemo(() => {
    return produk.find((p) => p.id === manualProdukId) || null
  }, [produk, manualProdukId])

  // Handler saat memilih produk di form restock manual
  const handlePilihManualProduk = (id: string) => {
    setManualProdukId(id)
    const p = produk.find((x) => x.id === id)
    if (p) {
      const diff = p.stokMinimum - p.stok
      setManualQty(diff > 0 ? diff : 1)
    }
  }

  // Handler submit penambahan barang restock manual
  const handleTambahRestockManual = () => {
    if (!manualSupplierId || !manualProdukId) {
      push({
        tipe: 'peringatan',
        judul: 'Data Belum Lengkap',
        pesan: 'Pilih supplier dan barang yang ingin direstock.',
      })
      return
    }

    const prod = produk.find((p) => p.id === manualProdukId)
    const sup = supplier.find((s) => s.id === manualSupplierId)
    if (!prod || !sup) return

    // Kembalikan jika sebelumnya sempat di-exclude/dihapus
    setExcludedIds((prev) => prev.filter((id) => id !== manualProdukId))

    // Tambahkan ke daftar manual jika belum ada pada supplier ini
    setManualItems((prev) => {
      const exists = prev.some(
        (m) => m.produkId === manualProdukId && m.supplierId === manualSupplierId,
      )
      if (exists) return prev
      return [...prev, { produkId: manualProdukId, supplierId: manualSupplierId }]
    })

    // Set kuantitas restock
    ubahQty(manualProdukId, manualQty)

    // Jika produk belum memiliki supplier, hubungkan otomatis ke supplier ini
    if (!prod.supplierId) {
      simpanProduk({
        ...prod,
        supplierId: manualSupplierId,
      })
    }

    // Jika sedang difilter ke supplier berbeda, alihkan filter ke supplier yang baru ditambah
    if (filterSupplier && filterSupplier !== manualSupplierId) {
      setFilterSupplier(manualSupplierId)
    }

    push({
      tipe: 'sukses',
      judul: 'Barang Ditambahkan ke Restock',
      pesan: `${prod.nama} (${manualQty} ${prod.satuan}) berhasil masuk ke daftar restock ${sup.nama}.`,
    })

    // Reset pilihan produk agar user bisa langsung menambah barang berikutnya jika mau
    setManualProdukId('')
    setManualQty(1)
  }

  // Handler menghapus barang dari daftar pesanan restock
  const handleHapusItem = (produkId: string, supplierId: string) => {
    const prod = produk.find((p) => p.id === produkId)
    setManualItems((prev) =>
      prev.filter((m) => !(m.produkId === produkId && m.supplierId === supplierId)),
    )
    setExcludedIds((prev) => [...prev, produkId])
    push({
      tipe: 'info',
      judul: 'Dihapus dari Daftar Restock',
      pesan: `${prod?.nama || 'Barang'} dihapus dari daftar pesanan restock.`,
    })
  }

  // Builder data PO untuk cetak PDF
  const buildPOData = (
    sup: (typeof supplier)[0],
    items: Produk[],
    poIndex = 1,
  ): POData => {
    const tgl = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const nomorPO = `PO/${tgl}/${sup.id}/${String(poIndex).padStart(3, '0')}`

    const poItems: POItem[] = items.map((p) => {
      const qty = getQtyOrder(p)
      return {
        nama: p.nama,
        sku: p.sku,
        satuan: p.satuan,
        stokSaatIni: p.stok,
        stokMin: p.stokMinimum,
        qtyOrder: qty,
        hargaSatuan: p.hargaBeli,
        subtotal: qty * p.hargaBeli,
      }
    })

    return {
      nomorPO,
      tanggal: tanggalJam(new Date().toISOString()),
      supplier: {
        nama: sup.nama,
        kontak: sup.kontak,
        telepon: sup.telepon,
        alamat: sup.alamat,
      },
      petugas: currentUser?.nama ?? 'Admin Pengadaan Toko',
      catatan: 'Pesanan restock barang ke supplier.',
      items: poItems,
    }
  }

  // Aksi Cetak PO Satuan
  const handleCetakPO = (sup: (typeof supplier)[0], items: Produk[]) => {
    const po = buildPOData(sup, items)
    cetakPurchaseOrder(po)
    push({
      tipe: 'sukses',
      judul: 'Membuka Surat Pesanan PO',
      pesan: `PO untuk ${sup.nama} siap dicetak / simpan ke PDF.`,
    })
  }

  // Aksi Cetak Seluruh PO Sekaligus (dari kelompok yang sedang tampil)
  const handleCetakSemuaPO = () => {
    if (kelompokTampil.length === 0) {
      push({ tipe: 'peringatan', judul: 'Tidak ada pesanan restock untuk dicetak' })
      return
    }
    const pos = kelompokTampil.map((g, idx) => buildPOData(g.supplier, g.items, idx + 1))
    cetakSemuaPurchaseOrder(pos)
    push({
      tipe: 'sukses',
      judul: 'Mencetak Surat Pesanan PO',
      pesan: `${pos.length} Surat Pesanan PO siap dicetak / disimpan ke PDF.`,
    })
  }

  // Hubungkan barang yang belum ada supplier
  const hubungkanSupplier = (produkTarget: Produk, supplierId: string) => {
    if (!supplierId) return
    simpanProduk({
      ...produkTarget,
      supplierId,
    })
    const s = supplier.find((x) => x.id === supplierId)
    push({
      tipe: 'sukses',
      judul: 'Supplier berhasil dihubungkan',
      pesan: `${produkTarget.nama} kini dipasok oleh ${s?.nama}`,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        supplierAktif
          ? `Restock & PO: ${supplierAktif.nama}`
          : 'Daftar Restock & PO Supplier'
      }
      lebar="max-w-4xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {kelompokTampil.length} Supplier | {allItemsTampil.length} Produk Restock | Total Estimasi:{' '}
            <span className="font-bold text-slate-800">{rupiah(totalBiayaTampil)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Tutup
            </Button>
            {kelompokTampil.length > 0 && (
              <Button size="sm" onClick={handleCetakSemuaPO}>
                {kelompokTampil.length === 1 ? 'Cetak PO Ini (PDF)' : 'Cetak Semua PO (PDF)'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner Ringkasan & Filter */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {allItemsTampil.length === 0
                  ? supplierAktif
                    ? `Stok Barang dari ${supplierAktif.nama} Aman`
                    : 'Semua Stok Barang Toko Aman'
                  : `${allItemsTampil.length} Barang dalam Daftar Pesanan Restock (PO)`}
              </h3>
              <p className="mt-0.5 text-xs text-amber-700">
                {supplierAktif
                  ? `Daftar barang dipasok oleh rekanan ${supplierAktif.nama} untuk pembuatan Surat Pesanan (PO).`
                  : 'Daftar barang dikelompokkan sesuai data rekanan supplier terdaftar untuk memudahkan pengadaan dan cetak Surat Pesanan (PO).'}
              </p>
            </div>
            {allItemsTampil.length > 0 && (
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-[11px] text-amber-600">Total Unit Pesan</p>
                  <p className="text-base font-bold text-amber-900">{totalItemTampil} Unit</p>
                </div>
                <div className="border-l border-amber-300 pl-4">
                  <p className="text-[11px] text-amber-600">Estimasi Total Biaya</p>
                  <p className="text-base font-bold text-amber-900">{rupiah(totalBiayaTampil)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bar Filter Supplier & Tombol Restock Manual */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/80 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-900">Filter Supplier:</span>
              <Select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-56 text-xs py-1 bg-white border-amber-300"
              >
                <option value="">Semua Supplier ({kelompokSupplier.length})</option>
                {supplier.map((s) => {
                  const supItems = kelompokSupplier.find((k) => k.supplier.id === s.id)?.items.length || 0
                  return (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({supItems} item)
                    </option>
                  )
                })}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showManualForm ? 'secondary' : 'primary'}
                className="text-xs"
                onClick={() => {
                  if (!showManualForm && filterSupplier) {
                    setManualSupplierId(filterSupplier)
                  }
                  setShowManualForm(!showManualForm)
                }}
              >
                {showManualForm ? '✕ Tutup Form' : '+ Restock Manual'}
              </Button>

              {filterSupplier && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-amber-800 hover:bg-amber-100"
                  onClick={() => setFilterSupplier('')}
                >
                  Tampilkan Semua Supplier
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Panel Form Restock Manual */}
        {showManualForm && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-brand-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  +
                </span>
                <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wide">
                  Restock Manual (Pilih Supplier & Barang)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              {/* Pilih Supplier */}
              <div className="sm:col-span-4">
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Pilih Supplier <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={manualSupplierId}
                  onChange={(e) => {
                    setManualSupplierId(e.target.value)
                    setManualProdukId('')
                  }}
                  className="w-full bg-white text-xs"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {supplier.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Pilih Barang */}
              <div className="sm:col-span-5">
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Pilih Barang <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={manualProdukId}
                  onChange={(e) => handlePilihManualProduk(e.target.value)}
                  disabled={!manualSupplierId}
                  className="w-full bg-white text-xs disabled:bg-slate-100"
                >
                  <option value="">-- Pilih Barang yang Akan Direstock --</option>
                  {prodsSupplierIni.length > 0 && (
                    <optgroup label="Barang dari Supplier Ini">
                      {prodsSupplierIni.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} [Stok: {p.stok} / Min: {p.stokMinimum} {p.satuan}]
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {prodsLainnya.length > 0 && (
                    <optgroup label="Barang Lainnya / Belum Terikat">
                      {prodsLainnya.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} [Stok: {p.stok} / Min: {p.stokMinimum} {p.satuan}]
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </div>

              {/* Input Qty & Tombol Tambah */}
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Qty Restock {produkTerpilihManual ? `(${produkTerpilihManual.satuan})` : ''}
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={manualQty}
                    onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!manualProdukId}
                    className="w-full bg-white text-center text-xs font-bold"
                  />
                  <Button
                    size="sm"
                    onClick={handleTambahRestockManual}
                    disabled={!manualSupplierId || !manualProdukId}
                    className="shrink-0 text-xs"
                  >
                    + Tambah
                  </Button>
                </div>
              </div>
            </div>

            {/* Info ringkas barang yang dipilih */}
            {produkTerpilihManual && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-[11px] text-slate-600">
                <div>
                  SKU: <span className="font-mono font-medium text-slate-800">{produkTerpilihManual.sku}</span> | Stok:{' '}
                  <span
                    className={`font-semibold ${
                      produkTerpilihManual.stok <= produkTerpilihManual.stokMinimum
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {produkTerpilihManual.stok} {produkTerpilihManual.satuan}
                  </span>{' '}
                  | Min:{' '}
                  <span className="font-semibold text-slate-700">
                    {produkTerpilihManual.stokMinimum} {produkTerpilihManual.satuan}
                  </span>
                </div>
                <div>
                  Harga Beli:{' '}
                  <span className="font-semibold text-slate-800">{rupiah(produkTerpilihManual.hargaBeli)}</span> | Subtotal:{' '}
                  <span className="font-bold text-brand-700">{rupiah(manualQty * produkTerpilihManual.hargaBeli)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {kelompokTampil.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-600">
              ✓
            </div>
            <h4 className="text-sm font-semibold text-slate-800">
              {supplierAktif
                ? `Tidak ada barang dari ${supplierAktif.nama} dalam daftar restock`
                : 'Tidak ada barang yang perlu direstock'}
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Seluruh stok produk berada di batas aman. Anda dapat memesan barang ke supplier dengan memilih supplier dan barang secara manual.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (filterSupplier) setManualSupplierId(filterSupplier)
                  setShowManualForm(true)
                }}
              >
                + Restock Manual Sekarang
              </Button>
              {filterSupplier && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setFilterSupplier('')}
                >
                  Lihat Supplier Lain
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Daftar Kelompok per Supplier */}
            {kelompokTampil.map(({ supplier: sup, items }) => {
              const subtotalSupplier = items.reduce(
                (a, p) => a + getQtyOrder(p) * p.hargaBeli,
                0,
              )
              const totalQtySupplier = items.reduce(
                (a, p) => a + getQtyOrder(p),
                0,
              )

              return (
                <div
                  key={sup.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
                >
                  {/* Header Supplier */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">{sup.nama}</h4>
                        <Badge warna="blue">{items.length} Barang</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Kontak: {sup.kontak || '-'} | Telp: {sup.telepon || '-'} | Alamat: {sup.alamat || '-'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="mr-2 text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Estimasi Order</p>
                        <p className="text-xs font-bold text-slate-800">{rupiah(subtotalSupplier)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => {
                          setManualSupplierId(sup.id)
                          setShowManualForm(true)
                        }}
                        title="Tambah barang pesanan restock untuk supplier ini"
                      >
                        + Tambah Barang
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCetakPO(sup, items)}
                        title="Cetak Surat Pesanan Barang (PO) untuk supplier ini"
                      >
                        Cetak PO (PDF)
                      </Button>
                    </div>
                  </div>

                  {/* Tabel Produk untuk Supplier Ini */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Nama Produk</th>
                          <th className="px-3 py-2.5 text-center">Stok Saat Ini</th>
                          <th className="px-3 py-2.5 text-center">Stok Min</th>
                          <th className="px-3 py-2.5 text-center">Qty Restock</th>
                          <th className="px-3 py-2.5 text-right">Harga Beli</th>
                          <th className="px-4 py-2.5 text-right">Subtotal</th>
                          <th className="px-3 py-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((p) => {
                          const qty = getQtyOrder(p)
                          const sub = qty * p.hargaBeli
                          const isKritis = p.stok <= p.stokMinimum

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-semibold text-slate-800">{p.nama}</p>
                                  {isKritis ? (
                                    <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.2 text-[10px] font-medium text-rose-700">
                                      Kritis
                                    </span>
                                  ) : (
                                    <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.2 text-[10px] font-medium text-sky-700">
                                      Manual
                                    </span>
                                  )}
                                </div>
                                <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                              </td>
                              <td
                                className={`px-3 py-2.5 text-center font-bold ${
                                  isKritis ? 'text-rose-600' : 'text-slate-700'
                                }`}
                              >
                                {p.stok} {p.satuan}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-500">
                                {p.stokMinimum} {p.satuan}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => ubahQty(p.id, qty - 1)}
                                    className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={qty}
                                    onChange={(e) => ubahQty(p.id, Number(e.target.value))}
                                    className="h-6 w-14 rounded border border-slate-300 text-center text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => ubahQty(p.id, qty + 1)}
                                    className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-600">
                                {rupiah(p.hargaBeli)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                                {rupiah(sub)}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleHapusItem(p.id, sup.id)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Hapus dari daftar pesanan restock"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50/50 font-semibold text-slate-700">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-slate-500">
                            Total Kebutuhan Restock
                          </td>
                          <td className="px-3 py-2 text-center text-brand-700">
                            {totalQtySupplier} Unit
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">Subtotal PO</td>
                          <td className="px-4 py-2 text-right font-bold text-brand-700">
                            {rupiah(subtotalSupplier)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })}

            {/* Produk Menipis yang Belum Terhubung ke Supplier (hanya muncul saat melihat semua) */}
            {!filterSupplier && tanpaSupplier.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50/30">
                <div className="border-b border-rose-200 bg-rose-50/80 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-rose-800">
                      {tanpaSupplier.length} Produk Menipis Belum Terhubung ke Data Supplier
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-rose-700">
                    Pilih supplier pada kolom kanan agar produk otomatis terkelompok ke Surat Pesanan (PO) supplier terkait.
                  </p>
                </div>
                <div className="divide-y divide-rose-100 bg-white">
                  {tanpaSupplier.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{p.nama}</p>
                        <p className="text-[11px] text-slate-500">
                          SKU: {p.sku} | Stok: <span className="font-bold text-rose-600">{p.stok}</span> / Min:{' '}
                          {p.stokMinimum} {p.satuan}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Pilih Supplier:</span>
                        <Select
                          value=""
                          onChange={(e) => hubungkanSupplier(p, e.target.value)}
                          className="w-52 text-xs"
                        >
                          <option value="">-- Hubungkan Supplier --</option>
                          {supplier.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nama}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
