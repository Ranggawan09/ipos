import React, { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { hanyaSelesai } from '@/store/selectors'
import { exportXLS } from '@/lib/csv'
import { cetakLaporan } from '@/lib/print'
import { angka, rupiah, tanggalSingkat, getShiftNomor } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Input, PageHeader, Select, StatCard } from '@/components/ui'

type Periode = 'harian' | 'kalender' | 'mingguan' | 'bulanan' | 'per_shift'

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

const getHariIni = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function LaporanPenjualan() {
  const { transaksi, shifts, produk, kategori, users } = useDataStore()
  const push = useToast((s) => s.push)
  const [periode, setPeriode] = useState<Periode>('harian')
  const [filterShift, setFilterShift] = useState<string>('semua')
  const [filterKategori, setFilterKategori] = useState<string>('semua')
  const [tabView, setTabView] = useState<'rekap' | 'matriks_kategori'>('rekap')

  // State kalender harian spesifik
  const [tanggalKalender, setTanggalKalender] = useState<string>(() => {
    const today = getHariIni()
    const selesai = hanyaSelesai(transaksi)
    const adaHariIni = selesai.some((t) => t.waktu.startsWith(today))
    if (adaHariIni) return today
    if (selesai.length > 0) {
      const dates = selesai.map((t) => t.waktu.slice(0, 10)).sort()
      return dates[dates.length - 1]
    }
    return today
  })

  // State expand accordion transaksi
  const [expandedTrxIds, setExpandedTrxIds] = useState<Set<string>>(new Set())
  const [cariTrx, setCariTrx] = useState('')

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

  // Label nama hari & tanggal terpilih
  const labelTanggalTerpilih = useMemo(() => {
    const [y, m, d] = tanggalKalender.split('-').map(Number)
    if (!y || !m || !d) return tanggalKalender
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [tanggalKalender])

  const ubahHari = (delta: number) => {
    const [y, m, d] = tanggalKalender.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + delta)
    const ny = dt.getFullYear()
    const nm = String(dt.getMonth() + 1).padStart(2, '0')
    const nd = String(dt.getDate()).padStart(2, '0')
    setTanggalKalender(`${ny}-${nm}-${nd}`)
  }

  const setKeHariIni = () => {
    setTanggalKalender(getHariIni())
  }

  const setKeKemarin = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setTanggalKalender(`${y}-${m}-${day}`)
  }

  const toggleExpand = (id: string) => {
    setExpandedTrxIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Daftar transaksi spesifik pada tanggal kalender terpilih
  const transaksiHarian = useMemo(() => {
    if (periode !== 'kalender') return []
    const selesai = hanyaSelesai(transaksi)
    const targetDate = tanggalKalender
    const q = cariTrx.toLowerCase().trim()

    return selesai
      .filter((t) => {
        // Tanggal
        if (!t.waktu.startsWith(targetDate)) return false

        // Filter shift
        const shiftNomor = shiftMap.get(t.shiftId) ?? 1
        if (filterShift !== 'semua' && String(shiftNomor) !== filterShift) {
          return false
        }

        // Filter kategori
        if (filterKategori !== 'semua') {
          const adaKategori = t.detail.some((d) => produkKategoriMap.get(d.produkId) === filterKategori)
          if (!adaKategori) return false
        }

        // Pencarian transaksi
        if (q) {
          const kasir = users.find((u) => u.id === t.kasirId)?.nama ?? t.kasirId
          const cocokNomor = t.nomor.toLowerCase().includes(q)
          const cocokKasir = kasir.toLowerCase().includes(q)
          const cocokBarang = t.detail.some((d) => d.namaProduk.toLowerCase().includes(q))
          if (!cocokNomor && !cocokKasir && !cocokBarang) return false
        }

        return true
      })
      .sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
  }, [transaksi, periode, tanggalKalender, filterShift, filterKategori, cariTrx, shiftMap, produkKategoriMap, users])

  // Baris agregasi penjualan sesuai filter Shift & Kategori (mode non-kalender)
  const rows: Baris[] = useMemo(() => {
    if (periode === 'kalender') return []
    const selesai = hanyaSelesai(transaksi)
    const map = new Map<string, Baris>()

    selesai.forEach((t) => {
      const shiftNomor = shiftMap.get(t.shiftId) ?? 1

      // Filter Shift 1, 2
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
    const filteredSelesai =
      periode === 'kalender'
        ? selesai.filter((t) => t.waktu.startsWith(tanggalKalender))
        : selesai

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

    filteredSelesai.forEach((t) => {
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
  }, [transaksi, periode, tanggalKalender, kategori, filterKategori, shiftMap, produkKategoriMap])

  // Total Finansial untuk StatCards
  const { totalOmzet, totalHpp, totalLaba, totalTrx } = useMemo(() => {
    if (periode === 'kalender') {
      let omzet = 0
      let hpp = 0
      transaksiHarian.forEach((t) => {
        if (filterKategori === 'semua') {
          omzet += t.total
          hpp += t.hpp
        } else {
          t.detail.forEach((d) => {
            if (produkKategoriMap.get(d.produkId) === filterKategori) {
              omzet += d.subtotal
              hpp += (d.hargaBeli || 0) * d.qty
            }
          })
        }
      })
      return {
        totalOmzet: omzet,
        totalHpp: hpp,
        totalLaba: omzet - hpp,
        totalTrx: transaksiHarian.length,
      }
    }

    const omzet = rows.reduce((a, r) => a + r.omzet, 0)
    const hpp = rows.reduce((a, r) => a + r.hpp, 0)
    const laba = rows.reduce((a, r) => a + r.laba, 0)
    const trx = rows.reduce((a, r) => a + r.transaksi, 0)
    return {
      totalOmzet: omzet,
      totalHpp: hpp,
      totalLaba: laba,
      totalTrx: trx,
    }
  }, [periode, transaksiHarian, rows, filterKategori, produkKategoriMap])

  const namaKatTerpilih = kategori.find((k) => k.id === filterKategori)?.nama ?? 'Semua Kategori'
  const shiftTerpilihText = filterShift === 'semua' ? 'Semua Shift' : `Shift ${filterShift}`

  const unduhXLS = () => {
    if (periode === 'kalender') {
      exportXLS(
        `laporan-transaksi-${tanggalKalender}-shift-${filterShift}.xls`,
        ['No. Transaksi', 'Waktu', 'Shift', 'Kasir', 'Metode', 'Item Belanja', 'Total Belanja', 'HPP', 'Laba Kotor'],
        transaksiHarian.map((t) => [
          t.nomor,
          new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          `Shift ${shiftMap.get(t.shiftId) ?? 1}`,
          users.find((u) => u.id === t.kasirId)?.nama ?? t.kasirId,
          t.metode.toUpperCase(),
          t.detail.map((d) => `${d.qty} ${d.satuan || 'pcs'} ${d.namaProduk}`).join('; '),
          t.total,
          t.hpp,
          t.total - t.hpp,
        ]),
      )
      push({ tipe: 'sukses', judul: 'Laporan transaksi harian diekspor ke Excel (.xls)' })
      return
    }

    exportXLS(
      `laporan-penjualan-${periode}-shift-${filterShift}.xls`,
      ['Periode / Shift', 'Jumlah Transaksi', 'Omzet', 'HPP', 'Laba Kotor'],
      rows.map((r) => [r.label, r.transaksi, r.omzet, r.hpp, r.laba]),
    )
    push({ tipe: 'sukses', judul: 'Laporan diekspor ke Excel (.xls)' })
  }

  const cetak = () => {
    if (periode === 'kalender') {
      const html = `
        <div style="margin-bottom: 12px; font-size: 13px; color: #475569;">
          <strong>Tanggal:</strong> ${labelTanggalTerpilih} | <strong>Filter:</strong> Shift: ${shiftTerpilihText} | Kategori: ${namaKatTerpilih}
        </div>
        <table>
          <thead>
            <tr>
              <th>No. Transaksi</th>
              <th>Waktu</th>
              <th>Shift</th>
              <th>Kasir</th>
              <th>Rincian Item</th>
              <th class="num">Total</th>
              <th class="num">Laba</th>
            </tr>
          </thead>
          <tbody>
            ${transaksiHarian
              .map((t) => {
                const itemsStr = t.detail.map((d) => `${d.qty} ${d.satuan || 'pcs'} ${d.namaProduk}`).join(', ')
                const sNo = shiftMap.get(t.shiftId) ?? 1
                const kasir = users.find((u) => u.id === t.kasirId)?.nama ?? t.kasirId
                const waktu = new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                return `
                  <tr>
                    <td><strong>${t.nomor}</strong></td>
                    <td>${waktu}</td>
                    <td>Shift ${sNo}</td>
                    <td>${kasir}</td>
                    <td>${itemsStr}</td>
                    <td class="num">${rupiah(t.total)}</td>
                    <td class="num">${rupiah(t.total - t.hpp)}</td>
                  </tr>`
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5">TOTAL (${transaksiHarian.length} Transaksi)</td>
              <td class="num">${rupiah(totalOmzet)}</td>
              <td class="num">${rupiah(totalLaba)}</td>
            </tr>
          </tfoot>
        </table>`
      cetakLaporan('Laporan Transaksi Harian', `Tanggal: ${tanggalKalender} (${shiftTerpilihText})`, html)
      push({ tipe: 'info', judul: 'Menyiapkan cetak PDF', pesan: 'Gunakan "Save as PDF" pada dialog cetak.' })
      return
    }

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
        deskripsi="Laporan penjualan per shift (1, 2), kalender harian, mingguan, dan bulanan terintegrasi otomatis dengan modul POS."
        aksi={
          <>
            <FR kode="FR-FIN-01" />
            <FR kode="FR-FIN-06" />
            <FR kode="FR-FIN-08" />
          </>
        }
      />

      {/* Baris Filter Terpadu: Periode, Kalender Harian, Shift 1-2, Kategori */}
      <div className="mb-4 border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Periode */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Grup Periode:</label>
              <Select
                value={periode}
                onChange={(e) => setPeriode(e.target.value as Periode)}
                className="w-52 text-xs font-medium"
              >
                <option value="harian">Rekap Harian (Semua Tanggal)</option>
                <option value="kalender">📅 1 Hari Spesifik (Kalender)</option>
                <option value="per_shift">Per Shift (1–2)</option>
                <option value="mingguan">Mingguan</option>
                <option value="bulanan">Bulanan</option>
              </Select>
            </div>

            {/* Kontrol Kalender Harian Spesifik */}
            {periode === 'kalender' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => ubahHari(-1)}
                  className="h-7 w-7 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-300 transition text-xs font-bold"
                  title="Hari sebelumnya"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={tanggalKalender}
                  onChange={(e) => setTanggalKalender(e.target.value)}
                  className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => ubahHari(1)}
                  className="h-7 w-7 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-300 transition text-xs font-bold"
                  title="Hari berikutnya"
                >
                  ▶
                </button>
                <div className="h-4 w-px bg-slate-300 mx-0.5" />
                <button
                  type="button"
                  onClick={setKeHariIni}
                  className={`h-7 px-2.5 text-xs font-medium rounded transition ${
                    tanggalKalender === getHariIni()
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={setKeKemarin}
                  className="h-7 px-2.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition"
                >
                  Kemarin
                </button>
              </div>
            )}

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
                {periode === 'kalender' ? 'Daftar Transaksi' : 'Rekap Penjualan'}
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
            <Button size="sm" variant="secondary" onClick={unduhXLS}>
              Export XLS
            </Button>
            <Button size="sm" variant="secondary" onClick={cetak}>
              Cetak PDF
            </Button>
          </div>
        </div>

        {/* Info label filter aktif */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <span>Filter Aktif:</span>
          {periode === 'kalender' && (
            <>
              <span className="font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                📅 {labelTanggalTerpilih}
              </span>
              <span>•</span>
            </>
          )}
          <span className="font-semibold text-slate-700">{shiftTerpilihText}</span>
          <span>/</span>
          <span className="font-semibold text-slate-700">{namaKatTerpilih}</span>
          {filterShift !== 'semua' && renderShiftBadge(Number(filterShift))}
        </div>
      </div>

      {/* 4 Kartu Metrik Finansial */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Omzet" value={rupiah(totalOmzet)} tone="green" />
        <StatCard label="Total HPP" value={rupiah(totalHpp)} tone="amber" />
        <StatCard label="Laba Kotor" value={rupiah(totalLaba)} tone="brand" />
        <StatCard label="Jumlah Transaksi" value={angka(totalTrx)} tone="violet" />
      </div>

      {/* Tampilan Konten Laporan */}
      {tabView === 'rekap' ? (
        periode === 'kalender' ? (
          /* TAMPILAN MODE 1 HARI SPESIFIK (KALENDER) DENGAN ACCORDION TRANSAKSI */
          <Card
            title={`Laporan Transaksi: ${labelTanggalTerpilih}`}
            subtitle={`Menampilkan ${transaksiHarian.length} transaksi (${shiftTerpilihText} / ${namaKatTerpilih}). Klik baris atau tanda panah untuk melihat rincian barang.`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-56">
                  <Input
                    placeholder="Cari no. trx / kasir / barang..."
                    value={cariTrx}
                    onChange={(e) => setCariTrx(e.target.value)}
                  />
                </div>
                {transaksiHarian.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (expandedTrxIds.size === transaksiHarian.length) {
                        setExpandedTrxIds(new Set())
                      } else {
                        setExpandedTrxIds(new Set(transaksiHarian.map((t) => t.id)))
                      }
                    }}
                  >
                    {expandedTrxIds.size === transaksiHarian.length
                      ? '▼ Tutup Semua Rincian'
                      : '▶ Buka Semua Rincian'}
                  </Button>
                )}
              </div>
            }
          >
            {transaksiHarian.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-base font-semibold text-slate-700">Tidak ada transaksi pada tanggal ini</p>
                <p className="mt-1 text-xs text-slate-500">
                  Coba pilih tanggal lain pada kalender atau ubah filter Shift / Kategori.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="w-10 px-3 py-2.5 text-center"></th>
                      <th className="px-3 py-2.5">No. Transaksi</th>
                      <th className="px-3 py-2.5">Waktu</th>
                      <th className="px-3 py-2.5">Shift</th>
                      <th className="px-3 py-2.5">Kasir</th>
                      <th className="px-3 py-2.5">Pembayaran</th>
                      <th className="px-3 py-2.5 text-right">Item</th>
                      <th className="px-3 py-2.5 text-right">Total Belanja</th>
                      <th className="px-3 py-2.5 text-right">Laba Kotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaksiHarian.map((t) => {
                      const isExpanded = expandedTrxIds.has(t.id)
                      const sNo = shiftMap.get(t.shiftId) ?? 1
                      const namaKasir = users.find((u) => u.id === t.kasirId)?.nama ?? t.kasirId
                      const waktuJam = new Date(t.waktu).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      const totalQty = t.detail.reduce((sum, d) => sum + d.qty, 0)
                      const labaTrx = t.total - t.hpp

                      return (
                        <React.Fragment key={t.id}>
                          <tr
                            onClick={() => toggleExpand(t.id)}
                            className={`cursor-pointer transition select-none ${
                              isExpanded ? 'bg-blue-50/50 font-medium' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs transition ${
                                  isExpanded
                                    ? 'bg-blue-100 text-blue-700 font-bold'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-mono font-semibold text-slate-900">
                              {t.nomor}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {waktuJam} WIB
                            </td>
                            <td className="px-3 py-3">
                              {renderShiftBadge(sNo)}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              {namaKasir}
                            </td>
                            <td className="px-3 py-3">
                              <Badge
                                warna={
                                  t.metode === 'tunai'
                                    ? 'green'
                                    : t.metode === 'qris'
                                    ? 'violet'
                                    : 'blue'
                                }
                              >
                                {t.metode.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              <span className="font-semibold text-slate-800">{t.detail.length}</span> jenis ({totalQty} qty)
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-slate-900">
                              {rupiah(t.total)}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                              {rupiah(labaTrx)}
                            </td>
                          </tr>

                          {/* Sub-tabel Accordion Rincian Item Belanja */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b border-slate-200">
                              <td colSpan={9} className="px-4 py-3">
                                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                                  <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-100 mb-2 gap-2">
                                    <p className="text-xs font-bold text-slate-800">
                                      📦 Rincian Belanjaan: {t.nomor}
                                      {t.pelanggan && (
                                        <span className="ml-2 font-normal text-slate-500">
                                          (Pelanggan: {t.pelanggan})
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                      <span>
                                        Kasir: <strong className="text-slate-700">{namaKasir}</strong>
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Dibayar: <strong className="text-slate-700">{rupiah(t.dibayar)}</strong>
                                      </span>
                                      {t.kembalian > 0 && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            Kembalian: <strong className="text-slate-700">{rupiah(t.kembalian)}</strong>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 text-[11px]">
                                        <th className="py-1.5 px-2.5 w-8">#</th>
                                        <th className="py-1.5 px-2.5">Produk & Satuan</th>
                                        <th className="py-1.5 px-2.5 text-right">Harga Satuan</th>
                                        <th className="py-1.5 px-2.5 text-right">Qty</th>
                                        {t.detail.some((d) => d.diskonItem > 0) && (
                                          <th className="py-1.5 px-2.5 text-right">Diskon Item</th>
                                        )}
                                        <th className="py-1.5 px-2.5 text-right">Subtotal</th>
                                        <th className="py-1.5 px-2.5 text-right">Estimasi Laba</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {t.detail.map((item, idx) => {
                                        const prod = produk.find((p) => p.id === item.produkId)
                                        const itemHpp = (item.hargaBeli || 0) * item.qty
                                        const itemLaba = item.subtotal - itemHpp
                                        const satuanLabel = item.satuan || item.namaVarian || prod?.satuan || 'pcs'

                                        return (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-2.5 text-slate-400">{idx + 1}</td>
                                            <td className="py-1.5 px-2.5">
                                              <span className="font-semibold text-slate-800">{item.namaProduk}</span>
                                              <span className="ml-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                                {satuanLabel}
                                              </span>
                                              {prod?.sku && (
                                                <span className="ml-1 text-[10px] text-slate-400">({prod.sku})</span>
                                              )}
                                            </td>
                                            <td className="py-1.5 px-2.5 text-right text-slate-600">
                                              {rupiah(item.hargaSatuan)}
                                            </td>
                                            <td className="py-1.5 px-2.5 text-right font-semibold text-slate-800">
                                              {item.qty} {satuanLabel}
                                            </td>
                                            {t.detail.some((d) => d.diskonItem > 0) && (
                                              <td className="py-1.5 px-2.5 text-right text-rose-600">
                                                {item.diskonItem > 0 ? `-${rupiah(item.diskonItem)}` : '-'}
                                              </td>
                                            )}
                                            <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                                              {rupiah(item.subtotal)}
                                            </td>
                                            <td className="py-1.5 px-2.5 text-right font-medium text-emerald-600">
                                              {rupiah(itemLaba)}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-[11px]">
                                      <tr>
                                        <td
                                          colSpan={t.detail.some((d) => d.diskonItem > 0) ? 5 : 4}
                                          className="py-1.5 px-2.5 text-right text-slate-600"
                                        >
                                          Subtotal Produk:
                                        </td>
                                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                                          {rupiah(t.subtotal || t.total + (t.diskonNota || 0))}
                                        </td>
                                        <td></td>
                                      </tr>
                                      {t.diskonNota > 0 && (
                                        <tr>
                                          <td
                                            colSpan={t.detail.some((d) => d.diskonItem > 0) ? 5 : 4}
                                            className="py-1 px-2.5 text-right text-rose-600"
                                          >
                                            Diskon Nota:
                                          </td>
                                          <td className="py-1 px-2.5 text-right text-rose-600 font-bold">
                                            -{rupiah(t.diskonNota)}
                                          </td>
                                          <td></td>
                                        </tr>
                                      )}
                                      <tr className="text-xs">
                                        <td
                                          colSpan={t.detail.some((d) => d.diskonItem > 0) ? 5 : 4}
                                          className="py-2 px-2.5 text-right font-bold text-slate-800"
                                        >
                                          Total Transaksi:
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-extrabold text-brand-700 text-sm">
                                          {rupiah(t.total)}
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                                          {rupiah(labaTrx)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs">
                    <tr>
                      <td colSpan={7} className="px-3 py-2.5 text-right text-slate-700">
                        TOTAL ({transaksiHarian.length} transaksi):
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-900 font-extrabold">
                        {rupiah(totalOmzet)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-700 font-extrabold">
                        {rupiah(totalLaba)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        ) : (
          /* TAMPILAN REKAPITULASI PENJUALAN REGULER */
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
        )
      ) : (
        <Card
          title="Analisis Omzet Kategori Produk per Shift (1, 2)"
          subtitle={`Distribusi penjualan tiap kategori berdasarkan shift kerja kasir ${
            periode === 'kalender' ? `(pada ${labelTanggalTerpilih})` : ''
          }`}
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

