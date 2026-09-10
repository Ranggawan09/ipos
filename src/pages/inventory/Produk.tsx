import { useMemo, useState } from 'react'
import type { Produk as TProduk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

const kosong: Omit<TProduk, 'id'> = {
  sku: '', barcode: '', nama: '', kategoriId: '', satuan: 'pcs',
  hargaBeli: 0, hargaJual: 0, stok: 0, stokMinimum: 5, aktif: true,
}

export function Produk() {
  const { produk, kategori, simpanProduk, hapusProduk, resepKonversi } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [filterStok, setFilterStok] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TProduk | null>(null)
  const [form, setForm] = useState<Omit<TProduk, 'id'>>(kosong)
  const [hapusTarget, setHapusTarget] = useState<TProduk | null>(null)

  const katNama = (id: string) => kategori.find((k) => k.id === id)?.nama ?? '-'

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return produk.filter((p) => {
      const cocok =
        !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)
      const kat = !filterKat || p.kategoriId === filterKat
      const stok =
        filterStok === 'kritis' ? p.stok <= p.stokMinimum :
        filterStok === 'habis' ? p.stok === 0 :
        filterStok === 'aman' ? p.stok > p.stokMinimum : true
      return cocok && kat && stok
    })
  }, [produk, cari, filterKat, filterStok])

  const totalNilai = rows.reduce((a, p) => a + p.stok * p.hargaBeli, 0)

  const bukaTambah = () => {
    setEdit(null)
    setForm({ ...kosong, kategoriId: kategori[0]?.id ?? '', sku: `SKU${String(produk.length + 1).padStart(4, '0')}`, barcode: String(8990000000 + produk.length + 1) })
    setModal(true)
  }

  const bukaEdit = (p: TProduk) => {
    setEdit(p)
    setForm({ ...p })
    setModal(true)
  }

  const simpan = () => {
    if (!form.nama.trim() || !form.sku.trim()) {
      push({ tipe: 'error', judul: 'Data belum lengkap', pesan: 'Nama dan SKU wajib diisi.' })
      return
    }
    simpanProduk(edit ? { ...form, id: edit.id } : form)
    push({ tipe: 'sukses', judul: edit ? 'Produk diperbarui' : 'Produk ditambahkan', pesan: form.nama })
    setModal(false)
  }

  const konfirmasiHapus = () => {
    if (!hapusTarget) return
    hapusProduk(hapusTarget.id)
    push({ tipe: 'sukses', judul: 'Produk dihapus', pesan: hapusTarget.nama })
    setHapusTarget(null)
  }

  const margin = form.hargaJual - form.hargaBeli
  const marginPct = form.hargaBeli > 0 ? (margin / form.hargaBeli) * 100 : 0

  return (
    <>
      <PageHeader
        judul="Data Produk"
        deskripsi="Kelola seluruh item barang toko beserta harga dan batas stok minimum."
        aksi={
          <>
            <Button variant="secondary" onClick={() => setCari('')}>
              {rows.length} dari {produk.length} produk
            </Button>
            <Button onClick={bukaTambah}>Tambah Produk</Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Cari produk</Label>
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Nama, SKU, atau barcode..."
            />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status stok</Label>
            <Select value={filterStok} onChange={(e) => setFilterStok(e.target.value)}>
              <option value="">Semua</option>
              <option value="kritis">Di bawah minimum</option>
              <option value="habis">Stok habis</option>
              <option value="aman">Stok aman</option>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Nilai stok (harga beli) untuk hasil filter: <span className="font-semibold text-slate-700">{rupiah(totalNilai)}</span>
          <FR kode="FR-INV-01" />
          <FR kode="FR-INV-02" />
          <FR kode="FR-INV-06" />
        </p>
      </Card>

      <Card>
        <DataTable
          data={rows}
          kolom={[
            { key: 'sku', header: 'SKU / Barcode', render: (p) => (
              <div>
                <p className="font-mono text-xs text-slate-600">{p.sku}</p>
                <p className="font-mono text-[11px] text-slate-400">{p.barcode}</p>
              </div>
            ) },
            { key: 'nama', header: 'Nama Produk', render: (p) => {
              const isCurah = resepKonversi.some((r) => r.produkCurahId === p.id)
              const isKemasan = resepKonversi.some((r) => r.items.some((it) => it.produkKemasanId === p.id))
              return (
                <div>
                  <p className="font-medium text-slate-700">
                    {p.nama}
                    {isCurah && <Badge warna="blue" className="ml-1.5 text-[10px]">Curah</Badge>}
                    {isKemasan && <Badge warna="purple" className="ml-1.5 text-[10px]">Kemasan</Badge>}
                  </p>
                  <p className="text-[11px] text-slate-400">{katNama(p.kategoriId)} &middot; {p.satuan}</p>
                </div>
              )
            } },
            { key: 'hargaBeli', header: 'Harga Beli', align: 'right', render: (p) => rupiah(p.hargaBeli) },
            { key: 'hargaJual', header: 'Harga Jual', align: 'right', render: (p) => (
              <div>
                <p className="font-medium">{rupiah(p.hargaJual)}</p>
                <p className="text-[11px] text-emerald-600">
                  margin {p.hargaBeli ? Math.round(((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100) : 0}%
                </p>
              </div>
            ) },
            { key: 'stok', header: 'Stok', align: 'right', render: (p) => (
              <div>
                <span className={`font-semibold ${p.stok === 0 ? 'text-rose-600' : p.stok <= p.stokMinimum ? 'text-amber-600' : 'text-slate-700'}`}>
                  {angka(p.stok)}
                </span>
                <p className="text-[11px] text-slate-400">min {p.stokMinimum}</p>
              </div>
            ) },
            { key: 'status', header: 'Status', render: (p) =>
              p.stok === 0 ? <Badge warna="red">Habis</Badge>
              : p.stok <= p.stokMinimum ? <Badge warna="amber">Stok kritis</Badge>
              : <Badge warna="green">Aman</Badge> },
            { key: 'aksi', header: '', align: 'right', render: (p) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Ubah</Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapusTarget(p)}>Hapus</Button>
              </div>
            ) },
          ]}
          kosong="Produk tidak ditemukan"
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? 'Ubah Produk' : 'Tambah Produk'}
        lebar="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={simpan}>Simpan</Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nama produk <span className="text-rose-500">*</span></Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <Label>SKU <span className="text-rose-500">*</span></Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={form.kategoriId} onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </Select>
          </div>
          <div>
            <Label>Satuan</Label>
            <Input value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
          </div>
          <div>
            <Label>Harga beli</Label>
            <Input
              type="number"
              value={form.hargaBeli}
              onChange={(e) => setForm({ ...form, hargaBeli: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Harga jual</Label>
            <Input
              type="number"
              value={form.hargaJual}
              onChange={(e) => setForm({ ...form, hargaJual: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Stok</Label>
            <Input
              type="number"
              value={form.stok}
              onChange={(e) => setForm({ ...form, stok: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Stok minimum</Label>
            <Input
              type="number"
              value={form.stokMinimum}
              onChange={(e) => setForm({ ...form, stokMinimum: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span>Margin: <span className="font-semibold">{rupiah(margin)}</span></span>
              <span className={marginPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {marginPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              />
              Produk aktif dijual
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        title="Hapus Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHapusTarget(null)}>Batal</Button>
            <Button variant="danger" onClick={konfirmasiHapus}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Hapus <span className="font-semibold">{hapusTarget?.nama}</span>? Tindakan ini tidak dapat dibatalkan
          dan akan dicatat sebagai perubahan data produk.
        </p>
        <p className="mt-2 text-xs text-slate-400">Operator: {currentUser?.nama}</p>
      </Modal>
    </>
  )
}
