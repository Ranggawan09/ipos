import { useEffect, useMemo, useState } from 'react'
import type { Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam } from '@/lib/format'
import { cetakPurchaseOrder, cetakSemuaPurchaseOrder, type POData, type POItem } from '@/lib/print'
import { Badge, Button, Modal, Select } from '@/components/ui'

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

  // Sinkronkan filterSupplier saat modal dibuka
  useEffect(() => {
    if (open) {
      setFilterSupplier(targetSupplierId || '')
    }
  }, [open, targetSupplierId])

  // Semua barang dengan stok menipis (kritis)
  const itemsKritis = useMemo(() => {
    return produk.filter((p) => p.aktif && p.stok <= p.stokMinimum)
  }, [produk])

  // Dapatkan qty order untuk produk (default: 2x stok minimum dikurangi stok saat ini, minimal 1)
  const getQtyOrder = (p: Produk) => {
    if (qtyOrders[p.id] !== undefined) {
      return qtyOrders[p.id]
    }
    const ideal = Math.max(1, p.stokMinimum * 2 - p.stok)
    return ideal
  }

  const ubahQty = (produkId: string, val: number) => {
    setQtyOrders((prev) => ({
      ...prev,
      [produkId]: Math.max(1, Math.floor(val || 1)),
    }))
  }

  // Pengelompokan barang kritis per Supplier
  const { kelompokSupplier, tanpaSupplier } = useMemo(() => {
    const map = new Map<string, { supplier: (typeof supplier)[0]; items: Produk[] }>()

    supplier.forEach((s) => {
      const items = itemsKritis.filter((p) => p.supplierId === s.id)
      if (items.length > 0) {
        map.set(s.id, { supplier: s, items })
      }
    })

    const tanpa = itemsKritis.filter(
      (p) => !p.supplierId || !supplier.some((s) => s.id === p.supplierId),
    )

    return {
      kelompokSupplier: Array.from(map.values()),
      tanpaSupplier: tanpa,
    }
  }, [itemsKritis, supplier])

  // Kelompok supplier yang aktif ditampilkan (bisa difilter)
  const kelompokTampil = useMemo(() => {
    if (!filterSupplier) return kelompokSupplier
    return kelompokSupplier.filter((k) => k.supplier.id === filterSupplier)
  }, [kelompokSupplier, filterSupplier])

  const supplierAktif = useMemo(() => {
    if (!filterSupplier) return null
    return supplier.find((s) => s.id === filterSupplier)
  }, [supplier, filterSupplier])

  const itemsKritisTampil = useMemo(() => {
    if (!filterSupplier) return itemsKritis
    return itemsKritis.filter((p) => p.supplierId === filterSupplier)
  }, [itemsKritis, filterSupplier])

  // Hitung total estimasi untuk supplier yang ditampilkan
  const totalItemTampil = useMemo(() => {
    return itemsKritisTampil.reduce((a, p) => a + getQtyOrder(p), 0)
  }, [itemsKritisTampil, qtyOrders])

  const totalBiayaTampil = useMemo(() => {
    return itemsKritisTampil.reduce((a, p) => a + getQtyOrder(p) * p.hargaBeli, 0)
  }, [itemsKritisTampil, qtyOrders])

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
      catatan: 'Pesanan restock barang stok menipis.',
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
          ? `Rekomendasi Restock: ${supplierAktif.nama}`
          : 'Rekomendasi Restock per Supplier'
      }
      lebar="max-w-4xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {kelompokTampil.length} Supplier | {itemsKritisTampil.length} Produk Menipis | Total Estimasi:{' '}
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
                {itemsKritisTampil.length === 0
                  ? supplierAktif
                    ? `Stok Barang dari ${supplierAktif.nama} Aman`
                    : 'Semua Stok Barang Toko Aman'
                  : `${itemsKritisTampil.length} Barang Mencapai Batas Stok Minimum`}
              </h3>
                <p className="mt-0.5 text-xs text-amber-700">
                  {supplierAktif
                    ? `Daftar barang di bawah dipasok oleh rekanan ${supplierAktif.nama} untuk pembuatan Surat Pesanan (PO).`
                    : 'Daftar barang di bawah telah dikelompokkan sesuai data rekanan supplier terdaftar untuk memudahkan pengadaan dan pembuatan Surat Pesanan (PO).'}
                </p>
              </div>
            {itemsKritisTampil.length > 0 && (
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

          {/* Bar Filter Supplier */}
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
                  const countKritis = itemsKritis.filter((p) => p.supplierId === s.id).length
                  return (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({countKritis} kritis)
                    </option>
                  )
                })}
              </Select>
            </div>
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

        {itemsKritisTampil.length === 0 ? (
          <div className="py-12 text-center">
            <h4 className="text-sm font-semibold text-slate-800">
              {supplierAktif
                ? `Tidak ada barang dari ${supplierAktif.nama} yang perlu direstock`
                : 'Tidak ada barang yang perlu direstock'}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Seluruh stok produk terkait berada di atas batas aman stok minimum.
            </p>
            {filterSupplier && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => setFilterSupplier('')}
              >
                Lihat Supplier Lain
              </Button>
            )}
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

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Estimasi Order</p>
                        <p className="text-xs font-bold text-slate-800">{rupiah(subtotalSupplier)}</p>
                      </div>
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

                  {/* Tabel Produk Kritis untuk Supplier Ini */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">Nama Produk</th>
                          <th className="px-3 py-2.5 text-center">Stok Saat Ini</th>
                          <th className="px-3 py-2.5 text-center">Stok Min</th>
                          <th className="px-3 py-2.5 text-center">Qty Restock</th>
                          <th className="px-3 py-2.5 text-right">Harga Beli</th>
                          <th className="px-4 py-2.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((p) => {
                          const qty = getQtyOrder(p)
                          const sub = qty * p.hargaBeli
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5">
                                <p className="font-semibold text-slate-800">{p.nama}</p>
                                <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-rose-600">
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
                          <td className="px-4 py-2 text-right text-brand-700 font-bold">
                            {rupiah(subtotalSupplier)}
                          </td>
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
