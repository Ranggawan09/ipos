import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam } from '@/lib/format'
import { cetakPurchaseOrder, cetakSemuaPurchaseOrder, type POData, type POItem } from '@/lib/print'
import { Badge, Button, Card, Input, PageHeader, Select } from '@/components/ui'
import { SelectProduk } from '@/components/SelectProduk'

function ArrowLeftIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function PrinterIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </svg>
  )
}

function PhoneIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function RestockSupplier() {
  const [searchParams, setSearchParams] = useSearchParams()
  const targetSupplierId = searchParams.get('supplierId') || ''

  const { produk, supplier, simpanProduk } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  // Filter supplier yang sedang ditampilkan
  const [filterSupplier, setFilterSupplier] = useState<string>(targetSupplierId)

  // Map kuantitas pesanan restock: [produkId]: qty
  const [qtyOrders, setQtyOrders] = useState<Record<string, number>>({})

  // Form Tambah Restock Manual
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualSupplierId, setManualSupplierId] = useState<string>('')
  const [manualProdukId, setManualProdukId] = useState<string>('')
  const [manualQty, setManualQty] = useState<number>(1)

  // Daftar item restock manual yang ditambahkan: { produkId: string, supplierId: string }
  const [manualItems, setManualItems] = useState<{ produkId: string; supplierId: string }[]>([])

  // Daftar produk yang dikecualikan dari pesanan kali ini
  const [excludedIds, setExcludedIds] = useState<string[]>([])

  // Sinkronkan filter saat query param berubah
  useEffect(() => {
    if (targetSupplierId) {
      setFilterSupplier(targetSupplierId)
      setManualSupplierId(targetSupplierId)
    } else if (supplier.length > 0 && !manualSupplierId) {
      setManualSupplierId(supplier[0].id)
    }
  }, [targetSupplierId, supplier])

  // Update query param saat filter dropdown berubah
  const handleGantiFilter = (val: string) => {
    setFilterSupplier(val)
    if (val) {
      setSearchParams({ supplierId: val })
      setManualSupplierId(val)
    } else {
      setSearchParams({})
    }
  }

  // Semua barang dengan stok menipis (kritis)
  const itemsKritis = useMemo(() => {
    return produk.filter((p) => p.aktif && p.stok <= p.stokMinimum)
  }, [produk])

  // Dapatkan qty order untuk produk
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

  // Pengelompokan barang restock per Supplier (barang kritis + barang manual)
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

  // Seluruh barang yang sedang tampil
  const allItemsTampil = useMemo(() => {
    return kelompokTampil.flatMap((k) => k.items)
  }, [kelompokTampil])

  // Hitung total estimasi
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

  // Handler saat memilih produk di form manual
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

    setExcludedIds((prev) => prev.filter((id) => id !== manualProdukId))

    setManualItems((prev) => {
      const exists = prev.some(
        (m) => m.produkId === manualProdukId && m.supplierId === manualSupplierId,
      )
      if (exists) return prev
      return [...prev, { produkId: manualProdukId, supplierId: manualSupplierId }]
    })

    ubahQty(manualProdukId, manualQty)

    if (!prod.supplierId) {
      simpanProduk({
        ...prod,
        supplierId: manualSupplierId,
      })
    }

    if (filterSupplier && filterSupplier !== manualSupplierId) {
      handleGantiFilter(manualSupplierId)
    }

    push({
      tipe: 'sukses',
      judul: 'Barang Ditambahkan ke Restock',
      pesan: `${prod.nama} (${manualQty} ${prod.satuan}) berhasil masuk ke daftar restock ${sup.nama}.`,
    })

    setManualProdukId('')
    setManualQty(1)
  }

  // Handler menghapus barang dari daftar pesanan
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

  // Aksi Cetak Seluruh PO Sekaligus
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

  // Kirim WhatsApp PO ke Kontak Supplier
  const handleKirimWA = (sup: (typeof supplier)[0], items: Produk[]) => {
    if (!sup.telepon) {
      push({
        tipe: 'peringatan',
        judul: 'Nomor Telepon Kosong',
        pesan: `Supplier ${sup.nama} belum memiliki nomor telepon/WhatsApp.`,
      })
      return
    }

    const cleanTelp = sup.telepon.replace(/\D/g, '')
    const phone = cleanTelp.startsWith('0') ? '62' + cleanTelp.slice(1) : cleanTelp

    let pesanWA = `Halo ${sup.kontak || sup.nama},\n`
    pesanWA += `Kami ingin melakukan pemesanan (PO Restock) untuk item berikut:\n\n`

    items.forEach((p, idx) => {
      const q = getQtyOrder(p)
      pesanWA += `${idx + 1}. *${p.nama}* (${p.sku})\n   Jumlah: ${q} ${p.satuan}\n`
    })

    const totalEst = items.reduce((a, p) => a + getQtyOrder(p) * p.hargaBeli, 0)
    pesanWA += `\nTotal Estimasi: *${rupiah(totalEst)}*\n`
    pesanWA += `Mohon konfirmasi ketersediaan barang dan jadwal pengiriman. Terima kasih.`

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(pesanWA)}`
    window.open(url, '_blank')
  }

  // Hubungkan barang tanpa supplier
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
    <div className="space-y-6">
      {/* Tombol Navigasi Kembali */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/supplier"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowLeftIcon size={14} />
          Kembali ke Daftar Supplier
        </Link>
      </div>

      <PageHeader
        judul={
          supplierAktif
            ? `Rekomendasi Restock & PO: ${supplierAktif.nama}`
            : 'Rekomendasi Restock & Purchase Order (PO)'
        }
        deskripsi="Daftar otomatis barang dengan stok menipis per supplier, penyesuaian kuantitas pesanan, cetak Surat Pesanan (PO), dan kirim via WhatsApp."
        aksi={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => setShowManualForm(!showManualForm)}
            >
              {showManualForm ? 'Tutup Form Manual' : '+ Tambah Restock Manual'}
            </Button>
            {kelompokTampil.length > 0 && (
              <Button size="sm" onClick={handleCetakSemuaPO} className="gap-1.5 text-xs">
                <PrinterIcon size={14} />
                {kelompokTampil.length === 1 ? 'Cetak PO Ini (PDF)' : 'Cetak Semua PO (PDF)'}
              </Button>
            )}
          </div>
        }
      />

      {/* Filter & Ringkasan Metrik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">
            Filter Supplier Restock
          </label>
          <Select
            value={filterSupplier}
            onChange={(e) => handleGantiFilter(e.target.value)}
            className="text-xs"
          >
            <option value="">Semua Supplier ({kelompokSupplier.length})</option>
            {supplier.map((s) => {
              const jumlah = itemsKritis.filter((p) => p.supplierId === s.id).length
              return (
                <option key={s.id} value={s.id}>
                  {s.nama} {jumlah > 0 ? `(${jumlah} Kritis)` : ''}
                </option>
              )
            })}
          </Select>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-500">Supplier Dipesan</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{kelompokTampil.length}</span>
            <span className="text-xs text-slate-500">supplier</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Memiliki daftar barang restock</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-500">Total Kuantitas Pesan</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-600">{totalItemTampil}</span>
            <span className="text-xs text-slate-500">unit ({allItemsTampil.length} SKU)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total volume barang dalam PO</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-500">Estimasi Total Biaya</p>
          <div className="mt-1">
            <span className="text-xl font-bold text-slate-800">{rupiah(totalBiayaTampil)}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Berdasarkan harga modal terakhir</p>
        </div>
      </div>

      {/* Form Tambah Restock Manual */}
      {showManualForm && (
        <Card
          title="Tambah Barang ke Daftar Pesanan Restock"
          subtitle="Gunakan form ini untuk menyisipkan barang yang ingin dipesan meskipun stok belum mencapai batas minimum."
        >
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Pilih Supplier <span className="text-rose-500">*</span>
              </label>
              <Select
                value={manualSupplierId}
                onChange={(e) => {
                  setManualSupplierId(e.target.value)
                  setManualProdukId('')
                }}
                className="text-xs"
              >
                {supplier.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-5">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Pilih Produk <span className="text-rose-500">*</span>
              </label>
              <SelectProduk
                value={manualProdukId}
                onChange={(produkId) => handlePilihManualProduk(produkId)}
                disabled={!manualSupplierId}
                placeholder="-- Pilih Produk yang Akan Dipesan --"
                daftarProdukCustom={[...prodsSupplierIni, ...prodsLainnya]}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Qty Pesan {produkTerpilihManual ? `(${produkTerpilihManual.satuan})` : ''}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={manualQty}
                  onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={!manualProdukId}
                  className="w-full text-center text-xs font-bold"
                />
                <Button
                  size="sm"
                  onClick={handleTambahRestockManual}
                  disabled={!manualSupplierId || !manualProdukId}
                  className="shrink-0 text-xs h-9"
                >
                  + Tambah
                </Button>
              </div>
            </div>
          </div>

          {produkTerpilihManual && (
            <div className="mt-3 flex flex-wrap items-center justify-between rounded-lg border border-brand-100 bg-brand-50/40 px-3 py-2 text-xs text-slate-600">
              <div>
                SKU: <span className="font-mono font-medium text-slate-800">{produkTerpilihManual.sku}</span> | Stok Saat Ini:{' '}
                <span
                  className={`font-semibold ${
                    produkTerpilihManual.stok <= produkTerpilihManual.stokMinimum
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {produkTerpilihManual.stok} {produkTerpilihManual.satuan}
                </span>{' '}
                (Min: {produkTerpilihManual.stokMinimum})
              </div>
              <div>
                Harga Beli: <span className="font-semibold text-slate-800">{rupiah(produkTerpilihManual.hargaBeli)}</span> | Subtotal:{' '}
                <span className="font-bold text-brand-700">{rupiah(manualQty * produkTerpilihManual.hargaBeli)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Konten Utama Daftar Kelompok Supplier */}
      {kelompokTampil.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-600">
            ✓
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {supplierAktif
              ? `Semua Stok dari ${supplierAktif.nama} dalam Batas Aman`
              : 'Tidak Ada Rekomendasi Restock Saat Ini'}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            {supplierAktif
              ? 'Tidak ada produk dari supplier ini yang mencapai batas minimum stok. Anda dapat menambahkan item manual melalui tombol di atas jika tetap ingin membuat PO.'
              : 'Seluruh stok produk toko berada di atas batas stok minimum. Jika ingin membuat pesanan pengadaan tertentu, gunakan tombol "+ Tambah Restock Manual".'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {supplierAktif && (
              <Button size="sm" variant="secondary" onClick={() => handleGantiFilter('')}>
                Lihat Semua Supplier
              </Button>
            )}
            <Button size="sm" onClick={() => setShowManualForm(true)}>
              + Tambah Pesanan Manual
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
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
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
              >
                {/* Header Supplier */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/supplier/${sup.id}/barang`}
                        className="text-sm font-bold text-slate-800 hover:text-brand-600 hover:underline"
                      >
                        {sup.nama}
                      </Link>
                      <Badge warna="blue">{items.length} Produk Dipesan</Badge>
                      <span className="text-xs text-slate-500">({totalQtySupplier} unit)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      PIC: <span className="font-medium text-slate-700">{sup.kontak || '-'}</span> | Telp/WA:{' '}
                      <span className="font-medium text-slate-700">{sup.telepon || '-'}</span> | Alamat:{' '}
                      <span>{sup.alamat || '-'}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="mr-3 text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Estimasi PO</p>
                      <p className="text-sm font-bold text-slate-800">{rupiah(subtotalSupplier)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => {
                        setManualSupplierId(sup.id)
                        setShowManualForm(true)
                      }}
                    >
                      + Tambah Item
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5 text-xs"
                      onClick={() => handleCetakPO(sup, items)}
                    >
                      <PrinterIcon size={14} />
                      Cetak PO (PDF)
                    </Button>
                    {sup.telepon && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => handleKirimWA(sup, items)}
                      >
                        <PhoneIcon size={14} />
                        Kirim WA
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabel Produk Pesanan */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Nama Produk</th>
                        <th className="px-3 py-3 text-center">Stok Saat Ini</th>
                        <th className="px-3 py-3 text-center">Stok Minimum</th>
                        <th className="px-3 py-3 text-center">Qty Restock</th>
                        <th className="px-3 py-3 text-right">Harga Beli</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                        <th className="px-3 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((p) => {
                        const qty = getQtyOrder(p)
                        const subtotal = qty * p.hargaBeli
                        const isKritis = p.stok <= p.stokMinimum
                        const isHabis = p.stok === 0

                        return (
                          <tr
                            key={p.id}
                            className={`hover:bg-slate-50/70 transition ${
                              isHabis ? 'bg-rose-50/20' : isKritis ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5">
                              <p className="font-semibold text-slate-800">{p.nama}</p>
                              <p className="font-mono text-[10px] text-slate-400">
                                {p.sku} | Satuan: {p.satuan}
                              </p>
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`font-bold ${
                                  isHabis
                                    ? 'text-rose-600'
                                    : isKritis
                                    ? 'text-amber-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {p.stok}
                              </span>{' '}
                              <span className="text-[10px] text-slate-400">{p.satuan}</span>
                            </td>

                            <td className="px-3 py-2.5 text-center text-slate-500">
                              {p.stokMinimum} {p.satuan}
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <div className="mx-auto flex w-28 items-center justify-center gap-1">
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                                  onClick={() => ubahQty(p.id, qty - 1)}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={qty}
                                  onChange={(e) => ubahQty(p.id, parseInt(e.target.value) || 1)}
                                  className="h-7 w-12 rounded-md border border-slate-200 text-center font-bold text-slate-800 text-xs focus:border-brand-500 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                                  onClick={() => ubahQty(p.id, qty + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                              {rupiah(p.hargaBeli)}
                            </td>

                            <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                              {rupiah(subtotal)}
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs px-2 py-1"
                                onClick={() => handleHapusItem(p.id, sup.id)}
                                title="Keluarkan dari daftar PO kali ini"
                              >
                                Hapus
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bagian Barang Kritis Tanpa Supplier */}
      {tanpaSupplier.length > 0 && !filterSupplier && (
        <Card
          title={`Barang Kritis Belum Memiliki Supplier (${tanpaSupplier.length})`}
          subtitle="Hubungkan ke supplier agar otomatis masuk ke daftar cetak Purchase Order (PO)."
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Produk</th>
                  <th className="px-3 py-2.5 text-center">Stok / Min</th>
                  <th className="px-3 py-2.5 text-right">Harga Beli</th>
                  <th className="px-4 py-2.5">Pilihkan Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tanpaSupplier.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{p.nama}</p>
                      <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold text-rose-600">{p.stok}</span> / min {p.stokMinimum}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                      {rupiah(p.hargaBeli)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="w-56">
                        <Select
                          value=""
                          onChange={(e) => hubungkanSupplier(p, e.target.value)}
                          className="text-xs py-1"
                        >
                          <option value="">-- Tentukan Supplier --</option>
                          {supplier.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nama}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
