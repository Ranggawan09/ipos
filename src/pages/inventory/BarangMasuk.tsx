import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, toDateInput } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

type Baris = { produkId: string; qty: number; hargaBeli: number }

export function BarangMasuk() {
  const { produk, supplier, penerimaan, terimaBarang } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [modal, setModal] = useState(false)
  const [supplierId, setSupplierId] = useState(supplier[0]?.id ?? '')
  const [metode, setMetode] = useState<'tunai' | 'kredit'>('tunai')
  const [jatuhTempo, setJatuhTempo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return toDateInput(d.toISOString())
  })
  const [baris, setBaris] = useState<Baris[]>([{ produkId: produk[0]?.id ?? '', qty: 1, hargaBeli: produk[0]?.hargaBeli ?? 0 }])
  const [cari, setCari] = useState('')

  const total = baris.reduce((a, b) => a + b.qty * b.hargaBeli, 0)

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return penerimaan.filter((p) => {
      const sup = supplier.find((s) => s.id === p.supplierId)?.nama ?? ''
      return !q || p.nomor.toLowerCase().includes(q) || sup.toLowerCase().includes(q)
    })
  }, [penerimaan, supplier, cari])

  const tambahBaris = () => {
    const p = produk[0]
    setBaris([...baris, { produkId: p?.id ?? '', qty: 1, hargaBeli: p?.hargaBeli ?? 0 }])
  }

  const ubahBaris = (i: number, patch: Partial<Baris>) => {
    setBaris(baris.map((b, idx) => {
      if (idx !== i) return b
      const next = { ...b, ...patch }
      if (patch.produkId) {
        const p = produk.find((x) => x.id === patch.produkId)
        if (p) next.hargaBeli = p.hargaBeli
      }
      return next
    }))
  }

  const reset = () => {
    setSupplierId(supplier[0]?.id ?? '')
    setMetode('tunai')
    setBaris([{ produkId: produk[0]?.id ?? '', qty: 1, hargaBeli: produk[0]?.hargaBeli ?? 0 }])
  }

  const simpan = () => {
    const valid = baris.filter((b) => b.produkId && b.qty > 0)
    if (valid.length === 0) {
      push({ tipe: 'error', judul: 'Belum ada item barang' })
      return
    }
    if (!supplierId) {
      push({ tipe: 'error', judul: 'Pilih supplier terlebih dahulu' })
      return
    }
    terimaBarang({
      supplierId,
      items: valid,
      metode,
      jatuhTempo: metode === 'kredit' ? new Date(jatuhTempo).toISOString() : undefined,
      userId: currentUser?.id ?? 'USR-01',
    })
    push({
      tipe: 'sukses',
      judul: 'Penerimaan barang dicatat',
      pesan: `${valid.length} item, total ${rupiah(total)}${metode === 'kredit' ? ' (kredit)' : ''}`,
    })
    setModal(false)
    reset()
  }

  return (
    <>
      <PageHeader
        judul="Barang Masuk"
        deskripsi="Catat penerimaan barang dari supplier beserta jumlah dan harga beli."
        aksi={<Button onClick={() => { reset(); setModal(true) }}>Catat Penerimaan</Button>}
      />

      <Card
        title="Riwayat Penerimaan Barang"
        subtitle="Stok produk otomatis bertambah saat penerimaan disimpan."
        action={<FR kode="FR-INV-03" />}
      >
        <div className="mb-3 max-w-sm">
          <Input placeholder="Cari nomor / supplier..." value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <DataTable
          data={rows}
          kolom={[
            { key: 'nomor', header: 'No. Penerimaan', render: (p) => <span className="font-mono text-xs">{p.nomor}</span> },
            { key: 'supplier', header: 'Supplier', render: (p) => supplier.find((s) => s.id === p.supplierId)?.nama ?? '-' },
            { key: 'items', header: 'Item', align: 'right', render: (p) => `${p.items.length} item` },
            { key: 'total', header: 'Total', align: 'right', render: (p) => <span className="font-medium">{rupiah(p.total)}</span> },
            { key: 'metode', header: 'Pembayaran', render: (p) => p.metode === 'kredit' ? <Badge warna="amber">Kredit</Badge> : <Badge warna="green">Tunai</Badge> },
            { key: 'waktu', header: 'Waktu', render: (p) => <span className="text-xs text-slate-500">{tanggalJam(p.waktu)}</span> },
          ]}
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Catat Penerimaan Barang"
        lebar="max-w-3xl"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button onClick={simpan}>Simpan Penerimaan</Button></>}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {supplier.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </Select>
            </div>
            <div>
              <Label>Metode pembayaran</Label>
              <Select value={metode} onChange={(e) => setMetode(e.target.value as 'tunai' | 'kredit')}>
                <option value="tunai">Tunai</option>
                <option value="kredit">Kredit (menjadi hutang)</option>
              </Select>
            </div>
            <div>
              <Label>Jatuh tempo</Label>
              <Input type="date" value={jatuhTempo} disabled={metode === 'tunai'} onChange={(e) => setJatuhTempo(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">Item Barang</p>
              <Button size="sm" variant="secondary" onClick={tambahBaris}>Tambah baris</Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto p-3">
              {baris.map((b, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-6">
                    <Label>Produk</Label>
                    <Select value={b.produkId} onChange={(e) => ubahBaris(i, { produkId: e.target.value })}>
                      {produk.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.sku})</option>)}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Qty</Label>
                    <Input type="number" min={1} value={b.qty} onChange={(e) => ubahBaris(i, { qty: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-3">
                    <Label>Harga beli</Label>
                    <Input type="number" value={b.hargaBeli} onChange={(e) => ubahBaris(i, { hargaBeli: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-1 pb-2 text-right">
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setBaris(baris.filter((_, idx) => idx !== i))}>×</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-500">Total penerimaan</span>
              <span className="text-lg font-bold text-slate-800">{rupiah(total)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
