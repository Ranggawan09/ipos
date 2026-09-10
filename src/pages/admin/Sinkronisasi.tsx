import { useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { tanggalJam } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Modal, PageHeader, StatCard } from '@/components/ui'

export function Sinkronisasi() {
  const { logSinkron, tambahLogSinkron, resetData, transaksi, produk, pergerakan } = useDataStore()
  const push = useToast((s) => s.push)
  const [resetOpen, setResetOpen] = useState(false)

  const terakhirCloud = logSinkron.find((l) => l.jenis === 'cloud')

  const sinkron = () => {
    tambahLogSinkron({
      waktu: new Date().toISOString(),
      jenis: 'cloud',
      jumlahData: transaksi.length,
      keterangan: 'Sinkronisasi manual seluruh data ke cloud',
      status: 'sukses',
    })
    push({ tipe: 'sukses', judul: 'Sinkronisasi cloud dijalankan', pesan: 'Seluruh data lokal terkirim sebagai cadangan.' })
  }

  const konfirmasiReset = () => {
    resetData()
    setResetOpen(false)
    push({ tipe: 'sukses', judul: 'Data demo dikembalikan ke kondisi awal' })
  }

  return (
    <>
      <PageHeader
        judul="Sinkronisasi & Data"
        deskripsi="Server lokal toko sebagai sumber data utama, dengan pencadangan berkala ke basis data cloud (satu arah)."
        aksi={<FR kode="NFR-Keamanan" />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produk" value={produk.length} tone="brand" />
        <StatCard label="Transaksi" value={transaksi.length} tone="green" />
        <StatCard label="Pergerakan Stok" value={pergerakan.length} tone="violet" />
        <StatCard
          label="Sinkronisasi Terakhir"
          value={terakhirCloud ? tanggalJam(terakhirCloud.waktu).split(' ')[1] : '-'}
          hint={terakhirCloud ? tanggalJam(terakhirCloud.waktu).split(' ')[0] : 'Belum pernah'}
          tone="amber"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Status Koneksi" className="lg:col-span-1">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
              <span className="text-emerald-700">Server lokal (WiFi toko)</span>
              <Badge warna="green">Terhubung</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5">
              <span className="text-brand-700">Basis data cloud (backup)</span>
              <Badge warna="blue">Aktif</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="text-slate-600">Hak akses berbasis peran</span>
              <Badge warna="violet">Aktif</Badge>
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={sinkron}>Sinkronkan Sekarang ke Cloud</Button>
          <p className="mt-2 text-[11px] text-slate-400">
            Pada sistem nyata, proses ini berjalan otomatis secara berkala melalui HTTPS dengan token otentikasi.
          </p>
        </Card>

        <Card title="Log Sinkronisasi" className="lg:col-span-2">
          <DataTable
            data={logSinkron}
            kolom={[
              { key: 'waktu', header: 'Waktu', render: (l) => <span className="text-xs text-slate-500">{tanggalJam(l.waktu)}</span> },
              { key: 'jenis', header: 'Jenis', render: (l) => l.jenis === 'cloud' ? <Badge warna="blue">Cloud</Badge> : <Badge warna="violet">Lokal</Badge> },
              { key: 'keterangan', header: 'Keterangan', className: 'text-slate-600' },
              { key: 'jumlah', header: 'Data', align: 'right', render: (l) => l.jumlahData },
              { key: 'status', header: 'Status', render: (l) => l.status === 'sukses' ? <Badge warna="green">Sukses</Badge> : <Badge warna="amber">Menunggu</Badge> },
            ]}
            kosong="Belum ada log sinkronisasi"
          />
        </Card>
      </div>

      <Card title="Zona Demo" subtitle="Kembalikan seluruh data ke kondisi awal untuk presentasi ulang." className="border-rose-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-slate-600">
            Semua data demo tersimpan pada perangkat ini (localStorage browser). Reset akan menghapus
            seluruh perubahan: produk, transaksi, shift, pengeluaran, dan log sinkronisasi.
          </p>
          <Button variant="danger" onClick={() => setResetOpen(true)}>Reset Data Demo</Button>
        </div>
      </Card>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Data Demo"
        footer={<><Button variant="secondary" onClick={() => setResetOpen(false)}>Batal</Button><Button variant="danger" onClick={konfirmasiReset}>Ya, Reset Sekarang</Button></>}
      >
        <p className="text-sm text-slate-600">
          Seluruh data akan dikembalikan ke data contoh awal. Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </>
  )
}
