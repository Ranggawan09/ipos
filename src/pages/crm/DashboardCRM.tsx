import { useMemo, useState } from 'react'
import type { Pelanggan, Transaksi } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah, tanggalJam } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui'

interface PelangganStat extends Pelanggan {
  totalTrx: number
  totalBelanja: number
  rataBelanja: number
  transaksiTerakhir?: Transaksi
  produkterbanyak?: { nama: string; qty: number }
  daftarTransaksi: Transaksi[]
}

const formKosong = {
  nama: '',
  telepon: '',
  alamat: '',
  catatan: '',
}

export function DashboardCRM() {
  const { pelanggan, transaksi, simpanPelanggan, hapusPelanggan } = useDataStore()
  const push = useToast((s) => s.push)

  // Filter & Search
  const [cari, setCari] = useState('')
  const [sortBy, setSortBy] = useState<'frekuensi' | 'omzet' | 'terbaru' | 'nama'>('frekuensi')

  // Modals
  const [modalFormOpen, setModalFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Pelanggan | null>(null)
  const [formData, setFormData] = useState(formKosong)

  const [modalRiwayatOpen, setModalRiwayatOpen] = useState(false)
  const [selectedPelangganStat, setSelectedPelangganStat] = useState<PelangganStat | null>(null)

  const [hapusConfirm, setHapusConfirm] = useState<Pelanggan | null>(null)

  // Map transaksi ke pelanggan
  const pelangganStats: PelangganStat[] = useMemo(() => {
    return (pelanggan || []).map((p) => {
      const pNamaLower = p.nama.trim().toLowerCase()
      const trxList = transaksi
        .filter((t) => (t.pelanggan || '').trim().toLowerCase() === pNamaLower)
        .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())

      const totalTrx = trxList.length
      const totalBelanja = trxList.reduce((acc, t) => acc + t.total, 0)
      const rataBelanja = totalTrx > 0 ? Math.round(totalBelanja / totalTrx) : 0
      const transaksiTerakhir = trxList[0]

      // Hitung produk terfavorit (qty terbanyak)
      const itemCounter: Record<string, number> = {}
      trxList.forEach((t) => {
        t.detail.forEach((d) => {
          itemCounter[d.namaProduk] = (itemCounter[d.namaProduk] || 0) + d.qty
        })
      })

      let produkterbanyak: { nama: string; qty: number } | undefined
      let maxQty = 0
      Object.entries(itemCounter).forEach(([nama, qty]) => {
        if (qty > maxQty) {
          maxQty = qty
          produkterbanyak = { nama, qty }
        }
      })

      return {
        ...p,
        totalTrx,
        totalBelanja,
        rataBelanja,
        transaksiTerakhir,
        produkterbanyak,
        daftarTransaksi: trxList,
      }
    })
  }, [pelanggan, transaksi])

  // Metrik KPI Dashboard
  const kpi = useMemo(() => {
    const totalPelanggan = pelangganStats.length
    const pelangganAktif = pelangganStats.filter((p) => p.totalTrx > 0).length
    const totalOmzetCRM = pelangganStats.reduce((acc, p) => acc + p.totalBelanja, 0)
    const totalTrxCRM = pelangganStats.reduce((acc, p) => acc + p.totalTrx, 0)
    const rataBelanjaUmum = totalTrxCRM > 0 ? Math.round(totalOmzetCRM / totalTrxCRM) : 0

    // Pelanggan dengan frekuensi terbanyak
    const topFrekuensi = [...pelangganStats].sort((a, b) => b.totalTrx - a.totalTrx)[0]

    return {
      totalPelanggan,
      pelangganAktif,
      totalOmzetCRM,
      rataBelanjaUmum,
      topFrekuensi: topFrekuensi?.totalTrx > 0 ? topFrekuensi : null,
    }
  }, [pelangganStats])

  // Filter & Urutkan
  const daftarTampil = useMemo(() => {
    const q = cari.toLowerCase().trim()
    let hasil = pelangganStats.filter(
      (p) =>
        !q ||
        p.nama.toLowerCase().includes(q) ||
        (p.telepon && p.telepon.includes(q)) ||
        (p.alamat && p.alamat.toLowerCase().includes(q)) ||
        (p.catatan && p.catatan.toLowerCase().includes(q)),
    )

    hasil.sort((a, b) => {
      if (sortBy === 'frekuensi') {
        if (b.totalTrx !== a.totalTrx) return b.totalTrx - a.totalTrx
        return b.totalBelanja - a.totalBelanja
      }
      if (sortBy === 'omzet') {
        if (b.totalBelanja !== a.totalBelanja) return b.totalBelanja - a.totalBelanja
        return b.totalTrx - a.totalTrx
      }
      if (sortBy === 'terbaru') {
        const timeA = a.transaksiTerakhir ? new Date(a.transaksiTerakhir.waktu).getTime() : 0
        const timeB = b.transaksiTerakhir ? new Date(b.transaksiTerakhir.waktu).getTime() : 0
        return timeB - timeA
      }
      return a.nama.localeCompare(b.nama, 'id', { numeric: true })
    })

    return hasil
  }, [pelangganStats, cari, sortBy])

  // Top 3 Leaderboard Pelanggan Sering Belanja
  const top3SeringBeli = useMemo(() => {
    return [...pelangganStats]
      .filter((p) => p.totalTrx > 0)
      .sort((a, b) => b.totalTrx - a.totalTrx || b.totalBelanja - a.totalBelanja)
      .slice(0, 3)
  }, [pelangganStats])

  // Handlers Modal Form
  const bukaTambah = () => {
    setEditTarget(null)
    setFormData(formKosong)
    setModalFormOpen(true)
  }

  const bukaEdit = (p: Pelanggan) => {
    setEditTarget(p)
    setFormData({
      nama: p.nama,
      telepon: p.telepon || '',
      alamat: p.alamat || '',
      catatan: p.catatan || '',
    })
    setModalFormOpen(true)
  }

  const handleSimpan = () => {
    if (!formData.nama.trim()) {
      push({ tipe: 'error', judul: 'Nama pelanggan wajib diisi' })
      return
    }

    simpanPelanggan({
      id: editTarget?.id,
      nama: formData.nama.trim(),
      telepon: formData.telepon.trim() || undefined,
      alamat: formData.alamat.trim() || undefined,
      catatan: formData.catatan.trim() || undefined,
    })

    push({
      tipe: 'sukses',
      judul: editTarget ? 'Data Pelanggan Diperbarui' : 'Pelanggan Baru Ditambahkan',
      pesan: formData.nama,
    })

    setModalFormOpen(false)
  }

  const handleHapus = (p: Pelanggan) => {
    hapusPelanggan(p.id)
    push({
      tipe: 'info',
      judul: 'Pelanggan Dihapus',
      pesan: p.nama,
    })
    setHapusConfirm(null)
  }

  const bukaRiwayat = (stat: PelangganStat) => {
    setSelectedPelangganStat(stat)
    setModalRiwayatOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Dashboard Pelanggan (CRM)"
        deskripsi="Pantau pelanggan setia, riwayat transaksi belanja, pelanggan paling sering berkunjung, dan preferensi produk."
        aksi={
          <Button onClick={bukaTambah} className="shadow-xs">
            + Tambah Pelanggan Baru
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pelanggan Terdaftar"
          value={angka(kpi.totalPelanggan)}
          hint={`${kpi.pelangganAktif} pelanggan pernah berbelanja`}
        />
        <StatCard
          label="Total Akumulasi Omzet CRM"
          value={rupiah(kpi.totalOmzetCRM)}
          hint="Dari seluruh transaksi bernama"
        />
        <StatCard
          label="Rata-rata Belanja per Kunjungan"
          value={rupiah(kpi.rataBelanjaUmum)}
          hint="Nilai rata-rata per transaksi pelanggan"
        />
        <StatCard
          label="Pelanggan Paling Sering Belanja"
          value={kpi.topFrekuensi ? kpi.topFrekuensi.nama : '-'}
          hint={
            kpi.topFrekuensi
              ? `${kpi.topFrekuensi.totalTrx}x Transaksi (${rupiah(kpi.topFrekuensi.totalBelanja)})`
              : 'Belum ada transaksi bernama'
          }
        />
      </div>

      {/* Top 3 Leaderboard Pelanggan Paling Sering Belanja */}
      {top3SeringBeli.length > 0 && (
        <Card
          title="🏆 Peringkat Pelanggan Paling Sering Belanja"
          subtitle="Pelanggan dengan frekuensi transaksi pembelian tertinggi di toko"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {top3SeringBeli.map((p, idx) => {
              const medali = idx === 0 ? '🥇 Juara 1' : idx === 1 ? '🥈 Juara 2' : '🥉 Juara 3'
              const medalBadgeWarna: 'amber' | 'slate' | 'blue' = idx === 0 ? 'amber' : idx === 1 ? 'slate' : 'blue'
              const borderAccent =
                idx === 0
                  ? 'border-amber-300 bg-linear-to-b from-amber-50/60 to-white'
                  : idx === 1
                  ? 'border-slate-200 bg-linear-to-b from-slate-50/60 to-white'
                  : 'border-orange-200 bg-linear-to-b from-orange-50/40 to-white'

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col justify-between rounded-xl border p-4.5 shadow-xs transition hover:shadow-md ${borderAccent}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge warna={medalBadgeWarna}>{medali}</Badge>
                      <span className="text-xs font-semibold text-slate-400">
                        {p.totalTrx} Transaksi
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white shadow-xs">
                        {p.nama.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-slate-800">{p.nama}</h4>
                        <p className="truncate text-xs text-slate-500">
                          {p.telepon ? `📞 ${p.telepon}` : 'Tanpa nomor telepon'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 rounded-lg bg-white/80 p-2.5 text-xs border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Akumulasi:</span>
                        <span className="font-bold text-emerald-600">{rupiah(p.totalBelanja)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rata-rata per Nota:</span>
                        <span className="font-medium text-slate-700">{rupiah(p.rataBelanja)}</span>
                      </div>
                      {p.produkterbanyak && (
                        <div className="flex justify-between border-t border-slate-100 pt-1">
                          <span className="text-slate-500">Produk Terfavorit:</span>
                          <span className="truncate max-w-[140px] font-medium text-brand-700" title={p.produkterbanyak.nama}>
                            {p.produkterbanyak.nama} ({p.produkterbanyak.qty}x)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full text-xs"
                      onClick={() => bukaRiwayat(p)}
                    >
                      Lihat {p.totalTrx} Riwayat Transaksi
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Tabel Master & Analisis Pelanggan */}
      <Card
        title="Daftar Pelanggan & Analisis Belanja"
        subtitle="Analisis riwayat kunjungan, frekuensi belanja, dan preferensi barang per pelanggan"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48 sm:w-60">
              <Input
                placeholder="Cari nama, telp, alamat..."
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="w-44">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs"
              >
                <option value="frekuensi">Paling Sering Belanja</option>
                <option value="omzet">Nilai Belanja Tertinggi</option>
                <option value="terbaru">Belanja Terbaru</option>
                <option value="nama">Nama (A - Z)</option>
              </Select>
            </div>
          </div>
        }
      >
        <DataTable
          data={daftarTampil}
          kosong="Tidak ada pelanggan yang cocok dengan pencarian."
          kolom={[
            {
              key: 'nama',
              header: 'Pelanggan',
              render: (p) => (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-xs">
                    {p.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{p.nama}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {p.telepon && <span>📞 {p.telepon}</span>}
                      {p.alamat && <span className="truncate max-w-[150px]">📍 {p.alamat}</span>}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'frekuensi',
              header: 'Frekuensi Belanja',
              align: 'center',
              render: (p) => (
                <div className="flex flex-col items-center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      p.totalTrx >= 5
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.totalTrx >= 2
                        ? 'bg-blue-100 text-blue-800'
                        : p.totalTrx === 1
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {angka(p.totalTrx)}x transaksi
                  </span>
                  {p.totalTrx >= 5 && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      ⭐ Pelanggan Setia
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'totalBelanja',
              header: 'Total Belanja & Rata-rata',
              align: 'right',
              render: (p) => (
                <div className="text-right">
                  <p className="font-bold text-slate-800">{rupiah(p.totalBelanja)}</p>
                  <p className="text-[11px] text-slate-400">
                    Rata-rata: {p.totalTrx > 0 ? rupiah(p.rataBelanja) : '-'}
                  </p>
                </div>
              ),
            },
            {
              key: 'produkFavorit',
              header: 'Produk Terfavorit',
              render: (p) => (
                <div>
                  {p.produkterbanyak ? (
                    <div>
                      <p className="font-medium text-slate-700 text-xs truncate max-w-[180px]">
                        {p.produkterbanyak.nama}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Dibeli {angka(p.produkterbanyak.qty)} item
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Belum ada pembelian</span>
                  )}
                </div>
              ),
            },
            {
              key: 'terakhir',
              header: 'Terakhir Belanja',
              render: (p) => (
                <div className="text-xs text-slate-600">
                  {p.transaksiTerakhir ? (
                    <div>
                      <p className="font-medium">{tanggalJam(p.transaksiTerakhir.waktu)}</p>
                      <p className="text-[10px] text-slate-400">
                        {p.transaksiTerakhir.nomor} ({p.transaksiTerakhir.metode.toUpperCase()})
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Belum belanja</span>
                  )}
                </div>
              ),
            },
            {
              key: 'aksi',
              header: 'Aksi',
              align: 'right',
              render: (p) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs px-2.5 py-1"
                    onClick={() => bukaRiwayat(p)}
                    title="Lihat riwayat transaksi belanja"
                  >
                    Riwayat ({p.totalTrx})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs px-2 py-1 text-slate-600 hover:text-slate-900"
                    onClick={() => bukaEdit(p)}
                    title="Edit info pelanggan"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs px-2 py-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setHapusConfirm(p)}
                    title="Hapus pelanggan"
                  >
                    Hapus
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal Riwayat Transaksi Pelanggan */}
      <Modal
        open={modalRiwayatOpen}
        onClose={() => setModalRiwayatOpen(false)}
        title={selectedPelangganStat ? `Riwayat Belanja — ${selectedPelangganStat.nama}` : 'Riwayat Belanja'}
        lebar="max-w-2xl"
        footer={
          <Button variant="secondary" onClick={() => setModalRiwayatOpen(false)}>
            Tutup
          </Button>
        }
      >
        {selectedPelangganStat && (
          <div className="space-y-4">
            {/* Header info pelanggan */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 font-bold text-white text-lg">
                  {selectedPelangganStat.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-bold">{selectedPelangganStat.nama}</h4>
                  <p className="text-xs text-slate-400">
                    {selectedPelangganStat.telepon ? `📞 ${selectedPelangganStat.telepon}` : 'Tidak ada telepon'}
                    {selectedPelangganStat.alamat ? ` • 📍 ${selectedPelangganStat.alamat}` : ''}
                  </p>
                  {selectedPelangganStat.catatan && (
                    <p className="text-[11px] text-amber-300 mt-0.5">
                      Catatan: {selectedPelangganStat.catatan}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Akumulasi Belanja</p>
                <p className="text-xl font-extrabold text-emerald-400">
                  {rupiah(selectedPelangganStat.totalBelanja)}
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  {selectedPelangganStat.totalTrx} Kali Transaksi
                </p>
              </div>
            </div>

            {/* List Nota Belanja */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daftar Struk / Nota Transaksi ({selectedPelangganStat.daftarTransaksi.length})
              </h5>

              {selectedPelangganStat.daftarTransaksi.length === 0 ? (
                <EmptyState
                  judul="Belum ada transaksi"
                  pesan="Pelanggan ini belum memiliki riwayat pembelian di kasir."
                />
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {selectedPelangganStat.daftarTransaksi.map((trx) => (
                    <div
                      key={trx.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {trx.nomor}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {tanggalJam(trx.waktu)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            {trx.metode}
                          </span>
                          <span className="font-bold text-emerald-600 text-sm">
                            {rupiah(trx.total)}
                          </span>
                        </div>
                      </div>

                      {/* Detail Item Nota */}
                      <div className="mt-2.5 space-y-1 text-xs">
                        {trx.detail.map((d, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-600">
                            <div>
                              <span>{d.namaProduk}</span>
                              <span className="text-[11px] text-slate-400 ml-1">
                                ({d.qty} {d.satuan} @{rupiah(d.hargaSatuan)})
                              </span>
                            </div>
                            <span className="font-medium text-slate-800">
                              {rupiah(d.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Diskon jika ada */}
                      {trx.diskonNominal ? (
                        <div className="mt-2 flex justify-between border-t border-dashed border-slate-200 pt-1 text-[11px] text-rose-600">
                          <span>Potongan / Diskon Nota:</span>
                          <span>-{rupiah(trx.diskonNominal)}</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tambah / Edit Pelanggan */}
      <Modal
        open={modalFormOpen}
        onClose={() => setModalFormOpen(false)}
        title={editTarget ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
        lebar="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalFormOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSimpan}>
              {editTarget ? 'Simpan Perubahan' : 'Tambahkan Pelanggan'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <Label htmlFor="namaPelanggan">
              Nama Lengkap Pelanggan <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="namaPelanggan"
              placeholder="Contoh: Budi Santoso"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="telpPelanggan">Nomor Telepon / WhatsApp</Label>
            <Input
              id="telpPelanggan"
              placeholder="Contoh: 081234567890"
              value={formData.telepon}
              onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="alamatPelanggan">Alamat Lengkap</Label>
            <Input
              id="alamatPelanggan"
              placeholder="Contoh: Jl. Merdeka No. 12"
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="catatanPelanggan">Catatan Khusus</Label>
            <Input
              id="catatanPelanggan"
              placeholder="Contoh: Pelanggan warung kopi langganan / grosir"
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={!!hapusConfirm}
        onClose={() => setHapusConfirm(null)}
        title="Hapus Data Pelanggan?"
        lebar="max-w-sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHapusConfirm(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => hapusConfirm && handleHapus(hapusConfirm)}>
              Ya, Hapus
            </Button>
          </>
        }
      >
        {hapusConfirm && (
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menghapus pelanggan <strong>{hapusConfirm.nama}</strong>? Transaksi lama yang mencatat nama ini tidak akan terhapus.
          </p>
        )}
      </Modal>
    </div>
  )
}
