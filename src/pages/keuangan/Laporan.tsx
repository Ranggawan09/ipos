import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { hanyaSelesai } from '@/store/selectors'
import { exportCSV } from '@/lib/csv'
import { cetakLaporan } from '@/lib/print'
import { angka, rupiah, tanggalSingkat, getShiftNomor } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, PageHeader, Select, StatCard } from '@/components/ui'

type Periode = 'harian' | 'mingguan' | 'bulanan' | 'per_shift'

type Baris = {
  id: string
  label: string
  shiftNomor?: number
  transaksi: number
  omzet: number
  hpp: number
  laba: number
}

type KategoriShiftRow = {
  id: string
  kategoriId: string
  kategoriNama: string
  shift1: number
  shift2: number
  totalOmzet: number
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - ((day + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

const renderShiftBadge = (nomor: number) => {
  const configs: Record<number, { bg: string; label: string }> = {
    1: { bg: 'bg-emerald-100 border-emerald-300 text-emerald-800', label: 'Shift 1' },
    2: { bg: 'bg-amber-100 border-amber-300 text-amber-800', label: 'Shift 2' },
  }
  const c = configs[nomor] || configs[1]
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-bold ${c.bg}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {c.label}
    </span>
  )
}

export function LaporanPenjualan() {
  const { transaksi, shifts, produk, kategori } = useDataStore()
  const push = useToast((s) => s.push)
  const [periode, setPeriode] = useState<Periode>('harian')
  const [filterShift, setFilterShift] = useState<string>('semua')
  const [filterKategori, setFilterKategori] = useState<string>('semua')
  const [tabView, setTabView] = useState<'rekap' | 'matriks_kategori'>('rekap')

  // Map shiftId -> shiftNomor (1, 2, 3, 4)
  const shiftMap = useMemo(() => {
    const m = new Map<string, number>()
    shifts.forEach((s) => {
      m.set(s.id, getShiftNomor(s))
    })
    return m
  }, [shifts])

  // Map produkId -> kategoriId
  const produkKategoriMap = useMemo(() => {
    const m = new Map<string, string>()
    produk.forEach((p) => {
      m.set(p.id, p.kategoriId)
    })
    return m
  }, [produk])

  // Baris agregasi penjualan sesuai filter Shift & Kategori
  const rows: Baris[] = useMemo(() => {
    const selesai = hanyaSelesai(transaksi)
    const map = new Map<string, Baris>()

    selesai.forEach((t) => {
      const shiftNomor = shiftMap.get(t.shiftId) ?? 1

      // Filter Shift 1, 2, 3, 4
      if (filterShift !== 'semua' && String(shiftNomor) !== filterShift) {
        return
      }

      // Hitung omzet & hpp (memperhitungkan filter kategori)
      let trxOmzet = 0
      let trxHpp = 0
      let adaItemCocok = false

      if (filterKategori === 'semua') {
        trxOmzet = t.total
        trxHpp = t.hpp
        adaItemCocok = true
      } else {
        t.detail.forEach((d) => {
          if (produkKategoriMap.get(d.produkId) === filterKategori) {
            adaItemCocok = true
            trxOmzet += d.subtotal
            trxHpp += (d.hargaBeli || 0) * d.qty
          }
        })
      }

      if (!adaItemCocok) return

      const d = new Date(t.waktu)
      let key: string
      let label: string
      let rowShiftNomor: number | undefined

      if (periode === 'per_shift') {
        key = `SHIFT-${shiftNomor}`
        label = `Shift ${shiftNomor} (${shiftNomor === 1 ? 'Pagi' : 'Siang / Malam'})`
        rowShiftNomor = shiftNomor
      } else if (periode === 'harian') {
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

      const cur = map.get(key) ?? {
        id: key,
        label,
        shiftNomor: rowShiftNomor,
        transaksi: 0,
        omzet: 0,
        hpp: 0,
        laba: 0,
      }
      cur.transaksi += 1
      cur.omzet += trxOmzet
      cur.hpp += trxHpp
      cur.laba += trxOmzet - trxHpp
      map.set(key, cur)
    })

    if (periode === 'per_shift') {
      return ([1, 2] as const)
        .map((sNo) => {
          const key = `SHIFT-${sNo}`
          return (
            map.get(key) ?? {
              id: key,
              label: `Shift ${sNo} (${sNo === 1 ? 'Pagi' : 'Siang / Malam'})`,
              shiftNomor: sNo,
              transaksi: 0,
              omzet: 0,
              hpp: 0,
              laba: 0,
            }
          )
        })
        .filter((r) => filterShift === 'semua' || String(r.shiftNomor) === filterShift)
    }

    return [...map.values()].sort((a, b) => (a.id < b.id ? 1 : -1))
  }, [transaksi, periode, filterShift, filterKategori, shiftMap, produkKategoriMap])

  // Matriks Kategori vs Shift 1, 2
  const matriksKategoriShift: KategoriShiftRow[] = useMemo(() => {
    const selesai = hanyaSelesai(transaksi)
    const katMap = new Map<string, KategoriShiftRow>()

    kategori.forEach((k) => {
      katMap.set(k.id, {
        id: k.id,
        kategoriId: k.id,
        kategoriNama: k.nama,
        shift1: 0,
        shift2: 0,
        totalOmzet: 0,
      })
    })

    selesai.forEach((t) => {
      const sNo = shiftMap.get(t.shiftId) ?? 1
      t.detail.forEach((d) => {
        const kId = produkKategoriMap.get(d.produkId)
        if (kId && katMap.has(kId)) {
          const row = katMap.get(kId)!
          if (sNo === 1) row.shift1 += d.subtotal
          else row.shift2 += d.subtotal
          row.totalOmzet += d.subtotal
        }
      })
    })

    return [...katMap.values()]
      .filter((k) => filterKategori === 'semua' || k.kategoriId === filterKategori)
      .sort((a, b) => b.totalOmzet - a.totalOmzet)
  }, [transaksi, kategori, filterKategori, shiftMap, produkKategoriMap])

  const totalOmzet = rows.reduce((a, r) => a + r.omzet, 0)
  const totalHpp = rows.reduce((a, r) => a + r.hpp, 0)
  const totalLaba = rows.reduce((a, r) => a + r.laba, 0)
  const totalTrx = rows.reduce((a, r) => a + r.transaksi, 0)

  const namaKatTerpilih = kategori.find((k) => k.id === filterKategori)?.nama ?? 'Semua Kategori'
  const shiftTerpilihText = filterShift === 'semua' ? 'Semua Shift' : `Shift ${filterShift}`

  const unduhCSV = () => {
    exportCSV(
      `laporan-penjualan-${periode}-shift-${filterShift}.csv`,
      ['Periode / Shift', 'Jumlah Transaksi', 'Omzet', 'HPP', 'Laba Kotor'],
      rows.map((r) => [r.label, r.transaksi, r.omzet, r.hpp, r.laba]),
    )
    push({ tipe: 'sukses', judul: 'Laporan diekspor ke CSV' })
  }

  const cetak = () => {
    const html = `
      <div style="margin-bottom: 12px; font-size: 13px; color: #475569;">
        <strong>Filter Aktif:</strong> Shift: ${shiftTerpilihText} | Kategori: ${namaKatTerpilih}
      </div>
      <table>
        <thead><tr><th>Periode / Shift</th><th class="num">Transaksi</th><th class="num">Omzet</th><th class="num">HPP</th><th class="num">Laba Kotor</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr><td>${r.label}</td><td class="num">${r.transaksi}</td><td class="num">${rupiah(r.omzet)}</td><td class="num">${rupiah(r.hpp)}</td><td class="num">${rupiah(r.laba)}</td></tr>`,
            )
            .join('')}
        </tbody>
        <tfoot><tr><td>TOTAL</td><td class="num">${totalTrx}</td><td class="num">${rupiah(totalOmzet)}</td><td class="num">${rupiah(totalHpp)}</td><td class="num">${rupiah(totalLaba)}</td></tr></tfoot>
      </table>`
    cetakLaporan('Laporan Penjualan', `Rekap ${periode.toUpperCase()} (${shiftTerpilihText} - ${namaKatTerpilih})`, html)
    push({ tipe: 'info', judul: 'Menyiapkan cetak PDF', pesan: 'Gunakan "Save as PDF" pada dialog cetak.' })
  }

  return (
    <>
      <PageHeader
        judul="Laporan Penjualan"
        deskripsi="Laporan penjualan per shift (1, 2), harian, mingguan, dan bulanan terintegrasi otomatis dengan modul POS."
        aksi={
          <>
            <FR kode="FR-FIN-01" />
            <FR kode="FR-FIN-06" />
            <FR kode="FR-FIN-08" />
          </>
        }
      />

      {/* Baris Filter Terpadu: Shift 1-2, Kategori, Periode */}
      <div className="mb-4 border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Periode */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Grup Periode:</label>
              <Select value={periode} onChange={(e) => setPeriode(e.target.value as Periode)} className="w-40 text-xs">
                <option value="harian">Harian</option>
                <option value="per_shift">Per Shift (1–2)</option>
                <option value="mingguan">Mingguan</option>
                <option value="bulanan">Bulanan</option>
              </Select>
            </div>

            {/* Filter Shift 1, 2 */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Filter Shift:</label>
              <Select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="w-36 text-xs">
                <option value="semua">Semua Shift (1–2)</option>
                <option value="1">Shift 1 (Pagi)</option>
                <option value="2">Shift 2 (Siang / Malam)</option>
              </Select>
            </div>

            {/* Filter Kategori Produk */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Kategori:</label>
              <Select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="w-44 text-xs">
                <option value="semua">Semua Kategori</option>
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tab View Toggle & Export */}
          <div className="flex items-center gap-2">
            <div className="flex border border-slate-300">
              <button
                type="button"
                onClick={() => setTabView('rekap')}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  tabView === 'rekap' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Rekap Penjualan
              </button>
              <button
                type="button"
                onClick={() => setTabView('matriks_kategori')}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  tabView === 'matriks_kategori' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kategori per Shift (1–2)
              </button>
            </div>
            <Button size="sm" variant="secondary" onClick={unduhCSV}>
              Export CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={cetak}>
              Cetak PDF
            </Button>
          </div>
        </div>

        {/* Info label filter aktif */}
        <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <span>Filter Aktif:</span>
          <span className="font-semibold text-slate-700">{shiftTerpilihText}</span>
          <span>/</span>
          <span className="font-semibold text-slate-700">{namaKatTerpilih}</span>
          {filterShift !== 'semua' && renderShiftBadge(Number(filterShift))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Omzet" value={rupiah(totalOmzet)} tone="green" />
        <StatCard label="Total HPP" value={rupiah(totalHpp)} tone="amber" />
        <StatCard label="Laba Kotor" value={rupiah(totalLaba)} tone="brand" />
        <StatCard label="Jumlah Transaksi" value={angka(totalTrx)} tone="violet" />
      </div>

      {tabView === 'rekap' ? (
        <Card
          title={periode === 'per_shift' ? 'Laporan Penjualan Per Shift' : 'Rekapitulasi Penjualan'}
          subtitle={`Filter: ${shiftTerpilihText} / ${namaKatTerpilih}`}
        >
          <DataTable
            data={rows}
            kolom={[
              {
                key: 'label',
                header: periode === 'per_shift' ? 'Shift Kerja' : 'Periode',
                render: (r) => (
                  <div className="flex items-center gap-2">
                    {r.shiftNomor ? renderShiftBadge(r.shiftNomor) : null}
                    <span className="font-medium text-slate-700">{r.label}</span>
                  </div>
                ),
              },
              { key: 'transaksi', header: 'Transaksi', align: 'right' },
              { key: 'omzet', header: 'Omzet', align: 'right', render: (r) => rupiah(r.omzet) },
              { key: 'hpp', header: 'HPP', align: 'right', render: (r) => <span className="text-slate-500">{rupiah(r.hpp)}</span> },
              {
                key: 'laba',
                header: 'Laba Kotor',
                align: 'right',
                render: (r) => <span className="font-semibold text-emerald-600">{rupiah(r.laba)}</span>,
              },
              {
                key: 'margin',
                header: 'Margin',
                align: 'right',
                render: (r) => (
                  <Badge warna={r.omzet > 0 && r.laba / r.omzet > 0.15 ? 'green' : 'amber'}>
                    {r.omzet > 0 ? ((r.laba / r.omzet) * 100).toFixed(1) : '0'}%
                  </Badge>
                ),
              },
            ]}
            kosong="Belum ada data penjualan pada filter ini"
          />
        </Card>
      ) : (
        <Card
          title="Analisis Omzet Kategori Produk per Shift (1, 2)"
          subtitle="Distribusi penjualan tiap kategori berdasarkan shift kerja kasir"
        >
          <DataTable
            data={matriksKategoriShift}
            kolom={[
              {
                key: 'kategoriNama',
                header: 'Kategori Produk',
                render: (k) => <span className="font-semibold text-slate-800">{k.kategoriNama}</span>,
              },
              {
                key: 'shift1',
                header: 'Shift 1 (Pagi)',
                align: 'right',
                render: (k) => <span className="text-slate-700 font-medium">{rupiah(k.shift1)}</span>,
              },
              {
                key: 'shift2',
                header: 'Shift 2 (Siang / Malam)',
                align: 'right',
                render: (k) => <span className="text-slate-700 font-medium">{rupiah(k.shift2)}</span>,
              },
              {
                key: 'totalOmzet',
                header: 'Total Omzet',
                align: 'right',
                render: (k) => <span className="font-bold text-emerald-600">{rupiah(k.totalOmzet)}</span>,
              },
            ]}
            kosong="Tidak ada data kategori yang cocok"
          />
        </Card>
      )}
    </>
  )
}
