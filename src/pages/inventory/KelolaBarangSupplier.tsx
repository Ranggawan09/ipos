import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import type { Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah } from '@/lib/format'
import { Badge, Button, Card, FR, Input, Label, Modal, PageHeader } from '@/components/ui'
import { SelectProduk } from '@/components/SelectProduk'

function ArrowLeftIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function BuildingIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  )
}

export function KelolaBarangSupplier() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { supplier: allSupplier, produk, kategori, simpanProduk } = useDataStore()
  const push = useToast((s) => s.push)

  const supplier = useMemo(() => {
    return allSupplier.find((s) => s.id === id) || null
  }, [allSupplier, id])

  const [selectedProdukId, setSelectedProdukId] = useState('')
  const [cariProduk, setCariProduk] = useState('')
  const [filterStatus, setFilterStatus] = useState<'semua' | 'kritis' | 'aman'>('semua')
  const [konfirmasiLepas, setKonfirmasiLepas] = useState<Produk | null>(null)

  // Produk yang dipasok oleh supplier ini
  const produkDipasok = useMemo(() => {
    if (!supplier) return []
    return produk.filter((p) => p.supplierId === supplier.id)
  }, [produk, supplier])

  // Produk kritis (stok <= stokMinimum)
  const produkKritis = useMemo(() => {
    return produkDipasok.filter((p) => p.stok <= p.stokMinimum)
  }, [produkDipasok])

  // Total nilai modal produk yang dipasok
  const totalNilaiModal = useMemo(() => {
    return produkDipasok.reduce((acc, p) => acc + p.stok * p.hargaBeli, 0)
  }, [produkDipasok])

  // Filter pencarian & status produk dipasok
  const produkTampil = useMemo(() => {
    return produkDipasok.filter((p) => {
      const q = cariProduk.toLowerCase()
      const matchQuery =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))

      if (!matchQuery) return false

      if (filterStatus === 'kritis') return p.stok <= p.stokMinimum
      if (filterStatus === 'aman') return p.stok > p.stokMinimum
      return true
    })
  }, [produkDipasok, cariProduk, filterStatus])

  // Produk yang tersedia untuk ditambahkan (belum dipasok oleh supplier ini)
  const produkTersedia = useMemo(() => {
    if (!supplier) return []
    return produk.filter((p) => p.supplierId !== supplier.id)
  }, [produk, supplier])

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
      pesan: `${target.nama} kini terdaftar dipasok oleh ${supplier.nama}`,
    })

    setSelectedProdukId('')
  }

  // Lepas hubungan produk dari supplier ini
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

  if (!supplier) {
    return (
      <div className="space-y-6">
        <PageHeader
          judul="Supplier Tidak Ditemukan"
          deskripsi="Data supplier yang Anda cari mungkin telah dihapus atau tidak tersedia."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm text-slate-600">ID supplier tidak valid atau sudah tidak ada di sistem.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/admin/supplier')}>
              Kembali ke Daftar Supplier
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tombol Navigasi Kembali */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/supplier')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowLeftIcon size={14} />
          Kembali ke Daftar Supplier
        </button>

        <FR kode="FR-INV-09" />
      </div>

      <PageHeader
        judul={`Kelola Barang: ${supplier.nama}`}
        deskripsi="Kelola produk toko yang disuplai oleh supplier ini untuk otomatisasi pengadaan, histori penerimaan, dan pesanan restock (PO)."
        aksi={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => navigate(`/admin/supplier/${supplier.id}/edit`)}
            >
              Ubah Data Supplier
            </Button>
            <Button
              size="sm"
              className={
                produkKritis.length > 0
                  ? 'border-amber-300 bg-amber-600 hover:bg-amber-700 text-xs text-white font-semibold'
                  : 'text-xs'
              }
              onClick={() => navigate(`/admin/supplier/restock?supplierId=${supplier.id}`)}
            >
              PO Restock {produkKritis.length > 0 ? `(${produkKritis.length} Kritis)` : ''}
            </Button>
          </div>
        }
      />

      {/* Ringkasan Metrik Supplier */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <BuildingIcon size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Supplier</p>
              <h4 className="font-bold text-slate-800 truncate" title={supplier.nama}>
                {supplier.nama}
              </h4>
              <p className="text-[11px] text-slate-400">
                PIC: {supplier.kontak || '-'} ({supplier.telepon || '-'})
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-500">Total Produk Dipasok</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{produkDipasok.length}</span>
            <span className="text-xs text-slate-500">item</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Terdaftar di katalog toko</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-500">Stok Kritis / Habis</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                produkKritis.length > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {produkKritis.length}
            </span>
            <span className="text-xs text-slate-500">item perlu restock</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {produkKritis.length > 0 ? 'Mencapai batas minimum' : 'Semua stok dalam batas aman'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-500">Nilai Stok Modal</p>
          <div className="mt-1">
            <span className="text-xl font-bold text-slate-800">{rupiah(totalNilaiModal)}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Berdasarkan harga beli saat ini</p>
        </div>
      </div>

      {/* Banner Rekomendasi Restock */}
      {produkKritis.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div>
            <p className="text-sm font-bold text-amber-900">
              Perhatian: {produkKritis.length} Produk Mencapai Batas Stok Minimum atau Habis!
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Produk berikut siap direstock. Anda dapat langsung membuat dan mencetak Purchase Order (PO) untuk dikirim ke {supplier.nama}.
            </p>
          </div>
          <Button
            size="sm"
            className="border-amber-400 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
            onClick={() => navigate(`/admin/supplier/restock?supplierId=${supplier.id}`)}
          >
            Buat PO Restock Sekarang
          </Button>
        </div>
      )}

      {/* Card Form Hubungkan Produk Baru */}
      <Card
        title="Hubungkan Produk ke Supplier Ini"
        subtitle="Pilih produk dari katalog toko yang dipasok oleh supplier ini untuk otomatisasi pengadaan."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <Label>Pilih Produk Toko</Label>
            <SelectProduk
              value={selectedProdukId}
              onChange={(id) => setSelectedProdukId(id)}
              daftarProdukCustom={produkTersedia}
              placeholder="-- Cari / Pilih Produk Toko --"
              labelSubtext={(p: Produk) => {
                const supLain = getNamaSupplierLain(p.supplierId)
                return supLain ? `[Pindah dari: ${supLain}]` : '[Belum ada supplier]'
              }}
            />
          </div>
          <Button onClick={handleHubungkan} disabled={!selectedProdukId} className="h-10">
            Hubungkan Produk
          </Button>
        </div>
      </Card>

      {/* Card Tabel Produk yang Dipasok */}
      <Card
        title={`Daftar Produk yang Dipasok (${produkDipasok.length})`}
        subtitle="Daftar seluruh item yang terhubung ke supplier ini."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <Input
                placeholder="Cari nama, SKU, barcode..."
                value={cariProduk}
                onChange={(e) => setCariProduk(e.target.value)}
                className="py-1.5 text-xs"
              />
            </div>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterStatus === 'semua'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setFilterStatus('semua')}
              >
                Semua ({produkDipasok.length})
              </button>
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterStatus === 'kritis'
                    ? 'bg-white text-amber-700 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setFilterStatus('kritis')}
              >
                Kritis ({produkKritis.length})
              </button>
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterStatus === 'aman'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setFilterStatus('aman')}
              >
                Aman ({produkDipasok.length - produkKritis.length})
              </button>
            </div>
          </div>
        }
      >
        {produkTampil.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {produkDipasok.length === 0
                ? 'Belum ada produk yang dihubungkan ke supplier ini'
                : 'Tidak ada produk yang cocok dengan pencarian atau filter'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Gunakan formulir di atas untuk memilih dan menambahkan barang yang disuplai oleh {supplier.nama}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3 text-right">Harga Beli</th>
                  <th className="px-3 py-3 text-center">Stok / Minimum</th>
                  <th className="px-3 py-3 text-center">Status Stok</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
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
                        isKritis ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/produk/${p.id}/edit`}
                          className="font-semibold text-slate-800 hover:text-brand-600 hover:underline"
                        >
                          {p.nama}
                        </Link>
                        <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {katNama(p.kategoriId)} | {p.satuan}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700">
                        {rupiah(p.hargaBeli)}
                      </td>
                      <td className="px-3 py-3 text-center">
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
                      <td className="px-3 py-3 text-center">
                        {isHabis ? (
                          <Badge warna="red">Habis</Badge>
                        ) : isKritis ? (
                          <Badge warna="amber">Stok Kritis</Badge>
                        ) : (
                          <Badge warna="green">Aman</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs px-2.5 py-1"
                            onClick={() => setKonfirmasiLepas(p)}
                            title="Lepaskan produk dari supplier ini"
                          >
                            Lepas
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
          Produk tidak akan dihapus dari toko, hanya status pemasoknya yang menjadi belum ditentukan.
        </p>
      </Modal>
    </div>
  )
}
