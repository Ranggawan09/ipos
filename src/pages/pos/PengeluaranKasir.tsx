import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pengeluaran as TPengeluaran, ItemPengeluaran } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, getShiftNomor } from '@/lib/format'
import { cetakStrukPengeluaran } from '@/lib/print'
import { Button, Card, CurrencyInput, Input, Label, Modal, PageHeader, Select, StatCard } from '@/components/ui'

type BarisBarang = {
  tempId: string
  nama: string
  qty: number
  harga: number
}

// Hanya 2 kategori pengeluaran kasir: Operasional Kasir dan Lain-lain
const KATEGORI_PENGELUARAN = [
  { value: 'operasional_kasir', label: 'Operasional Kasir' },
  { value: 'lainnya', label: 'Lain-lain' },
] as const

export function PengeluaranKasir() {
  const navigate = useNavigate()
  const { shifts, pengeluaran, users, simpanPengeluaran, hapusPengeluaran } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  // Shift kasir yang sedang aktif
  const shiftSaya = shifts.find((s) => s.kasirId === currentUser?.id && s.status === 'buka') ?? null

  // State form input barang
  const [kategori, setKategori] = useState<TPengeluaran['kategori']>('operasional_kasir')
  const [keterangan, setKeterangan] = useState('')
  const [baris, setBaris] = useState<BarisBarang[]>([
    { tempId: '1', nama: '', qty: 1, harga: 0 },
  ])

  // Filter pencarian dan kategori untuk daftar pengeluaran semua shift
  const [filterKategori, setFilterKategori] = useState<string>('')
  const [cariRiwayat, setCariRiwayat] = useState<string>('')

  // State untuk modal hapus
  const [itemHapus, setItemHapus] = useState<TPengeluaran | null>(null)

  // User map untuk mengecek peran pembuat transaksi
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  // Seluruh transaksi pengeluaran yang dibuat oleh kasir dan admin di semua shift.
  // Hanya kategori 'operasional_kasir' dan 'lainnya', serta BUKAN transaksi yang dibuat oleh owner.
  const semuaPengeluaranKasir = useMemo(() => {
    return pengeluaran
      .filter((p) => {
        // 1. Kategori hanya operasional_kasir dan lainnya
        if (p.kategori !== 'operasional_kasir' && p.kategori !== 'lainnya') {
          return false
        }

        // 2. Hanya transaksi yang dibuat oleh kasir atau admin (bukan owner)
        const pembuat = userMap.get(p.userId)
        if (pembuat && pembuat.role === 'owner') {
          return false
        }

        const dibuatKasirAtauAdmin = Boolean(p.shiftId) || (pembuat ? pembuat.role === 'kasir' || pembuat.role === 'admin' : true)
        return dibuatKasirAtauAdmin
      })
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
  }, [pengeluaran, userMap])

  // Data terfilter untuk ditampilkan
  const filteredPengeluaranKasir = useMemo(() => {
    const q = cariRiwayat.toLowerCase().trim()
    return semuaPengeluaranKasir.filter((p) => {
      const cocokKat = !filterKategori || p.kategori === filterKategori
      const cocokCari = !q || p.keterangan.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      return cocokKat && cocokCari
    })
  }, [semuaPengeluaranKasir, filterKategori, cariRiwayat])

  // Daftar pengeluaran pada shift aktif saat ini
  const pengeluaranShiftIni = useMemo(() => {
    if (!shiftSaya) return []
    return semuaPengeluaranKasir.filter((p) => p.shiftId === shiftSaya.id)
  }, [semuaPengeluaranKasir, shiftSaya])

  // Tambah baris barang baru
  const tambahBaris = () => {
    setBaris((prev) => [
      ...prev,
      { tempId: String(Date.now() + Math.random()), nama: '', qty: 1, harga: 0 },
    ])
  }

  // Update baris barang
  const updateBaris = (tempId: string, field: keyof BarisBarang, val: string | number) => {
    setBaris((prev) =>
      prev.map((b) => (b.tempId === tempId ? { ...b, [field]: val } : b)),
    )
  }

  // Hapus baris barang
  const hapusBaris = (tempId: string) => {
    if (baris.length <= 1) {
      setBaris([{ tempId: '1', nama: '', qty: 1, harga: 0 }])
      return
    }
    setBaris((prev) => prev.filter((b) => b.tempId !== tempId))
  }

  // Reset form
  const resetForm = () => {
    setBaris([{ tempId: '1', nama: '', qty: 1, harga: 0 }])
    setKeterangan('')
    setKategori('operasional_kasir')
  }

  // Total perhitungan form
  const totalPengeluaranForm = useMemo(() => {
    return baris.reduce((sum, b) => sum + (Math.max(1, b.qty || 1) * (b.harga || 0)), 0)
  }, [baris])

  // Simpan pengeluaran
  const simpan = (cetakSetelahSimpan = false) => {
    if (!shiftSaya) {
      push({
        tipe: 'error',
        judul: 'Shift Belum Dibuka',
        pesan: 'Anda harus membuka shift kasir terlebih dahulu untuk mencatat pengeluaran kas.',
      })
      return
    }

    const itemsValid: ItemPengeluaran[] = baris
      .filter((b) => b.nama.trim().length > 0 && b.harga > 0)
      .map((b) => ({
        nama: b.nama.trim(),
        qty: Math.max(1, b.qty || 1),
        harga: b.harga,
        subtotal: Math.max(1, b.qty || 1) * b.harga,
      }))

    if (itemsValid.length === 0) {
      push({
        tipe: 'error',
        judul: 'Barang Belum Diisi',
        pesan: 'Isi minimal 1 nama barang dan nominal harga barang.',
      })
      return
    }

    const totalFix = itemsValid.reduce((a, b) => a + b.subtotal, 0)
    const ringkasanDefault = itemsValid.map((it) => `${it.nama} (${it.qty}x)`).join(', ')

    const saved = simpanPengeluaran({
      kategori,
      keterangan: keterangan.trim() ? keterangan.trim() : ringkasanDefault,
      jumlah: totalFix,
      tanggal: new Date().toISOString(),
      userId: currentUser?.id || '',
      shiftId: shiftSaya.id,
      items: itemsValid,
    })

    push({
      tipe: 'sukses',
      judul: 'Pengeluaran Berhasil Dicatat',
      pesan: `Total ${rupiah(totalFix)} dipotong dari saldo kas laci shift.`,
    })

    resetForm()

    if (cetakSetelahSimpan && saved) {
      handleCetak(saved)
    }
  }

  // Cetak struk pengeluaran thermal
  const handleCetak = (p: TPengeluaran) => {
    const shiftTarget = shifts.find((s) => s.id === p.shiftId)
    const shiftNo = shiftTarget ? getShiftNomor(shiftTarget) : undefined
    const kasirNama = users.find((u) => u.id === p.userId)?.nama || currentUser?.nama || 'Kasir'

    const items = p.items && p.items.length > 0
      ? p.items
      : [{ nama: p.keterangan || 'Pengeluaran Kas', qty: 1, harga: p.jumlah, subtotal: p.jumlah }]

    cetakStrukPengeluaran({
      nomor: p.id,
      waktu: tanggalJam(p.tanggal),
      kasir: kasirNama,
      shiftNomor: shiftNo,
      kategori: p.kategori === 'operasional_kasir' ? 'Operasional Kasir' : 'Lain-lain',
      keterangan: p.keterangan,
      items,
      total: p.jumlah,
    })
  }

  // Konfirmasi hapus pengeluaran
  const eksekusiHapus = () => {
    if (!itemHapus) return
    hapusPengeluaran(itemHapus.id)
    push({
      tipe: 'sukses',
      judul: 'Pengeluaran Dibatalkan',
      pesan: `Saldo kas laci otomatis disesuaikan kembali (+${rupiah(itemHapus.jumlah)}).`,
    })
    setItemHapus(null)
  }

  const getKasirNama = (userId: string) => users.find((u) => u.id === userId)?.nama ?? 'Kasir'
  const getShiftBadgeText = (shiftId?: string) => {
    if (!shiftId) return 'Non-Shift'
    const s = shifts.find((sh) => sh.id === shiftId)
    if (!s) return 'Shift Kasir'
    return `Shift ${getShiftNomor(s)}`
  }

  const totalPengeluaranShiftIni = shiftSaya?.totalPengeluaran ?? 0
  const totalSemuaPengeluaranKasir = semuaPengeluaranKasir.reduce((a, b) => a + b.jumlah, 0)

  return (
    <>
      <PageHeader
        judul="Pengeluaran Kasir (Kas Keluar)"
        deskripsi="Catat pengeluaran kas kecil operasional toko langsung dari laci kasir dan pantau histori semua shift."
      />

      {/* Ringkasan Status Shift */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Shift Kasir Aktif"
          value={shiftSaya ? `Shift ${getShiftNomor(shiftSaya)}` : 'Belum Buka Shift'}
          hint={shiftSaya ? `Kasir: ${currentUser?.nama}` : 'Klik untuk buka shift di POS'}
          tone={shiftSaya ? 'green' : 'amber'}
        />
        <StatCard
          label="Pengeluaran Shift Aktif"
          value={rupiah(totalPengeluaranShiftIni)}
          hint={`${pengeluaranShiftIni.length} pengeluaran shift ini`}
          tone="rose"
        />
        <StatCard
          label="Total Kasir (Semua Shift)"
          value={rupiah(totalSemuaPengeluaranKasir)}
          hint={`${semuaPengeluaranKasir.length} transaksi kasir tercatat`}
          tone="brand"
        />
      </div>

      {/* Peringatan jika belum buka shift */}
      {!shiftSaya && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Shift Kerja Kasir Belum Dibuka</h3>
              <p className="mt-0.5 text-xs text-amber-700">
                Untuk mencatat pengeluaran yang memotong kas laci, silakan buka shift kasir terlebih dahulu.
              </p>
            </div>
            <Button size="sm" variant="success" onClick={() => navigate('/kasir')}>
              Buka Shift di Layar Kasir
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Form Catat Pengeluaran Baru */}
        <div className="lg:col-span-5">
          <Card
            title="Form Catat Pengeluaran Kasir"
            subtitle="Masukkan barang atau biaya yang dikeluarkan dari uang laci kasir."
            className="shadow-sm"
          >
            <div className="space-y-4">
              {/* Pilihan Kategori */}
              <div>
                <Label>Kategori Pengeluaran</Label>
                <Select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as TPengeluaran['kategori'])}
                  disabled={!shiftSaya}
                >
                  {KATEGORI_PENGELUARAN.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Pilih antara operasional kasir atau keperluan lain-lain.
                </p>
              </div>

              {/* Catatan / Keterangan Tambahan */}
              <div>
                <Label>Catatan / Keperluan (Opsional)</Label>
                <Input
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Misal: beli plastik kresek, air galon, sapu lidi..."
                  disabled={!shiftSaya}
                />
              </div>

              {/* Rincian Barang / Biaya */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Rincian Item Barang / Biaya</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={tambahBaris}
                    disabled={!shiftSaya}
                    className="text-xs"
                  >
                    + Tambah Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {baris.map((b, idx) => {
                    const subtotalItem = Math.max(1, b.qty || 1) * (b.harga || 0)
                    return (
                      <div
                        key={b.tempId}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                          <Input
                            value={b.nama}
                            onChange={(e) => updateBaris(b.tempId, 'nama', e.target.value)}
                            placeholder="Nama item (contoh: Plastik 24cm)"
                            disabled={!shiftSaya}
                            className="flex-1 text-xs py-1"
                          />
                          <button
                            type="button"
                            onClick={() => hapusBaris(b.tempId)}
                            disabled={!shiftSaya}
                            className="h-7 w-7 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center transition"
                            title="Hapus baris ini"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block mb-0.5">Qty / Jumlah:</span>
                            <Input
                              type="number"
                              min="1"
                              value={b.qty}
                              onChange={(e) => updateBaris(b.tempId, 'qty', parseInt(e.target.value) || 1)}
                              disabled={!shiftSaya}
                              className="text-xs py-1 font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block mb-0.5">Harga Satuan (Rp):</span>
                            <CurrencyInput
                              sizeVariant="sm"
                              value={b.harga}
                              onChange={(val) => updateBaris(b.tempId, 'harga', val)}
                              disabled={!shiftSaya}
                              placeholder="0"
                              className="text-xs font-mono font-semibold"
                            />
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                          Subtotal: <strong className="text-slate-800">{rupiah(subtotalItem)}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total Banner & Aksi Simpan */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-900">Total Kas Keluar:</span>
                <span className="text-base font-bold font-mono text-rose-700">{rupiah(totalPengeluaranForm)}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetForm}
                  disabled={!shiftSaya}
                >
                  Reset Form
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => simpan(false)}
                    disabled={!shiftSaya || totalPengeluaranForm <= 0}
                  >
                    Simpan Saja
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="success"
                    onClick={() => simpan(true)}
                    disabled={!shiftSaya || totalPengeluaranForm <= 0}
                  >
                    Simpan & Cetak
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabel Riwayat Pengeluaran Kasir di Semua Shift */}
        <div className="lg:col-span-7">
          <Card
            title="Riwayat Pengeluaran Kasir (Semua Shift)"
            subtitle={`${filteredPengeluaranKasir.length} dari ${semuaPengeluaranKasir.length} transaksi pengeluaran kasir.`}
            className="shadow-sm"
          >
            {/* Toolbar Filter */}
            <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={cariRiwayat}
                onChange={(e) => setCariRiwayat(e.target.value)}
                placeholder="Cari keterangan / nomor..."
                className="text-xs"
              />
              <Select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="text-xs"
              >
                <option value="">Semua Kategori</option>
                {KATEGORI_PENGELUARAN.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </div>

            {filteredPengeluaranKasir.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400">Tidak ada data transaksi pengeluaran kasir.</p>
                <p className="mt-1 text-[11px] text-slate-300">
                  Seluruh pengeluaran yang dibuat oleh kasir di semua shift akan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredPengeluaranKasir.map((p) => {
                  const itemsList = p.items || []
                  const isCurrentShift = shiftSaya && p.shiftId === shiftSaya.id
                  const kategoriLabel = p.kategori === 'operasional_kasir' ? 'Operasional Kasir' : 'Lain-lain'

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-3 transition shadow-2xs ${
                        isCurrentShift
                          ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400 font-semibold">{p.id}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                              {getShiftBadgeText(p.shiftId)}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                              p.kategori === 'operasional_kasir'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {kategoriLabel}
                            </span>
                            {isCurrentShift && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                                Shift Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800">
                            {p.keterangan}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {tanggalJam(p.tanggal)} • Kasir: <strong className="text-slate-600">{getKasirNama(p.userId)}</strong>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-mono text-rose-600">{rupiah(p.jumlah)}</p>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleCetak(p)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                              title="Cetak ulang struk"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                              </svg>
                            </button>
                            {isCurrentShift && (
                              <button
                                type="button"
                                onClick={() => setItemHapus(p)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Batalkan pengeluaran shift ini"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detail barang */}
                      {itemsList.length > 0 && (
                        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 border border-slate-100">
                          <p className="font-semibold text-slate-700 mb-1">Rincian Barang:</p>
                          <ul className="space-y-0.5 divide-y divide-slate-100">
                            {itemsList.map((it, iIdx) => (
                              <li key={iIdx} className="flex justify-between pt-0.5">
                                <span>
                                  {it.nama} <span className="text-slate-400">({it.qty}x)</span>
                                </span>
                                <span className="font-medium text-slate-700 font-mono">{rupiah(it.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Pengeluaran */}
      <Modal
        open={Boolean(itemHapus)}
        onClose={() => setItemHapus(null)}
        title="Batalkan Pengeluaran Kasir"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemHapus(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={eksekusiHapus}>
              Ya, Batalkan Pengeluaran
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin membatalkan pengeluaran sebesar{' '}
            <span className="font-bold text-slate-800">{rupiah(itemHapus?.jumlah || 0)}</span>?
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <p className="font-semibold text-slate-700">Rincian yang dibatalkan:</p>
            <p className="mt-1">{itemHapus?.keterangan}</p>
            <p className="mt-0.5 text-slate-400">Waktu: {itemHapus ? tanggalJam(itemHapus.tanggal) : '-'}</p>
          </div>
          <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
            Saldo kas laci shift Anda akan otomatis bertambah kembali sebesar{' '}
            <strong>{rupiah(itemHapus?.jumlah || 0)}</strong>.
          </p>
        </div>
      </Modal>
    </>
  )
}
