import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { tanggalJam } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select, Textarea } from '@/components/ui'

const JENIS = [
  { value: 'keluar_rusak', label: 'Barang Rusak' },
  { value: 'keluar_hilang', label: 'Barang Hilang' },
  { value: 'retur_supplier', label: 'Retur ke Supplier' },
] as const

export function BarangKeluar() {
  const { produk, pergerakan, barangKeluar } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [modal, setModal] = useState(false)
  const [produkId, setProdukId] = useState(produk[0]?.id ?? '')
  const [jumlah, setJumlah] = useState(1)
  const [jenis, setJenis] = useState<(typeof JENIS)[number]['value']>('keluar_rusak')
  const [keterangan, setKeterangan] = useState('')

  const rows = useMemo(
    () => pergerakan.filter((p) => p.jenis === 'keluar_rusak' || p.jenis === 'keluar_hilang' || p.jenis === 'retur_supplier'),
    [pergerakan],
  )

  const namaProduk = (id: string) => produk.find((p) => p.id === id)?.nama ?? '-'
  const produkTerpilih = produk.find((p) => p.id === produkId)

  const simpan = () => {
    if (!produkId || jumlah <= 0) {
      push({ tipe: 'error', judul: 'Lengkapi data barang keluar' })
      return
    }
    if (produkTerpilih && jumlah > produkTerpilih.stok) {
      push({ tipe: 'error', judul: 'Jumlah melebihi stok', pesan: `Stok tersedia ${produkTerpilih.stok}` })
      return
    }
    barangKeluar({
      produkId,
      jumlah,
      jenis,
      keterangan: keterangan || JENIS.find((j) => j.value === jenis)!.label,
      userId: currentUser?.id ?? 'USR-01',
    })
    push({ tipe: 'sukses', judul: 'Barang keluar dicatat', pesan: `${namaProduk(produkId)} sebanyak ${jumlah}` })
    setModal(false)
    setJumlah(1)
    setKeterangan('')
  }

  return (
    <>
      <PageHeader
        judul="Barang Keluar"
        deskripsi="Catat barang keluar selain penjualan: rusak, hilang, atau retur ke supplier."
        aksi={<Button onClick={() => setModal(true)}>Catat Barang Keluar</Button>}
      />

      <Card title="Riwayat Barang Keluar Non-Penjualan" action={<FR kode="FR-INV-04" />}>
        <DataTable
          data={rows}
          kolom={[
            { key: 'waktu', header: 'Waktu', render: (p) => <span className="text-xs text-slate-500">{tanggalJam(p.waktu)}</span> },
            { key: 'produk', header: 'Produk', render: (p) => namaProduk(p.produkId) },
            { key: 'jenis', header: 'Jenis', render: (p) =>
              p.jenis === 'keluar_rusak' ? <Badge warna="red">Rusak</Badge>
              : p.jenis === 'keluar_hilang' ? <Badge warna="amber">Hilang</Badge>
              : <Badge warna="violet">Retur Supplier</Badge> },
            { key: 'jumlah', header: 'Jumlah', align: 'right', render: (p) => <span className="font-medium text-rose-600">{p.jumlah}</span> },
            { key: 'stok', header: 'Stok Akhir', align: 'right', render: (p) => p.stokSesudah },
            { key: 'keterangan', header: 'Keterangan' },
          ]}
          kosong="Belum ada pencatatan barang keluar"
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Catat Barang Keluar"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button onClick={simpan}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Produk</Label>
            <Select value={produkId} onChange={(e) => setProdukId(e.target.value)}>
              {produk.map((p) => <option key={p.id} value={p.id}>{p.nama} (stok: {p.stok})</option>)}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Jenis</Label>
              <Select value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)}>
                {JENIS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Jumlah</Label>
              <Input type="number" min={1} value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Keterangan</Label>
            <Textarea rows={2} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Contoh: kemasan bocor saat pengiriman" />
          </div>
          {produkTerpilih && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Stok saat ini <span className="font-semibold text-slate-700">{produkTerpilih.stok}</span>, setelah keluar menjadi{' '}
              <span className="font-semibold text-slate-700">{Math.max(0, produkTerpilih.stok - jumlah)}</span>
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
