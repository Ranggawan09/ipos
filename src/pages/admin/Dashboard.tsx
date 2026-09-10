import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDataStore } from '@/store/useDataStore'
import { hanyaSelesai, labaKotor, produkTerlaris, ringkasPerHari, stokKritis, totalPenjualan, nilaiStok } from '@/store/selectors'
import { awalHariIni, angka, rupiah, rupiahShort, tanggalJam } from '@/lib/format'
import { Badge, Card, EmptyState, FR, PageHeader, StatCard } from '@/components/ui'

export function AdminDashboard() {
  const { produk, transaksi, pergerakan, kategori, users } = useDataStore()

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

  const namaKasir = (id: string) => users.find((u) => u.id === id)?.nama ?? id

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

        <Card title="Transaksi Terbaru" action={<Link to="/admin/transaksi" className="text-xs font-medium text-brand-600 hover:underline">Lihat semua</Link>}>
          <div className="space-y-2">
            {transaksi.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] text-slate-600">{t.nomor}</p>
                  <p className="text-[11px] text-slate-400">{tanggalJam(t.waktu)} &middot; {namaKasir(t.kasirId)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">{rupiah(t.total)}</p>
                  {t.status === 'void' && <Badge warna="red">Void</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Perlu Restock"
          subtitle={`${kritis.length} produk di bawah stok minimum`}
          action={<Link to="/admin/barang-masuk" className="text-xs font-medium text-brand-600 hover:underline">Catat barang masuk</Link>}
        >
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {kritis.length === 0 ? (
              <EmptyState judul="Semua stok aman" />
            ) : (
              kritis.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-rose-50/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-700">{p.nama}</p>
                    <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-rose-600">{p.stok} / {p.stokMinimum}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Total pergerakan stok tercatat: {angka(pergerakan.length)} baris.
      </p>
    </>
  )
}
