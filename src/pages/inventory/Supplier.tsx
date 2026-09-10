import { useState } from 'react'
import type { Supplier as TSupplier } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { rupiah } from '@/lib/format'
import { Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Textarea } from '@/components/ui'

const kosong = { nama: '', kontak: '', telepon: '', alamat: '' }

export function Supplier() {
  const { supplier, hutang, simpanSupplier, hapusSupplier } = useDataStore()
  const push = useToast((s) => s.push)
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TSupplier | null>(null)
  const [form, setForm] = useState(kosong)
  const [hapus, setHapus] = useState<TSupplier | null>(null)

  const hutangAktif = (id: string) =>
    hutang.filter((h) => h.supplierId === id && h.status === 'belum_lunas').reduce((a, h) => a + h.sisa, 0)

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
        deskripsi="Kelola data pemasok barang ke toko."
        aksi={<Button onClick={() => { setEdit(null); setForm(kosong); setModal(true) }}>Tambah Supplier</Button>}
      />
      <Card title="Daftar Supplier" action={<FR kode="FR-INV-09" />}>
        <DataTable
          data={supplier}
          kolom={[
            { key: 'nama', header: 'Nama Supplier', render: (s) => <span className="font-medium text-slate-700">{s.nama}</span> },
            { key: 'kontak', header: 'Kontak', render: (s) => (
              <div>
                <p>{s.kontak}</p>
                <p className="text-xs text-slate-400">{s.telepon}</p>
              </div>
            ) },
            { key: 'alamat', header: 'Alamat', className: 'max-w-xs' },
            { key: 'hutang', header: 'Hutang Aktif', align: 'right', render: (s) => {
              const v = hutangAktif(s.id)
              return v > 0 ? <span className="font-medium text-rose-600">{rupiah(v)}</span> : <span className="text-slate-400">-</span>
            } },
            { key: 'aksi', header: '', align: 'right', render: (s) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEdit(s); setForm({ nama: s.nama, kontak: s.kontak, telepon: s.telepon, alamat: s.alamat }); setModal(true) }}>Ubah</Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapus(s)}>Hapus</Button>
              </div>
            ) },
          ]}
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? 'Ubah Supplier' : 'Tambah Supplier'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button onClick={simpan}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Nama supplier</Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nama kontak</Label>
              <Input value={form.kontak} onChange={(e) => setForm({ ...form, kontak: e.target.value })} />
            </div>
            <div>
              <Label>Telepon</Label>
              <Input value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Alamat</Label>
            <Textarea rows={3} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!hapus}
        onClose={() => setHapus(null)}
        title="Hapus Supplier"
        footer={<><Button variant="secondary" onClick={() => setHapus(null)}>Batal</Button><Button variant="danger" onClick={() => { if (hapus) { hapusSupplier(hapus.id); push({ tipe: 'sukses', judul: 'Supplier dihapus' }) } setHapus(null) }}>Hapus</Button></>}
      >
        <p className="text-sm text-slate-600">Hapus supplier <span className="font-semibold">{hapus?.nama}</span>?</p>
      </Modal>
    </>
  )
}
