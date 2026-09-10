import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { exportCSV } from '@/lib/csv'
import { cetakLaporan } from '@/lib/print'
import { rupiah, tanggalJam } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, PageHeader, Select, StatCard } from '@/components/ui'

export function Rekonsiliasi() {
  const { shifts, users, transaksi } = useDataStore()
  const [filterKasir, setFilterKasir] = useState('')
  const [dari, setDari] = useState('')

  const rows = useMemo(() => {
    return shifts
      .filter((s) => s.status === 'tutup')
      .filter((s) => (!filterKasir || s.kasirId === filterKasir) && (!dari || s.waktuBuka >= new Date(dari).toISOString()))
      .map((s) => {
        const perkiraan = s.saldoAwal + s.totalTunai
        const fisik = s.saldoAkhir ?? perkiraan
        const jmlVoid = transaksi.filter((t) => t.shiftId === s.id && t.status === 'void').length
        return { ...s, perkiraan, fisik, selisih: fisik - perkiraan, jmlVoid }
      })
      .sort((a, b) => (a.waktuBuka < b.waktuBuka ? 1 : -1))
  }, [shifts, transaksi, filterKasir, dari])

  const namaKasir = (id: string) => users.find((u) => u.id === id)?.nama ?? id

  const totalPerkiraan = rows.reduce((a, r) => a + r.perkiraan, 0)
  const totalFisik = rows.reduce((a, r) => a + r.fisik, 0)
  const totalSelisih = totalFisik - totalPerkiraan
  const jumlahSelisih = rows.filter((r) => r.selisih !== 0).length

  const unduhCSV = () =>
    exportCSV(
      'rekonsiliasi-kas.csv',
      ['Kasir', 'Waktu Buka', 'Saldo Awal', 'Penjualan Tunai', 'Perkiraan Kas', 'Kas Fisik', 'Selisih', 'Transaksi', 'Void'],
      rows.map((r) => [namaKasir(r.kasirId), tanggalJam(r.waktuBuka), r.saldoAwal, r.totalTunai, r.perkiraan, r.fisik, r.selisih, r.jumlahTransaksi, r.jmlVoid]),
    )

  const cetak = () =>
    cetakLaporan(
      'Rekonsiliasi Kas',
      'Berdasarkan data shift kasir',
      `<table><thead><tr><th>Kasir</th><th>Waktu</th><th class="num">Perkiraan Kas</th><th class="num">Kas Fisik</th><th class="num">Selisih</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${namaKasir(r.kasirId)}</td><td>${tanggalJam(r.waktuBuka)}</td><td class="num">${rupiah(r.perkiraan)}</td><td class="num">${rupiah(r.fisik)}</td><td class="num">${rupiah(r.selisih)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="2">TOTAL</td><td class="num">${rupiah(totalPerkiraan)}</td><td class="num">${rupiah(totalFisik)}</td><td class="num">${rupiah(totalSelisih)}</td></tr></tfoot></table>`,
    )

  return (
    <>
      <PageHeader
        judul="Rekonsiliasi Kas"
        deskripsi="Pencocokan kas berdasarkan data shift kasir dari modul POS."
        aksi={<><FR kode="FR-FIN-04" /><FR kode="FR-FIN-08" /></>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Shift Ditutup" value={rows.length} tone="brand" />
        <StatCard label="Total Perkiraan Kas" value={rupiah(totalPerkiraan)} tone="green" />
        <StatCard label="Total Kas Fisik" value={rupiah(totalFisik)} tone="violet" />
        <StatCard
          label="Total Selisih"
          value={`${totalSelisih > 0 ? '+' : ''}${rupiah(totalSelisih)}`}
          hint={`${jumlahSelisih} shift tidak balance`}
          tone={totalSelisih === 0 ? 'green' : totalSelisih > 0 ? 'amber' : 'rose'}
        />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select value={filterKasir} onChange={(e) => setFilterKasir(e.target.value)}>
            <option value="">Semua kasir</option>
            {users.filter((u) => u.role === 'kasir' || u.role === 'admin').map((u) => (
              <option key={u.id} value={u.id}>{u.nama}</option>
            ))}
          </Select>
          <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            <Button size="sm" variant="secondary" onClick={unduhCSV}>Export CSV</Button>
            <Button size="sm" variant="secondary" onClick={cetak}>Cetak PDF</Button>
          </div>
        </div>
      </Card>

      <Card title="Detail Rekonsiliasi per Shift">
        <DataTable
          data={rows}
          kolom={[
            { key: 'kasir', header: 'Kasir', render: (r) => (
              <div>
                <p className="font-medium text-slate-700">{namaKasir(r.kasirId)}</p>
                <p className="text-[11px] text-slate-400">{tanggalJam(r.waktuBuka)}</p>
              </div>
            ) },
            { key: 'saldoAwal', header: 'Saldo Awal', align: 'right', render: (r) => rupiah(r.saldoAwal) },
            { key: 'tunai', header: 'Penjualan Tunai', align: 'right', render: (r) => rupiah(r.totalTunai) },
            { key: 'nonTunai', header: 'Non-Tunai', align: 'right', render: (r) => <span className="text-slate-500">{rupiah(r.totalNonTunai)}</span> },
            { key: 'perkiraan', header: 'Perkiraan Kas', align: 'right', render: (r) => <span className="font-medium">{rupiah(r.perkiraan)}</span> },
            { key: 'fisik', header: 'Kas Fisik', align: 'right', render: (r) => rupiah(r.fisik) },
            { key: 'selisih', header: 'Selisih', align: 'right', render: (r) => (
              r.selisih === 0 ? <Badge warna="green">Balance</Badge>
              : <span className={`font-semibold ${r.selisih > 0 ? 'text-brand-600' : 'text-rose-600'}`}>{r.selisih > 0 ? '+' : ''}{rupiah(r.selisih)}</span>
            ) },
            { key: 'trx', header: 'Trx / Void', align: 'right', render: (r) => (
              <span className="text-xs text-slate-500">{r.jumlahTransaksi} / <span className={r.jmlVoid > 0 ? 'text-rose-600' : ''}>{r.jmlVoid}</span></span>
            ) },
          ]}
          kosong="Belum ada shift yang ditutup"
        />
      </Card>
    </>
  )
}
