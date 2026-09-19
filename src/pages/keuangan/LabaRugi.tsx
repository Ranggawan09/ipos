import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { hanyaSelesai } from '@/store/selectors'
import { exportXLS } from '@/lib/csv'
import { cetakLaporan } from '@/lib/print'
import { rupiah, rupiahShort } from '@/lib/format'
import { Button, Card, FR, PageHeader, Select, StatCard } from '@/components/ui'

type Rentang = 'bulan' | '30hari' | 'semua'

const LABEL_EXP: Record<string, string> = {
  listrik: 'Listrik & air',
  sewa: 'Sewa tempat',
  gaji: 'Gaji karyawan',
  transport: 'Transport',
  lainnya: 'Lain-lain',
}

export function LabaRugi() {
  const { transaksi, pengeluaran } = useDataStore()
  const push = useToast((s) => s.push)
  const [rentang, setRentang] = useState<Rentang>('bulan')

  const batas = useMemo(() => {
    if (rentang === 'semua') return new Date(0)
    if (rentang === '30hari') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      d.setHours(0, 0, 0, 0)
      return d
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  }, [rentang])

  const trxPeriode = useMemo(
    () => hanyaSelesai(transaksi).filter((t) => new Date(t.waktu) >= batas),
    [transaksi, batas],
  )
  const expPeriode = useMemo(
    () => pengeluaran.filter((p) => new Date(p.tanggal) >= batas),
    [pengeluaran, batas],
  )

  const omzet = trxPeriode.reduce((a, t) => a + t.total, 0)
  const hpp = trxPeriode.reduce((a, t) => a + t.hpp, 0)
  const labaKotor = omzet - hpp
  const totalExp = expPeriode.reduce((a, p) => a + p.jumlah, 0)
  const labaBersih = labaKotor - totalExp

  const expPerKategori = Object.entries(
    expPeriode.reduce<Record<string, number>>((acc, p) => {
      acc[p.kategori] = (acc[p.kategori] ?? 0) + p.jumlah
      return acc
    }, {}),
  ).map(([k, v]) => ({ id: k, nama: LABEL_EXP[k] ?? k, nilai: v }))

  const grafik = [
    { nama: 'Omzet', nilai: omzet },
    { nama: 'HPP', nilai: hpp },
    { nama: 'Laba Kotor', nilai: labaKotor },
    { nama: 'Operasional', nilai: totalExp },
    { nama: 'Laba Bersih', nilai: labaBersih },
  ]
  const warnaGrafik = ['#1d6bf5', '#f59e0b', '#10b981', '#ef4444', labaBersih >= 0 ? '#8b5cf6' : '#ef4444']

  const unduhXLS = () => {
    exportXLS(
      'laba-rugi.xls',
      ['Komponen', 'Nilai'],
      [
        ['Pendapatan Penjualan', omzet],
        ['Harga Pokok Penjualan (HPP)', hpp],
        ['Laba Kotor', labaKotor],
        ...expPerKategori.map((e) => [e.nama, e.nilai]),
        ['Total Beban Operasional', totalExp],
        ['Laba Bersih', labaBersih],
      ],
    )
    push({ tipe: 'sukses', judul: 'Laporan laba rugi diekspor ke Excel (.xls)' })
  }

  const cetak = () => {
    const html = `
      <table>
        <tbody>
          <tr><td>Pendapatan Penjualan</td><td class="num">${rupiah(omzet)}</td></tr>
          <tr><td>Harga Pokok Penjualan (HPP)</td><td class="num">-${rupiah(hpp)}</td></tr>
          <tr><td><b>Laba Kotor</b></td><td class="num"><b>${rupiah(labaKotor)}</b></td></tr>
          ${expPerKategori.map((e) => `<tr><td>&nbsp;&nbsp;${e.nama}</td><td class="num">-${rupiah(e.nilai)}</td></tr>`).join('')}
          <tr><td>Total Beban Operasional</td><td class="num">-${rupiah(totalExp)}</td></tr>
          <tr><td><b>Laba Bersih</b></td><td class="num"><b>${rupiah(labaBersih)}</b></td></tr>
        </tbody>
      </table>`
    cetakLaporan('Laporan Laba Rugi', rentang === 'bulan' ? 'Bulan berjalan' : rentang === '30hari' ? '30 hari terakhir' : 'Seluruh periode', html)
  }

  return (
    <>
      <PageHeader
        judul="Laporan Laba Rugi"
        deskripsi="Estimasi laba rugi berdasarkan harga jual, harga pokok penjualan, dan beban operasional."
        aksi={
          <>
            <FR kode="FR-FIN-02" />
            <FR kode="FR-FIN-03" />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Periode:</span>
          <Select value={rentang} onChange={(e) => setRentang(e.target.value as Rentang)} className="w-44">
            <option value="bulan">Bulan berjalan</option>
            <option value="30hari">30 hari terakhir</option>
            <option value="semua">Seluruh periode</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={unduhXLS}>Export XLS</Button>
          <Button size="sm" variant="secondary" onClick={cetak}>Cetak PDF</Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendapatan" value={rupiah(omzet)} tone="green" />
        <StatCard label="Laba Kotor" value={rupiah(labaKotor)} hint={`HPP ${rupiah(hpp)}`} tone="brand" />
        <StatCard label="Beban Operasional" value={rupiah(totalExp)} tone="amber" />
        <StatCard
          label="Laba Bersih"
          value={rupiah(labaBersih)}
          hint={omzet > 0 ? `Margin bersih ${((labaBersih / omzet) * 100).toFixed(1)}%` : '-'}
          tone={labaBersih >= 0 ? 'violet' : 'rose'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Rincian Laba Rugi">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Pendapatan Penjualan</span>
              <span className="font-medium text-slate-800">{rupiah(omzet)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Harga Pokok Penjualan (HPP)</span>
              <span className="text-rose-600">-{rupiah(hpp)}</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-200 py-2">
              <span className="font-semibold text-slate-700">Laba Kotor</span>
              <span className="font-bold text-slate-800">{rupiah(labaKotor)}</span>
            </div>
            <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Beban Operasional</p>
            {expPerKategori.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">Tidak ada pengeluaran pada periode ini.</p>
            ) : (
              expPerKategori.map((e) => (
                <div key={e.id} className="flex justify-between py-1.5">
                  <span className="text-slate-600">{e.nama}</span>
                  <span className="text-rose-600">-{rupiah(e.nilai)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Total Beban</span>
              <span className="text-rose-600">-{rupiah(totalExp)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-300 pt-3">
              <span className="font-bold text-slate-700">Laba Bersih</span>
              <span className={`text-lg font-bold ${labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {rupiah(labaBersih)}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Visualisasi Komponen Laba Rugi">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafik} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => rupiahShort(Number(v))} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => rupiah(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="nilai" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {grafik.map((_, i) => <Cell key={i} fill={warnaGrafik[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Nilai HPP dan beban operasional ditampilkan sebagai nilai absolut.
          </p>
        </Card>
      </div>
    </>
  )
}
