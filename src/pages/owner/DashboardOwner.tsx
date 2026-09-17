import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDataStore } from '@/store/useDataStore'
import { hanyaSelesai, labaKotor, produkTerlaris, ringkasPerHari, stokKritis, totalHpp, totalPenjualan } from '@/store/selectors'
import { awalBulanIni, awalHariIni, angka, rupiah, rupiahShort } from '@/lib/format'
import { Badge, Card, EmptyState, StatCard } from '@/components/ui'

export function DashboardOwner() {
  const { transaksi, produk, pengeluaran, kategori } = useDataStore()

  const mulaiHari = awalHariIni().toISOString()
  const mulaiBulan = awalBulanIni().toISOString()

  const trxHariIni = useMemo(() => hanyaSelesai(transaksi).filter((t) => t.waktu >= mulaiHari), [transaksi, mulaiHari])
  const trxBulanIni = useMemo(() => hanyaSelesai(transaksi).filter((t) => t.waktu >= mulaiBulan), [transaksi, mulaiBulan])

  const omzetHariIni = totalPenjualan(trxHariIni)
  const omzetBulanIni = totalPenjualan(trxBulanIni)
  const labaBulanIni = labaKotor(trxBulanIni)
  const bebanBulanIni = pengeluaran.filter((p) => p.tanggal >= mulaiBulan).reduce((a, p) => a + p.jumlah, 0)
  const labaBersih = labaBulanIni - bebanBulanIni
  const kritis = stokKritis(produk)
  const grafik = ringkasPerHari(transaksi, 30)
  const terlaris = produkTerlaris(transaksi, 8)

  const omzetPerKategori = useMemo(
    () =>
      kategori
        .map((k) => ({
          nama: k.nama,
          nilai: trxBulanIni
            .flatMap((t) => t.detail)
            .filter((d) => produk.find((p) => p.id === d.produkId)?.kategoriId === k.id)
            .reduce((a, d) => a + d.subtotal, 0),
        }))
        .filter((x) => x.nilai > 0)
        .sort((a, b) => b.nilai - a.nilai),
    [kategori, trxBulanIni, produk],
  )

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ringkasan Kinerja Toko</h1>
          <p className="mt-1 text-sm text-slate-500">
            Data diperbarui otomatis dari server lokal toko melalui sinkronisasi cloud.
          </p>
        </div>
        <Badge warna="blue">Akses baca (read-only)</Badge>
      </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Penjualan Hari Ini" value={rupiah(omzetHariIni)} hint={`${trxHariIni.length} transaksi`} tone="green" />
          <StatCard label="Penjualan Bulan Ini" value={rupiah(omzetBulanIni)} hint={`${trxBulanIni.length} transaksi`} tone="brand" />
          <StatCard label="Laba Kotor Bulan Ini" value={rupiah(labaBulanIni)} hint={`HPP ${rupiah(totalHpp(trxBulanIni))}`} tone="violet" />
          <StatCard
            label="Laba Bersih Bulan Ini"
            value={rupiah(labaBersih)}
            hint={`Beban operasional ${rupiah(bebanBulanIni)}`}
            tone={labaBersih >= 0 ? 'green' : 'rose'}
          />
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <Card title="Tren Penjualan 30 Hari" className="lg:col-span-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={grafik} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="owner-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tickFormatter={(v) => rupiahShort(Number(v))} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip formatter={(v, n) => [rupiah(Number(v)), n === 'penjualan' ? 'Penjualan' : n === 'laba' ? 'Laba Kotor' : String(n)]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="penjualan" name="penjualan" stroke="#10b981" strokeWidth={2} fill="url(#owner-g)" />
                  <Area type="monotone" dataKey="laba" name="laba" stroke="#1d6bf5" strokeWidth={1.6} fill="none" strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Penjualan per Kategori" subtitle="Bulan ini">
            <div className="space-y-3">
              {omzetPerKategori.length === 0 ? (
                <EmptyState judul="Belum ada penjualan" />
              ) : (
                omzetPerKategori.map((k) => {
                  const max = omzetPerKategori[0].nilai
                  return (
                    <div key={k.nama}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-600">{k.nama}</span>
                        <span className="font-medium text-slate-700">{rupiah(k.nilai)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${(k.nilai / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Produk Terlaris" subtitle="Sepanjang periode" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={terlaris} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nama" width={130} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} unit`, 'Terjual']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="qty" fill="#1d6bf5" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Perhatian" subtitle="Indikator yang perlu ditindaklanjuti">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-3">
                <div>
                  <p className="text-xs text-rose-700">Produk stok kritis</p>
                  <p className="text-lg font-bold text-rose-700">{angka(kritis.length)}</p>
                </div>
                <Badge warna="red">Restock</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-3">
                <div>
                  <p className="text-xs text-amber-700">Beban operasional bulan ini</p>
                  <p className="text-lg font-bold text-amber-700">{rupiah(bebanBulanIni)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-xs text-slate-600">Margin laba kotor</p>
                  <p className="text-lg font-bold text-slate-700">
                    {omzetBulanIni > 0 ? ((labaBulanIni / omzetBulanIni) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Dashboard pemilik dikhususkan untuk pemantauan data performa dan laporan toko secara berkala.
      </p>
    </div>
  )
}
