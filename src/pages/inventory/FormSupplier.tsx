import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import type { Supplier as TSupplier } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalSingkat } from '@/lib/format'
import { Badge, Button, Card, FR, Input, Label, Modal, PageHeader, Textarea } from '@/components/ui'

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

const kosong: Omit<TSupplier, 'id'> = {
  nama: '',
  kontak: '',
  telepon: '',
  alamat: '',
}

export function FormSupplier() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const location = useLocation()

  const { supplier, hutang, produk, penerimaan, simpanSupplier, hapusSupplier } = useDataStore()
  const push = useToast((s) => s.push)

  const isTambah = location.pathname.endsWith('/tambah') || !id
  const isEdit = !isTambah && !!id

  const [form, setForm] = useState<Omit<TSupplier, 'id'>>(kosong)
  const [modalHapus, setModalHapus] = useState(false)

  // Supplier yang sedang diedit
  const existingSupplier = isEdit ? supplier.find((s) => s.id === id) : null

  useEffect(() => {
    if (isEdit) {
      if (existingSupplier) {
        setForm({
          nama: existingSupplier.nama,
          kontak: existingSupplier.kontak,
          telepon: existingSupplier.telepon,
          alamat: existingSupplier.alamat,
        })
      } else {
        push({ tipe: 'error', judul: 'Supplier tidak ditemukan' })
        navigate('/admin/supplier', { replace: true })
      }
    } else {
      setForm(kosong)
    }
  }, [id, isEdit, existingSupplier, navigate, push])

  // Data relasi supplier (jika mode edit)
  const produkDipasok = existingSupplier ? produk.filter((p) => p.supplierId === existingSupplier.id) : []
  const produkKritis = produkDipasok.filter((p) => p.aktif && p.stok <= p.stokMinimum)
  const hutangAktif = existingSupplier
    ? hutang.filter((h) => h.supplierId === existingSupplier.id && h.status === 'belum_lunas').reduce((a, h) => a + h.sisa, 0)
    : 0
  const penerimaanTerakhir = existingSupplier
    ? penerimaan.filter((p) => p.supplierId === existingSupplier.id).slice(0, 3)
    : []

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nama.trim()) {
      push({ tipe: 'error', judul: 'Nama supplier wajib diisi' })
      return
    }

    simpanSupplier(isEdit && id ? { ...form, id } : form)
    push({
      tipe: 'sukses',
      judul: isEdit ? 'Data supplier berhasil diperbarui' : 'Supplier baru berhasil ditambahkan',
      pesan: `Pemasok ${form.nama} telah tersimpan.`,
    })
    navigate('/admin/supplier')
  }

  const handleHapus = () => {
    if (!id) return
    hapusSupplier(id)
    push({ tipe: 'sukses', judul: 'Supplier berhasil dihapus' })
    navigate('/admin/supplier')
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
        judul={isEdit ? 'Ubah Data Supplier' : 'Tambah Supplier Baru'}
        deskripsi={
          isEdit
            ? `Perbarui informasi pemasok barang ${existingSupplier?.nama || ''}.`
            : 'Daftarkan pemasok / distributor barang baru ke dalam sistem inventory toko.'
        }
      />

      <form onSubmit={handleSimpan} className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Formulir Data Supplier */}
        <div className={isEdit ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 max-w-3xl space-y-6'}>
          <Card title="Identitas Supplier" subtitle="Informasi utama nama toko, badan usaha, dan alamat pemasok">
            <div className="space-y-4">
              {isEdit && existingSupplier && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-500">ID Supplier:</span>
                  <span className="font-mono font-bold text-slate-800">{existingSupplier.id}</span>
                </div>
              )}

              <div>
                <Label>
                  Nama Supplier / Perusahaan <span className="text-rose-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <BuildingIcon size={16} />
                  </div>
                  <Input
                    required
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Contoh: PT Anugerah Pangan, UD Makmur Jaya, Toko Sumber Rezeki..."
                    className="pl-9"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Nama resmi perusahaan, distributor, atau toko grosir tempat kulakan barang.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nama Kontak / PIC (Person In Charge)</Label>
                  <Input
                    value={form.kontak}
                    onChange={(e) => setForm({ ...form, kontak: e.target.value })}
                    placeholder="Contoh: Pak Budi / Bu Siti / Salesman Deni"
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Nama sales atau penanggung jawab pesanan.</p>
                </div>

                <div>
                  <Label>Nomor Telepon / WhatsApp</Label>
                  <Input
                    value={form.telepon}
                    onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                    placeholder="Contoh: 0812-3456-7890"
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Untuk koordinasi pemesanan dan restock.</p>
                </div>
              </div>

              <div>
                <Label>Alamat Kantor / Gudang</Label>
                <Textarea
                  rows={3}
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  placeholder="Contoh: Jl. Industri Raya No. 45 Blok C, Bekasi Barat..."
                  className="mt-1 text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Lokasi gudang atau kantor supplier untuk pengiriman barang.</p>
              </div>
            </div>
          </Card>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => setModalHapus(true)}
                >
                  Hapus Supplier Ini
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin/supplier')}
              >
                Batal
              </Button>
              <Button type="submit">
                {isEdit ? 'Simpan Perubahan' : 'Tambahkan Supplier'}
              </Button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Ringkasan Produk & Transaksi (Hanya Mode Edit) */}
        {isEdit && existingSupplier && (
          <div className="space-y-6">
            {/* Kartu Ringkasan Hutang */}
            <Card title="Status Keuangan">
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Hutang Aktif ke Supplier</p>
                  <p className={`text-lg font-bold ${hutangAktif > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {hutangAktif > 0 ? rupiah(hutangAktif) : 'Tidak ada hutang'}
                  </p>
                  {hutangAktif > 0 && (
                    <Link
                      to="/admin/barang-masuk"
                      className="mt-1 inline-block text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      Lihat jatuh tempo di Barang Masuk &raquo;
                    </Link>
                  )}
                </div>
              </div>
            </Card>

            {/* Kartu Produk yang Dipasok */}
            <Card
              title="Produk yang Dipasok"
              subtitle={`${produkDipasok.length} produk terhubung`}
              action={
                existingSupplier ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => navigate(`/admin/supplier/${existingSupplier.id}/barang`)}
                  >
                    Kelola Barang
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-3">
                {produkKritis.length > 0 && existingSupplier && (
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                    <div>
                      <p className="text-xs font-bold text-amber-800">
                        {produkKritis.length} Produk Kritis
                      </p>
                      <p className="text-[11px] text-amber-600">Stok di bawah batas minimum</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="text-xs bg-amber-100 border-amber-300 text-amber-900 font-semibold"
                      onClick={() => navigate(`/admin/supplier/restock?supplierId=${existingSupplier.id}`)}
                    >
                      PO Restock
                    </Button>
                  </div>
                )}

                {produkDipasok.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Belum ada produk yang dipasok oleh supplier ini.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto">
                    {produkDipasok.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border border-slate-100 bg-white p-2 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium text-slate-700">{p.nama}</p>
                          <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`font-semibold ${
                              p.stok <= p.stokMinimum ? 'text-amber-600' : 'text-slate-700'
                            }`}
                          >
                            {p.stok} {p.satuan}
                          </span>
                        </div>
                      </div>
                    ))}
                    {produkDipasok.length > 5 && (
                      <p className="text-center text-[11px] text-slate-400 pt-1">
                        +{produkDipasok.length - 5} produk lainnya
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Riwayat Penerimaan Terakhir */}
            <Card title="Penerimaan Terakhir">
              {penerimaanTerakhir.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  Belum ada riwayat penerimaan barang dari supplier ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {penerimaanTerakhir.map((bm) => (
                    <div
                      key={bm.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-700">{bm.nomor}</span>
                        <Badge warna={bm.metode === 'kredit' ? 'amber' : 'green'}>
                          {bm.metode === 'kredit' ? 'Kredit' : 'Tunai'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-slate-500 text-[11px]">
                        <span>{tanggalSingkat(bm.waktu)}</span>
                        <span className="font-semibold text-slate-800">{rupiah(bm.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </form>

      {/* Modal Hapus Supplier */}
      <Modal
        open={modalHapus}
        onClose={() => setModalHapus(false)}
        title="Hapus Supplier"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalHapus(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleHapus}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus pemasok <span className="font-semibold text-slate-800">{existingSupplier?.nama}</span>?
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Produk yang sebelumnya terhubung ke supplier ini akan berstatus tanpa pemasok, namun data produk tetap aman.
        </p>
      </Modal>
    </div>
  )
}
