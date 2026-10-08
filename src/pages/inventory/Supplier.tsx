import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Supplier as TSupplier } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { rupiah } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Modal, PageHeader } from '@/components/ui'

export function Supplier() {
  const navigate = useNavigate()
  const { supplier, hutang, produk, hapusSupplier } = useDataStore()
  const push = useToast((s) => s.push)

  const [hapus, setHapus] = useState<TSupplier | null>(null)

  const hutangAktif = (id: string) =>
    hutang.filter((h) => h.supplierId === id && h.status === 'belum_lunas').reduce((a, h) => a + h.sisa, 0)

  // Total produk supplier dengan stok mencapai batas minimum atau habis
  const totalBarangKritis = useMemo(() => {
    return produk.filter((p) => p.aktif && p.stok <= p.stokMinimum && p.supplierId).length
  }, [produk])

  return (
    <>
      <PageHeader
        judul="Data Supplier"
        deskripsi="Kelola data pemasok barang ke toko, penetapan produk yang dipasok, dan rekomendasi restock saat stok menipis."
        aksi={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className={totalBarangKritis > 0 ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium' : ''}
              onClick={() => navigate('/admin/supplier/restock')}
            >
              Restock & PO {totalBarangKritis > 0 ? `(${totalBarangKritis})` : ''}
            </Button>
            <Button onClick={() => navigate('/admin/supplier/tambah')}>
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
                      onClick={() => navigate(`/admin/supplier/${s.id}/barang`)}
                      title="Kelola produk yang disuplai oleh supplier ini"
                    >
                      Kelola Barang ({prods.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className={
                        kritis > 0
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold'
                          : 'text-xs'
                      }
                      onClick={() => navigate(`/admin/supplier/restock?supplierId=${s.id}`)}
                      title={
                        kritis > 0
                          ? 'Buat PO Restock untuk barang supplier ini yang menipis'
                          : 'Restock manual / buat PO untuk supplier ini'
                      }
                    >
                      Restock {kritis > 0 ? `(${kritis})` : ''}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/admin/supplier/${s.id}/edit`)}
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
    </>
  )
}
