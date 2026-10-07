import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Produk as TProduk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

export function Produk() {
  const navigate = useNavigate()
  const { produk, kategori, supplier, hapusProduk, resepKonversi } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [filterStok, setFilterStok] = useState('')
  const [hapusTarget, setHapusTarget] = useState<TProduk | null>(null)

  const isOwner = currentUser?.role === 'owner'
  const katNama = (id: string) => kategori.find((k) => k.id === id)?.nama ?? '-'

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return produk.filter((p) => {
      const cocok =
        !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
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
    navigate('/admin/produk/tambah')
  }

  const bukaEdit = (p: TProduk) => {
    if (isOwner) {
      navigate(`/owner/produk/${p.id}`)
    } else {
      navigate(`/admin/produk/${p.id}/edit`)
    }
  }

  const bukaDuplikat = (p: TProduk) => {
    navigate(`/admin/produk/${p.id}/duplikat`)
  }

  const konfirmasiHapus = () => {
    if (!hapusTarget) return
    hapusProduk(hapusTarget.id)
    push({ tipe: 'sukses', judul: 'Produk dihapus', pesan: hapusTarget.nama })
    setHapusTarget(null)
  }

  return (
    <>
      <PageHeader
        judul="Data Produk"
        deskripsi={isOwner ? "Pantauan stok dan harga produk toko (mode baca owner)." : "Kelola seluruh item barang toko beserta harga dan batas stok minimum."}
        aksi={
          <>
            <Button variant="secondary" onClick={() => setCari('')}>
              {rows.length} dari {produk.length} produk
            </Button>
            {!isOwner && <Button onClick={bukaTambah}>Tambah Produk</Button>}
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
              placeholder="Nama atau SKU produk..."
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
            {
              key: 'sku', header: 'SKU', render: (p) => (
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-700">{p.sku}</p>
                </div>
              )
            },
            {
              key: 'nama', header: 'Nama Produk', render: (p) => {
                const isCurah = resepKonversi.some((r) => r.produkCurahId === p.id)
                const isKemasan = resepKonversi.some((r) => r.items.some((it) => it.produkKemasanId === p.id))
                const supp = supplier.find((s) => s.id === p.supplierId)
                return (
                  <div>
                    <p className="font-medium text-slate-700">
                      {p.nama}
                      {isCurah && <Badge warna="blue" className="ml-1.5 text-[10px]">Curah</Badge>}
                      {isKemasan && <Badge warna="purple" className="ml-1.5 text-[10px]">Kemasan</Badge>}
                      {p.satuanBertingkat && p.satuanBertingkat.length > 0 && (
                        <Badge warna="green" className="ml-1.5 text-[10px]">
                          Multi-Satuan ({p.satuanBertingkat.map((s) => s.namaSatuan).join(' → ')})
                        </Badge>
                      )}
                      {p.varian && p.varian.length > 0 && (
                        <Badge warna="purple" className="ml-1.5 text-[10px]">
                          Varian Bobot ({p.varian.map((v) => v.nama).join(', ')})
                        </Badge>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                      <span>{katNama(p.kategoriId)} | Dasar: {p.satuan}</span>
                      {supp ? (
                        <span className="inline-flex items-center text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                          {supp.nama}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                          Supplier: -
                        </span>
                      )}
                    </div>
                  </div>
                )
              }
            },
            { key: 'hargaBeli', header: 'Harga Beli', align: 'right', render: (p) => rupiah(p.hargaBeli) },
            {
              key: 'hargaJual', header: 'Harga Jual', align: 'right', render: (p) => (
                <div>
                  <p className="font-medium">{rupiah(p.hargaJual)}</p>
                  <p className="text-[11px] text-emerald-600">
                    margin {p.hargaBeli ? Math.round(((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100) : 0}%
                  </p>
                </div>
              )
            },
            {
              key: 'stok', header: 'Stok', align: 'right', render: (p) => (
                <div>
                  <span className={`font-semibold ${p.stok === 0 ? 'text-rose-600' : p.stok <= p.stokMinimum ? 'text-amber-600' : 'text-slate-700'}`}>
                    {angka(p.stok)}
                  </span>
                  <p className="text-[11px] text-slate-400">min {p.stokMinimum}</p>
                </div>
              )
            },
            {
              key: 'status', header: 'Status & Expired', render: (p) => (
                <div className="space-y-1">
                  <div>
                    {p.stok === 0 ? <Badge warna="red">Habis</Badge>
                      : p.stok <= p.stokMinimum ? <Badge warna="amber">Stok kritis</Badge>
                        : <Badge warna="green">Aman</Badge>}
                  </div>
                  {p.tglExpired && (
                    <div className="text-[10px] px-1.5 py-0.5 font-medium text-slate-600 flex items-center gap-1">
                      <span>Exp: {p.tglExpired}</span>
                      {p.batches && p.batches.filter((b) => b.stok > 0).length > 1 && (
                        <span className="text-[9px] font-bold text-brand-700 bg-brand-50 px-1 rounded border border-brand-200">
                          {p.batches.filter((b) => b.stok > 0).length} batch
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'aksi', header: '', align: 'right', render: (p) => (
                <div className="flex justify-end gap-1">
                  {isOwner ? (
                    <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Lihat</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => bukaDuplikat(p)} title="Duplikat produk ini">Duplikat</Button>
                      <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Ubah</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapusTarget(p)}>Hapus</Button>
                    </>
                  )}
                </div>
              )
            },
          ]}
          kosong="Produk tidak ditemukan"
        />
      </Card>

      {/* Modal Konfirmasi Hapus Produk */}
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
