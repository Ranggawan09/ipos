import { useMemo, useState } from 'react'
import type { JenisPergerakan } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { tanggalJam } from '@/lib/format'
import { getMasukKeluar } from '@/store/selectors'
import { Badge, Card, DataTable, FR, Input, PageHeader, Select, StatCard } from '@/components/ui'

const LABEL: Record<JenisPergerakan, string> = {
  masuk: 'Barang Masuk',
  penjualan: 'Penjualan',
  keluar_rusak: 'Rusak',
  keluar_hilang: 'Hilang',
  retur_supplier: 'Retur Supplier',
  retur_pelanggan: 'Retur Pelanggan',
  opname: 'Stock Opname',
  void: 'Void Transaksi',
  repack_keluar: 'Repack Keluar',
  repack_masuk: 'Repack Masuk',
  waste: 'Waste',
}

const WARNA: Record<JenisPergerakan, 'green' | 'blue' | 'red' | 'amber' | 'violet' | 'slate' | 'purple'> = {
  masuk: 'green',
  penjualan: 'blue',
  keluar_rusak: 'red',
  keluar_hilang: 'amber',
  retur_supplier: 'violet',
  retur_pelanggan: 'green',
  opname: 'slate',
  void: 'amber',
  repack_keluar: 'purple',
  repack_masuk: 'green',
  waste: 'red',
}

export function RiwayatStok() {
  const { pergerakan, produk, users } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const [cari, setCari] = useState('')
  const [jenis, setJenis] = useState('')
  const [batas, setBatas] = useState(100)

  const namaProduk = (id: string) => produk.find((p) => p.id === id)?.nama ?? 'Produk dihapus'
  const namaUser = (id: string) => users.find((u) => u.id === id)?.nama ?? id

  const filtered = useMemo(() => {
    const q = cari.toLowerCase()
    return pergerakan.filter((p) => {
      const cocok = !q || namaProduk(p.produkId).toLowerCase().includes(q) || p.keterangan.toLowerCase().includes(q)
      return cocok && (!jenis || p.jenis === jenis)
    })
  }, [pergerakan, cari, jenis])

  const { masuk, keluar } = getMasukKeluar(filtered)

  return (
    <>
      <PageHeader
        judul="Riwayat Pergerakan Stok"
        deskripsi="Catatan setiap perubahan stok: jenis transaksi, jumlah, waktu, dan pengguna."
        aksi={<FR kode="FR-INV-07" />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Pergerakan" value={pergerakan.length} tone="brand" />
        <StatCard label="Unit Masuk" value={masuk} tone="green" />
        <StatCard label="Unit Keluar" value={keluar} tone="rose" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input placeholder="Cari produk atau keterangan..." value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>
          <Select value={jenis} onChange={(e) => setJenis(e.target.value)}>
            <option value="">Semua jenis</option>
            {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </Card>

      <Card title={`${filtered.length} pergerakan`} subtitle={`Menampilkan ${Math.min(batas, filtered.length)} terbaru`}>
        <DataTable
          data={filtered.slice(0, batas)}
          kolom={[
            { key: 'waktu', header: 'Waktu', render: (p) => <span className="whitespace-nowrap text-xs text-slate-500">{tanggalJam(p.waktu)}</span> },
            { key: 'produk', header: 'Produk', render: (p) => <span className="font-medium text-slate-700">{namaProduk(p.produkId)}</span> },
            { key: 'jenis', header: 'Jenis', render: (p) => <Badge warna={WARNA[p.jenis]}>{LABEL[p.jenis]}</Badge> },
            { key: 'jumlah', header: 'Jumlah', align: 'right', render: (p) => (
              <span className={`font-semibold ${p.jumlah > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {p.jumlah > 0 ? '+' : ''}{p.jumlah}
              </span>
            ) },
            { key: 'stok', header: 'Stok', align: 'right', render: (p) => <span className="text-xs text-slate-500">{p.stokSebelum} → {p.stokSesudah}</span> },
            { key: 'keterangan', header: 'Keterangan', className: 'max-w-xs text-slate-500' },
            { key: 'user', header: 'Pengguna', render: (p) => <span className="text-xs text-slate-500">{p.userId === currentUser?.id ? 'Anda' : namaUser(p.userId)}</span> },
          ]}
        />
        {batas < filtered.length && (
          <div className="mt-3 text-center">
            <button onClick={() => setBatas((b) => b + 100)} className="text-sm font-medium text-brand-600 hover:underline">
              Tampilkan {Math.min(100, filtered.length - batas)} pergerakan lagi
            </button>
          </div>
        )}
      </Card>
    </>
  )
}
