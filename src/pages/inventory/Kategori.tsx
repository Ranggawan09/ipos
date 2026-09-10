import { useState } from 'react'
import type { Kategori as TKategori } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { Button, Card, DataTable, FR, Input, Label, Modal, PageHeader } from '@/components/ui'

const kosong = { nama: '', deskripsi: '' }

export function Kategori() {
  const { kategori, produk, simpanKategori, hapusKategori } = useDataStore()
  const push = useToast((s) => s.push)
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TKategori | null>(null)
  const [form, setForm] = useState(kosong)
  const [hapus, setHapus] = useState<TKategori | null>(null)

  const jumlahProduk = (id: string) => produk.filter((p) => p.kategoriId === id).length

  const simpan = () => {
    if (!form.nama.trim()) {
      push({ tipe: 'error', judul: 'Nama kategori wajib diisi' })
      return
    }
    simpanKategori(edit ? { ...form, id: edit.id } : form)
    push({ tipe: 'sukses', judul: edit ? 'Kategori diperbarui' : 'Kategori ditambahkan' })
    setModal(false)
  }

  return (
    <>
      <PageHeader
        judul="Kategori Produk"
        deskripsi="Pengelompokan produk untuk mempermudah pencarian dan pelaporan."
        aksi={
          <Button onClick={() => { setEdit(null); setForm(kosong); setModal(true) }}>
            Tambah Kategori
          </Button>
        }
      />
      <Card title="Daftar Kategori" action={<FR kode="FR-INV-01" />}>
        <DataTable
          data={kategori}
          kolom={[
            { key: 'nama', header: 'Nama Kategori', render: (k) => <span className="font-medium text-slate-700">{k.nama}</span> },
            { key: 'deskripsi', header: 'Deskripsi' },
            { key: 'jumlah', header: 'Jumlah Produk', align: 'right', render: (k) => jumlahProduk(k.id) },
            { key: 'aksi', header: '', align: 'right', render: (k) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEdit(k); setForm({ nama: k.nama, deskripsi: k.deskripsi }); setModal(true) }}>Ubah</Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapus(k)} disabled={jumlahProduk(k.id) > 0}>Hapus</Button>
              </div>
            ) },
          ]}
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? 'Ubah Kategori' : 'Tambah Kategori'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button onClick={simpan}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Nama kategori</Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Input value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!hapus}
        onClose={() => setHapus(null)}
        title="Hapus Kategori"
        footer={<><Button variant="secondary" onClick={() => setHapus(null)}>Batal</Button><Button variant="danger" onClick={() => { if (hapus) { hapusKategori(hapus.id); push({ tipe: 'sukses', judul: 'Kategori dihapus' }) } setHapus(null) }}>Hapus</Button></>}
      >
        <p className="text-sm text-slate-600">Hapus kategori <span className="font-semibold">{hapus?.nama}</span>?</p>
      </Modal>
    </>
  )
}
