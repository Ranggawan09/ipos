import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { tanggalJam } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, PageHeader, Select } from '@/components/ui'

export function StockOpname() {
  const { produk, kategori, pergerakan, stockOpname } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [input, setInput] = useState<Record<string, string>>({})

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return produk.filter(
      (p) => (!q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) && (!filterKat || p.kategoriId === filterKat),
    )
  }, [produk, cari, filterKat])

  const riwayat = useMemo(() => pergerakan.filter((p) => p.jenis === 'opname').slice(0, 30), [pergerakan])
  const namaProduk = (id: string) => produk.find((p) => p.id === id)?.nama ?? '-'

  const selisih = (p: (typeof produk)[number]) => {
    const v = input[p.id]
    if (v === undefined || v === '') return null
    return Number(v) - p.stok
  }

  const simpanBaris = (id: string) => {
    const v = input[id]
    if (v === undefined || v === '') return
    stockOpname({ produkId: id, stokFisik: Number(v), userId: currentUser?.id ?? 'USR-01' })
    push({ tipe: 'sukses', judul: 'Stock opname disimpan', pesan: `${namaProduk(id)} disesuaikan ke ${v}` })
    setInput((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const totalSelisih = rows.reduce((a, p) => a + (selisih(p) ?? 0), 0)
  const adaSelisih = rows.some((p) => selisih(p) !== null)

  return (
    <>
      <PageHeader
        judul="Stock Opname"
        deskripsi="Cocokkan stok sistem dengan hasil hitung fisik di gudang/toko."
        aksi={adaSelisih ? (
          <Badge warna={totalSelisih === 0 ? 'green' : 'amber'}>
            Total selisih: {totalSelisih > 0 ? '+' : ''}{totalSelisih} unit
          </Badge>
        ) : undefined}
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input placeholder="Cari produk..." value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>
          <Select value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
            <option value="">Semua kategori</option>
            {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Select>
        </div>
      </Card>

      <Card title="Lembar Hitung Fisik" subtitle="Masukkan jumlah fisik, lalu simpan per baris." action={<FR kode="FR-INV-05" />} className="mb-4">
        <DataTable
          data={rows}
          kolom={[
            { key: 'sku', header: 'SKU', render: (p) => <span className="font-mono text-xs text-slate-500">{p.sku}</span> },
            { key: 'nama', header: 'Produk', render: (p) => <span className="font-medium text-slate-700">{p.nama}</span> },
            { key: 'sistem', header: 'Stok Sistem', align: 'right', render: (p) => p.stok },
            { key: 'fisik', header: 'Stok Fisik', align: 'right', render: (p) => (
              <Input
                type="number"
                className="w-24 text-right"
                value={input[p.id] ?? ''}
                placeholder="-"
                onChange={(e) => setInput({ ...input, [p.id]: e.target.value })}
              />
            ) },
            { key: 'selisih', header: 'Selisih', align: 'right', render: (p) => {
              const s = selisih(p)
              if (s === null) return <span className="text-slate-300">-</span>
              if (s === 0) return <Badge warna="green">Cocok</Badge>
              return <Badge warna={s > 0 ? 'blue' : 'red'}>{s > 0 ? '+' : ''}{s}</Badge>
            } },
            { key: 'aksi', header: '', align: 'right', render: (p) => (
              <Button size="sm" variant="secondary" disabled={selisih(p) === null} onClick={() => simpanBaris(p.id)}>Simpan</Button>
            ) },
          ]}
        />
      </Card>

      <Card title="Riwayat Stock Opname Terakhir" action={<FR kode="FR-INV-07" />}>
        <DataTable
          data={riwayat}
          kolom={[
            { key: 'waktu', header: 'Waktu', render: (p) => <span className="text-xs text-slate-500">{tanggalJam(p.waktu)}</span> },
            { key: 'produk', header: 'Produk', render: (p) => namaProduk(p.produkId) },
            { key: 'sebelum', header: 'Stok Sistem', align: 'right', render: (p) => p.stokSebelum },
            { key: 'sesudah', header: 'Stok Fisik', align: 'right', render: (p) => p.stokSesudah },
            { key: 'selisih', header: 'Selisih', align: 'right', render: (p) => (
              <span className={p.jumlah === 0 ? 'text-emerald-600' : p.jumlah > 0 ? 'text-brand-600' : 'text-rose-600'}>
                {p.jumlah > 0 ? '+' : ''}{p.jumlah}
              </span>
            ) },
          ]}
          kosong="Belum ada stock opname"
        />
      </Card>
    </>
  )
}
