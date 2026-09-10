import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { hanyaSelesai } from '@/store/selectors'
import { exportCSV } from '@/lib/csv'
import { cetakLaporan } from '@/lib/print'
import { angka, rupiah, tanggalSingkat } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, PageHeader, Select, StatCard } from '@/components/ui'

type Periode = 'harian' | 'mingguan' | 'bulanan'

type Baris = { id: string; label: string; transaksi: number; omzet: number; hpp: number; laba: number }

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - ((day + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

export function LaporanPenjualan() {
  const { transaksi } = useDataStore()
  const push = useToast((s) => s.push)
  const [periode, setPeriode] = useState<Periode>('harian')

  const rows: Baris[] = useMemo(() => {
    const selesai = hanyaSelesai(transaksi)
    const map = new Map<string, Baris>()

    selesai.forEach((t) => {
      const d = new Date(t.waktu)
      let key: string
      let label: string
      if (periode === 'harian') {
        key = d.toISOString().slice(0, 10)
        label = tanggalSingkat(t.waktu)
      } else if (periode === 'mingguan') {
        const s = startOfWeek(d)
        key = s.toISOString().slice(0, 10)
        label = `Pekan ${tanggalSingkat(s.toISOString())}`
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      }
      const cur = map.get(key) ?? { id: key, label, transaksi: 0, omzet: 0, hpp: 0, laba: 0 }
      cur.transaksi += 1
      cur.omzet += t.total
      cur.hpp += t.hpp
      cur.laba += t.total - t.hpp
      map.set(key, cur)
    })

    return [...map.values()].sort((a, b) => (a.id < b.id ? 1 : -1))
  }, [transaksi, periode])

  const totalOmzet = rows.reduce((a, r) => a + r.omzet, 0)
  const totalHpp = rows.reduce((a, r) => a + r.hpp, 0)
  const totalLaba = rows.reduce((a, r) => a + r.laba, 0)
  const totalTrx = rows.reduce((a, r) => a + r.transaksi, 0)

  const unduhCSV = () => {
    exportCSV(
      `laporan-penjualan-${periode}.csv`,
      ['Periode', 'Jumlah Transaksi', 'Omzet', 'HPP', 'Laba Kotor'],
      rows.map((r) => [r.label, r.transaksi, r.omzet, r.hpp, r.laba]),
    )
    push({ tipe: 'sukses', judul: 'Laporan diekspor ke CSV' })
  }

  const cetak = () => {
    const html = `
      <table>
        <thead><tr><th>Periode</th><th class="num">Transaksi</th><th class="num">Omzet</th><th class="num">HPP</th><th class="num">Laba Kotor</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td>${r.label}</td><td class="num">${r.transaksi}</td><td class="num">${rupiah(r.omzet)}</td><td class="num">${rupiah(r.hpp)}</td><td class="num">${rupiah(r.laba)}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><td>TOTAL</td><td class="num">${totalTrx}</td><td class="num">${rupiah(totalOmzet)}</td><td class="num">${rupiah(totalHpp)}</td><td class="num">${rupiah(totalLaba)}</td></tr></tfoot>
      </table>`
    cetakLaporan('Laporan Penjualan', `Rekap ${periode}`, html)
    push({ tipe: 'info', judul: 'Menyiapkan cetak PDF', pesan: 'Gunakan "Save as PDF" pada dialog cetak.' })
  }

  return (
    <>
      <PageHeader
        judul="Laporan Penjualan"
        deskripsi="Laporan penjualan harian, mingguan, dan bulanan yang terintegrasi otomatis dari modul POS."
        aksi={
          <>
            <FR kode="FR-FIN-01" />
            <FR kode="FR-FIN-06" />
            <FR kode="FR-FIN-08" />
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Omzet" value={rupiah(totalOmzet)} tone="green" />
        <StatCard label="Total HPP" value={rupiah(totalHpp)} tone="amber" />
        <StatCard label="Laba Kotor" value={rupiah(totalLaba)} tone="brand" />
        <StatCard label="Jumlah Transaksi" value={angka(totalTrx)} tone="violet" />
      </div>

      <Card
        title="Rekapitulasi Penjualan"
        subtitle="Diurutkan dari periode terbaru"
        action={
          <div className="flex items-center gap-2">
            <Select value={periode} onChange={(e) => setPeriode(e.target.value as Periode)} className="w-36">
              <option value="harian">Harian</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
            </Select>
            <Button size="sm" variant="secondary" onClick={unduhCSV}>Export CSV</Button>
            <Button size="sm" variant="secondary" onClick={cetak}>Cetak PDF</Button>
          </div>
        }
      >
        <DataTable
          data={rows}
          kolom={[
            { key: 'label', header: 'Periode', render: (r) => <span className="font-medium text-slate-700">{r.label}</span> },
            { key: 'transaksi', header: 'Transaksi', align: 'right' },
            { key: 'omzet', header: 'Omzet', align: 'right', render: (r) => rupiah(r.omzet) },
            { key: 'hpp', header: 'HPP', align: 'right', render: (r) => <span className="text-slate-500">{rupiah(r.hpp)}</span> },
            { key: 'laba', header: 'Laba Kotor', align: 'right', render: (r) => <span className="font-semibold text-emerald-600">{rupiah(r.laba)}</span> },
            { key: 'margin', header: 'Margin', align: 'right', render: (r) => (
              <Badge warna={r.omzet > 0 && r.laba / r.omzet > 0.15 ? 'green' : 'amber'}>
                {r.omzet > 0 ? ((r.laba / r.omzet) * 100).toFixed(1) : '0'}%
              </Badge>
            ) },
          ]}
          kosong="Belum ada data penjualan"
        />
      </Card>
    </>
  )
}
