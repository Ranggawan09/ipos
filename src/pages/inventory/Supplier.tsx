import { useMemo, useState } from 'react'
import type { Supplier as TSupplier } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { rupiah } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Textarea } from '@/components/ui'
import { ModalKelolaProdukSupplier } from '@/components/ModalKelolaProdukSupplier'
import { ModalRestockSupplier } from '@/components/ModalRestockSupplier'

const kosong = { nama: '', kontak: '', telepon: '', alamat: '' }

export function Supplier() {
  const { supplier, hutang, produk, simpanSupplier, hapusSupplier } = useDataStore()
  const push = useToast((s) => s.push)

  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TSupplier | null>(null)
  const [form, setForm] = useState(kosong)
  const [hapus, setHapus] = useState<TSupplier | null>(null)

  // State untuk Kelola Produk & Restock
  const [kelolaSupplier, setKelolaSupplier] = useState<TSupplier | null>(null)
  const [modalRestock, setModalRestock] = useState(false)
  const [targetRestockSupplierId, setTargetRestockSupplierId] = useState<string | null>(null)

  const hutangAktif = (id: string) =>
    hutang.filter((h) => h.supplierId === id && h.status === 'belum_lunas').reduce((a, h) => a + h.sisa, 0)

  // Total produk supplier dengan stok mencapai batas minimum atau habis
  const totalBarangKritis = useMemo(() => {
    return produk.filter((p) => p.aktif && p.stok <= p.stokMinimum && p.supplierId).length
  }, [produk])

  const simpan = () => {
    if (!form.nama.trim()) {
      push({ tipe: 'error', judul: 'Nama supplier wajib diisi' })
      return
    }
    simpanSupplier(edit ? { ...form, id: edit.id } : form)
    push({ tipe: 'sukses', judul: edit ? 'Supplier diperbarui' : 'Supplier ditambahkan' })
    setModal(false)
  }

  return (
    <>
      <PageHeader
        judul="Data Supplier"
        deskripsi="Kelola data pemasok barang ke toko, penetapan produk yang dipasok, dan rekomendasi restock saat stok menipis."
        aksi={
          <div className="flex items-center gap-2">
            {totalBarangKritis > 0 && (
              <Button
                variant="secondary"
                className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  setTargetRestockSupplierId(null)
                  setModalRestock(true)
                }}
              >
                Rekomendasi Restock ({totalBarangKritis})
              </Button>
            )}
            <Button
              onClick={() => {
                setEdit(null)
                setForm(kosong)
                setModal(true)
              }}
            >
              Tambah Supplier
            </Button>
          </div>
        }
      />

      <Card title="Daftar Supplier" action={<FR kode="FR-INV-09" />}>
        <DataTable
          data={supplier}
          kolom={[
            {
              key: 'nama',
              header: 'Nama Supplier',
              render: (s) => (
                <div>
                  <span className="font-semibold text-slate-800">{s.nama}</span>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {s.id}</p>
                </div>
              ),
            },
            {
              key: 'kontak',
              header: 'Kontak',
              render: (s) => (
                <div>
                  <p className="font-medium text-slate-700">{s.kontak || '-'}</p>
                  <p className="text-xs text-slate-400">{s.telepon || '-'}</p>
                </div>
              ),
            },
            {
              key: 'produk',
              header: 'Produk Dipasok',
              render: (s) => {
                const prods = produk.filter((p) => p.supplierId === s.id)
                const kritis = prods.filter((p) => p.aktif && p.stok <= p.stokMinimum).length

                return (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">{prods.length} Produk</span>
                      {kritis > 0 && (
                        <Badge warna="amber" className="text-[10px] font-medium">
                          {kritis} Kritis
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {kritis > 0
                        ? 'Perlu restock segera'
                        : prods.length > 0
                        ? 'Stok aman'
                        : 'Belum ada produk'}
                    </p>
                  </div>
                )
              },
            },
            {
              key: 'alamat',
              header: 'Alamat',
              className: 'max-w-xs text-slate-600',
              render: (s) => s.alamat || '-',
            },
            {
              key: 'hutang',
              header: 'Hutang Aktif',
              align: 'right',
              render: (s) => {
                const v = hutangAktif(s.id)
                return v > 0 ? (
                  <span className="font-semibold text-rose-600">{rupiah(v)}</span>
                ) : (
                  <span className="text-slate-400">-</span>
                )
              },
            },
            {
              key: 'aksi',
              header: '',
              align: 'right',
              render: (s) => {
                const prods = produk.filter((p) => p.supplierId === s.id)
                const kritis = prods.filter((p) => p.aktif && p.stok <= p.stokMinimum).length

                return (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setKelolaSupplier(s)}
                      title="Kelola produk yang disuplai oleh supplier ini"
                    >
                      Kelola Barang ({prods.length})
                    </Button>
                    {kritis > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold"
                        onClick={() => {
                          setTargetRestockSupplierId(s.id)
                          setModalRestock(true)
                        }}
                        title="Buat PO Restock untuk barang supplier ini yang menipis"
                      >
                        Restock ({kritis})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEdit(s)
                        setForm({
                          nama: s.nama,
                          kontak: s.kontak,
                          telepon: s.telepon,
                          alamat: s.alamat,
                        })
                        setModal(true)
                      }}
                    >
                      Ubah
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => setHapus(s)}
                    >
                      Hapus
                    </Button>
                  </div>
                )
              },
            },
          ]}
        />
      </Card>

      {/* Modal Tambah/Ubah Supplier */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? 'Ubah Data Supplier' : 'Tambah Supplier Baru'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Batal
            </Button>
            <Button onClick={simpan}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Nama supplier <span className="text-rose-500">*</span></Label>
            <Input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="PT / Toko / Nama Rekanan..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nama kontak (PIC)</Label>
              <Input
                value={form.kontak}
                onChange={(e) => setForm({ ...form, kontak: e.target.value })}
                placeholder="Contoh: Pak Budi"
              />
            </div>
            <div>
              <Label>Telepon / WhatsApp</Label>
              <Input
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="0812xxxx"
              />
            </div>
          </div>
          <div>
            <Label>Alamat kantor / gudang</Label>
            <Textarea
              rows={3}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              placeholder="Alamat lengkap supplier..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal Hapus Supplier */}
      <Modal
        open={!!hapus}
        onClose={() => setHapus(null)}
        title="Hapus Supplier"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHapus(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (hapus) {
                  hapusSupplier(hapus.id)
                  push({ tipe: 'sukses', judul: 'Supplier dihapus' })
                }
                setHapus(null)
              }}
            >
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Hapus supplier <span className="font-semibold text-slate-800">{hapus?.nama}</span>?
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Produk yang sebelumnya terhubung ke supplier ini akan berstatus tanpa pemasok, namun data produk tetap aman.
        </p>
      </Modal>

      {/* Modal Kelola Produk Supplier */}
      <ModalKelolaProdukSupplier
        open={!!kelolaSupplier}
        onClose={() => setKelolaSupplier(null)}
        supplier={kelolaSupplier}
        onOpenRestock={(supId) => {
          setTargetRestockSupplierId(supId)
          setModalRestock(true)
        }}
      />

      {/* Modal Rekomendasi Restock Supplier */}
      <ModalRestockSupplier
        open={modalRestock}
        onClose={() => {
          setModalRestock(false)
          setTargetRestockSupplierId(null)
        }}
        targetSupplierId={targetRestockSupplierId}
      />
    </>
  )
}
