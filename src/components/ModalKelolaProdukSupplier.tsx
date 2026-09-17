import { useMemo, useState } from 'react'
import type { Supplier, Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah } from '@/lib/format'
import { Badge, Button, Input, Label, Modal, Select } from '@/components/ui'

export function ModalKelolaProdukSupplier({
  open,
  onClose,
  supplier,
  onOpenRestock,
}: {
  open: boolean
  onClose: () => void
  supplier: Supplier | null
  onOpenRestock?: (supplierId: string) => void
}) {
  const { produk, supplier: allSupplier, kategori, simpanProduk } = useDataStore()
  const push = useToast((s) => s.push)

  const [selectedProdukId, setSelectedProdukId] = useState('')
  const [cariProduk, setCariProduk] = useState('')
  const [konfirmasiLepas, setKonfirmasiLepas] = useState<Produk | null>(null)

  // Produk yang dipasok oleh supplier ini
  const produkDipasok = useMemo(() => {
    if (!supplier) return []
    return produk.filter((p) => p.supplierId === supplier.id)
  }, [produk, supplier])

  // Filter pencarian tabel produk dipasok
  const produkTampil = useMemo(() => {
    const q = cariProduk.toLowerCase()
    if (!q) return produkDipasok
    return produkDipasok.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q),
    )
  }, [produkDipasok, cariProduk])

  // Produk kritis (stok <= stokMinimum)
  const produkKritis = useMemo(() => {
    return produkDipasok.filter((p) => p.stok <= p.stokMinimum)
  }, [produkDipasok])

  // Produk yang tersedia untuk ditambahkan (belum dipasok oleh supplier ini)
  const produkTersedia = useMemo(() => {
    if (!supplier) return []
    return produk.filter((p) => p.supplierId !== supplier.id)
  }, [produk, supplier])

  // Total nilai stok modal dari produk yang dipasok
  const totalNilaiModal = useMemo(() => {
    return produkDipasok.reduce((acc, p) => acc + p.stok * p.hargaBeli, 0)
  }, [produkDipasok])

  const katNama = (kategoriId: string) =>
    kategori.find((k) => k.id === kategoriId)?.nama ?? '-'

  const getNamaSupplierLain = (supplierId?: string) => {
    if (!supplierId) return null
    return allSupplier.find((s) => s.id === supplierId)?.nama
  }

  // Hubungkan produk ke supplier ini
  const handleHubungkan = () => {
    if (!supplier || !selectedProdukId) {
      push({ tipe: 'error', judul: 'Pilih produk terlebih dahulu' })
      return
    }

    const target = produk.find((p) => p.id === selectedProdukId)
    if (!target) return

    simpanProduk({
      ...target,
      supplierId: supplier.id,
    })

    push({
      tipe: 'sukses',
      judul: 'Produk berhasil dihubungkan',
      pesan: `${target.nama} kini dipasok oleh ${supplier.nama}`,
    })

    setSelectedProdukId('')
  }

  // Lepas produk dari supplier ini
  const handleLepas = (p: Produk) => {
    simpanProduk({
      ...p,
      supplierId: undefined,
    })

    push({
      tipe: 'sukses',
      judul: 'Produk dilepas dari supplier',
      pesan: `${p.nama} tidak lagi terhubung ke ${supplier?.nama}`,
    })

    setKonfirmasiLepas(null)
  }

  if (!supplier) return null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Kelola Produk Supplier: ${supplier.nama}`}
        lebar="max-w-4xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Total {produkDipasok.length} produk | {produkKritis.length} stok kritis | Nilai stok:{' '}
              <span className="font-semibold text-slate-700">{rupiah(totalNilaiModal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Tutup
              </Button>
              {produkKritis.length > 0 && onOpenRestock && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    onClose()
                    onOpenRestock(supplier.id)
                  }}
                >
                  Buat PO Restock ({produkKritis.length} Barang)
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Info Singkat Supplier */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{supplier.nama}</h4>
                <p className="text-xs text-slate-500">
                  Kontak: <span className="font-medium text-slate-700">{supplier.kontak || '-'}</span> | Telp:{' '}
                  <span className="font-medium text-slate-700">{supplier.telepon || '-'}</span> | Alamat:{' '}
                  <span>{supplier.alamat || '-'}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-[10px] text-slate-400">Total Dipasok</p>
                  <p className="text-sm font-bold text-slate-700">{produkDipasok.length} Produk</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Stok Kritis</p>
                  <p className="text-sm font-bold text-rose-600">{produkKritis.length} Produk</p>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Peringatan Stok Kritis (jika ada) */}
          {produkKritis.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5">
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {produkKritis.length} Produk Mencapai Batas Stok Minimum atau Habis
                </p>
                <p className="text-[11px] text-amber-700">
                  Produk ini siap direstock. Anda dapat langsung menerbitkan Surat Pesanan (PO) untuk dikirim ke{' '}
                  <span className="font-semibold">{supplier.nama}</span>.
                </p>
              </div>
              {onOpenRestock && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={() => {
                    onClose()
                    onOpenRestock(supplier.id)
                  }}
                >
                  Proses Restock Sekarang
                </Button>
              )}
            </div>
          )}

          {/* Form Tambah / Hubungkan Produk */}
          <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-3.5">
            <h5 className="mb-2 text-xs font-bold text-brand-900">Hubungkan Produk ke Supplier Ini</h5>
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="min-w-[260px] flex-1">
                <Label>Pilih Produk Toko</Label>
                <Select
                  value={selectedProdukId}
                  onChange={(e) => setSelectedProdukId(e.target.value)}
                  className="text-xs"
                >
                  <option value="">-- Cari / Pilih Produk Toko --</option>
                  {produkTersedia.map((p) => {
                    const supLain = getNamaSupplierLain(p.supplierId)
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.sku}) | Stok: {p.stok} {p.satuan}
                        {supLain ? ` [Pindah dari: ${supLain}]` : ' [Belum ada supplier]'}
                      </option>
                    )
                  })}
                </Select>
              </div>
              <Button size="sm" onClick={handleHubungkan} disabled={!selectedProdukId}>
                Hubungkan Produk
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Produk yang dihubungkan otomatis dikelompokkan ke supplier ini pada rekomendasi restock saat stok menipis.
            </p>
          </div>

          {/* Tabel Produk yang Dipasok */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-xs font-bold text-slate-800">
                Daftar Produk yang Dipasok ({produkDipasok.length})
              </h5>
              <div className="w-56">
                <Input
                  placeholder="Cari nama atau SKU..."
                  value={cariProduk}
                  onChange={(e) => setCariProduk(e.target.value)}
                  className="text-xs py-1"
                />
              </div>
            </div>

            {produkTampil.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  {produkDipasok.length === 0
                    ? 'Belum ada produk yang dihubungkan ke supplier ini'
                    : 'Tidak ada produk yang cocok dengan pencarian'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Gunakan formulir di atas untuk memilih dan menambahkan barang yang disuplai oleh supplier ini.
                </p>
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Produk</th>
                      <th className="px-3 py-2.5">Kategori</th>
                      <th className="px-3 py-2.5 text-right">Harga Beli</th>
                      <th className="px-3 py-2.5 text-center">Stok / Min</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {produkTampil.map((p) => {
                      const isKritis = p.stok <= p.stokMinimum
                      const isHabis = p.stok === 0

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/70 transition ${
                            isKritis ? 'bg-amber-50/25' : ''
                          }`}
                        >
                          <td className="px-3.5 py-2">
                            <p className="font-semibold text-slate-800">{p.nama}</p>
                            <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {katNama(p.kategoriId)} | {p.satuan}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700">
                            {rupiah(p.hargaBeli)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`font-bold ${
                                isHabis
                                  ? 'text-rose-600'
                                  : isKritis
                                  ? 'text-amber-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {angka(p.stok)}
                            </span>
                            <span className="text-[10px] text-slate-400"> / min {p.stokMinimum}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isHabis ? (
                              <Badge warna="red">Habis</Badge>
                            ) : isKritis ? (
                              <Badge warna="amber">Stok Kritis</Badge>
                            ) : (
                              <Badge warna="green">Aman</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs px-2 py-1"
                              onClick={() => setKonfirmasiLepas(p)}
                              title="Lepaskan produk dari supplier ini"
                            >
                              Lepas
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Lepas Hubungan */}
      <Modal
        open={!!konfirmasiLepas}
        onClose={() => setKonfirmasiLepas(null)}
        title="Lepas Hubungan Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setKonfirmasiLepas(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (konfirmasiLepas) handleLepas(konfirmasiLepas)
              }}
            >
              Lepas Hubungan
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Lepaskan produk <span className="font-semibold text-slate-800">{konfirmasiLepas?.nama}</span> dari supplier{' '}
          <span className="font-semibold text-slate-800">{supplier.nama}</span>?
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Produk tidak akan dihapus dari sistem, hanya status pemasoknya yang menjadi belum ditentukan.
        </p>
      </Modal>
    </>
  )
}
