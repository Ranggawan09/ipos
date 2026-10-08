import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDataStore } from '@/store/useDataStore'
import { hanyaSelesai, labaKotor, produkTerlaris, ringkasPerHari, stokKritis, totalPenjualan, nilaiStok } from '@/store/selectors'
import { awalHariIni, angka, rupiah, rupiahShort, tanggalSingkat } from '@/lib/format'
import { Badge, Card, EmptyState, FR, PageHeader, StatCard } from '@/components/ui'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { produk, transaksi, pergerakan, kategori } = useDataStore()

  const mulaiHari = awalHariIni().toISOString()
  const trxHariIni = useMemo(
    () => hanyaSelesai(transaksi).filter((t) => t.waktu >= mulaiHari),
    [transaksi, mulaiHari],
  )

  const penjualanHariIni = totalPenjualan(trxHariIni)
  const labaHariIni = labaKotor(trxHariIni)
  const kritis = stokKritis(produk)
  const grafik = ringkasPerHari(transaksi, 14)
  const terlaris = produkTerlaris(transaksi, 6).map((p) => ({ ...p, qty: p.qty }))

  const produkAkanExpired = useMemo(() => {
    const items: {
      id: string
      produkId: string
      nama: string
      sku: string
      stok: number
      satuan: string
      tglExpired: string
      hariLagi: number
      nomorBatch?: string
    }[] = []

    const hariIni = new Date()
    hariIni.setHours(0, 0, 0, 0)

    produk.forEach((p) => {
      if (!p.aktif) return
      if (p.batches && p.batches.length > 0) {
        p.batches
          .filter((b) => b.stok > 0 && b.tglExpired)
          .forEach((b) => {
            const expDate = new Date(b.tglExpired)
            expDate.setHours(0, 0, 0, 0)
            const selisihHari = Math.ceil((expDate.getTime() - hariIni.getTime()) / (1000 * 60 * 60 * 24))
            items.push({
              id: `${p.id}-${b.id}`,
              produkId: p.id,
              nama: p.nama,
              sku: p.sku,
              stok: b.stok,
              satuan: p.satuan || 'pcs',
              tglExpired: b.tglExpired,
              hariLagi: selisihHari,
              nomorBatch: b.nomorBatch,
            })
          })
      } else if (p.tglExpired && p.stok > 0) {
        const expDate = new Date(p.tglExpired)
        expDate.setHours(0, 0, 0, 0)
        const selisihHari = Math.ceil((expDate.getTime() - hariIni.getTime()) / (1000 * 60 * 60 * 24))
        items.push({
          id: p.id,
          produkId: p.id,
          nama: p.nama,
          sku: p.sku,
          stok: p.stok,
          satuan: p.satuan || 'pcs',
          tglExpired: p.tglExpired,
          hariLagi: selisihHari,
        })
      }
    })

    return items
      .sort((a, b) => a.tglExpired.localeCompare(b.tglExpired))
      .slice(0, 6)
  }, [produk])

  const perKategori = useMemo(
    () =>
      kategori
        .map((k) => ({
          nama: k.nama,
          nilai: hanyaSelesai(transaksi)
            .flatMap((t) => t.detail)
            .filter((d) => produk.find((p) => p.id === d.produkId)?.kategoriId === k.id)
            .reduce((a, d) => a + d.subtotal, 0),
        }))
        .filter((x) => x.nilai > 0)
        .sort((a, b) => b.nilai - a.nilai)
        .slice(0, 6),
    [kategori, transaksi, produk],
  )

  const WARNA = ['#1d6bf5', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

  return (
    <>
      <PageHeader
        judul="Dashboard Admin"
        deskripsi="Ringkasan operasional toko hari ini."
        aksi={<FR kode="FR-FIN-05" />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Penjualan Hari Ini" value={rupiah(penjualanHariIni)} hint={`${trxHariIni.length} transaksi`} tone="green" />
        <StatCard label="Laba Kotor Hari Ini" value={rupiah(labaHariIni)} hint="Penjualan dikurangi HPP" tone="brand" />
        <StatCard label="Nilai Stok (HPP)" value={rupiah(nilaiStok(produk))} hint={`${produk.length} SKU terdaftar`} tone="violet" />
        <StatCard label="Stok Kritis" value={kritis.length} hint="Produk di bawah stok minimum" tone={kritis.length > 0 ? 'rose' : 'green'} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Tren Penjualan 14 Hari" subtitle="Nilai penjualan harian" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={grafik} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d6bf5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1d6bf5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => rupiahShort(Number(v))} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => rupiah(Number(v))} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="penjualan" name="Penjualan" stroke="#1d6bf5" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Komposisi Penjualan per Kategori">
          {perKategori.length === 0 ? (
            <EmptyState judul="Belum ada penjualan" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={perKategori} dataKey="nilai" nameKey="nama" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {perKategori.map((_, i) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => rupiah(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {perKategori.map((k, i) => (
                  <span key={k.nama} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ background: WARNA[i % WARNA.length] }} />
                    {k.nama}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Produk Terlaris" subtitle="Berdasarkan jumlah unit terjual">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={terlaris} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nama" width={110} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [n === 'qty' ? `${v} unit` : rupiah(Number(v)), n === 'qty' ? 'Terjual' : 'Nilai']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="qty" name="qty" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Produk Mendekati Expired"
          subtitle="Prioritas penjualan FIFO / pantauan kedaluwarsa"
          action={
            <Link to="/admin/produk" className="text-xs font-medium text-brand-600 hover:underline">
              Kelola stok
            </Link>
          }
        >
          {produkAkanExpired.length === 0 ? (
            <EmptyState judul="Semua produk aman dari kedaluwarsa" />
          ) : (
            <div className="space-y-2">
              {produkAkanExpired.map((item) => {
                const warnaBadge: 'red' | 'amber' | 'blue' =
                  item.hariLagi <= 7 ? 'red' : item.hariLagi <= 30 ? 'amber' : 'blue'
                const teksStatus =
                  item.hariLagi < 0
                    ? `Lewat ${Math.abs(item.hariLagi)} hr`
                    : item.hariLagi === 0
                    ? 'Hari ini'
                    : `${item.hariLagi} hr lagi`

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${
                      item.hariLagi <= 7
                        ? 'border-rose-200 bg-rose-50/50'
                        : item.hariLagi <= 30
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-semibold text-slate-800">{item.nama}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>
                          Sisa: <strong className="text-slate-700">{item.stok} {item.satuan}</strong>
                        </span>
                        <span>•</span>
                        <span>Exp: {tanggalSingkat(item.tglExpired)}</span>
                        {item.nomorBatch && (
                          <span className="font-mono text-slate-400">({item.nomorBatch})</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge warna={warnaBadge}>{teksStatus}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card
          title="Perlu Restock"
          subtitle={`${kritis.length} produk di bawah stok minimum`}
          action={
            <div className="flex items-center gap-2">
              {kritis.length > 0 && (
                <button
                  onClick={() => navigate('/admin/supplier/restock')}
                  className="inline-flex items-center text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition"
                >
                  PO Restock
                </button>
              )}
              <Link to="/admin/barang-masuk" className="text-xs font-medium text-brand-600 hover:underline">
                Barang masuk
              </Link>
            </div>
          }
        >
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {kritis.length === 0 ? (
              <EmptyState judul="Semua stok aman" />
            ) : (
              kritis.slice(0, 10).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(p.supplierId ? `/admin/supplier/restock?supplierId=${p.supplierId}` : '/admin/supplier/restock')}
                  className="flex items-center justify-between rounded-lg bg-rose-50/60 hover:bg-amber-50 px-3 py-2 cursor-pointer transition"
                  title="Klik untuk buka rekomendasi restock & PO"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-700">{p.nama}</p>
                    <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-rose-600">{p.stok} / {p.stokMinimum}</span>
                </div>
              ))
            )}
          </div>
          {kritis.length > 0 && (
            <button
              onClick={() => navigate('/admin/supplier/restock')}
              className="mt-3 w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition shadow-xs"
            >
              Detail Restock per Supplier & Cetak PO
            </button>
          )}
        </Card>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Total pergerakan stok tercatat: {angka(pergerakan.length)} baris.
      </p>
    </>
  )
}
