import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pengeluaran as TPengeluaran, ItemPengeluaran } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, getShiftNomor } from '@/lib/format'
import { cetakStrukPengeluaran } from '@/lib/print'
import { Badge, Button, Card, CurrencyInput, Input, Label, Modal, PageHeader, Select, StatCard } from '@/components/ui'

type BarisBarang = {
  tempId: string
  nama: string
  qty: number
  harga: number
}

const KATEGORI_PENGELUARAN = [
  { value: 'operasional_kasir', label: 'Operasional Kasir / Toko' },
  { value: 'transport', label: 'Transport / Kurir' },
  { value: 'listrik', label: 'Listrik & Air' },
  { value: 'lainnya', label: 'Keperluan Lainnya' },
] as const

export function PengeluaranKasir() {
  const navigate = useNavigate()
  const { shifts, pengeluaran, simpanPengeluaran, hapusPengeluaran } = useDataStore()
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

  // State untuk modal hapus
  const [itemHapus, setItemHapus] = useState<TPengeluaran | null>(null)

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

  // Daftar pengeluaran pada shift ini
  const pengeluaranShiftIni = useMemo(() => {
    if (!shiftSaya) return []
    return pengeluaran
      .filter((p) => p.shiftId === shiftSaya.id)
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
  }, [pengeluaran, shiftSaya])

  // Riwayat pengeluaran kasir lainnya
  const pengeluaranLainnya = useMemo(() => {
    return pengeluaran
      .filter((p) => p.shiftId !== shiftSaya?.id && p.userId === currentUser?.id)
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
      .slice(0, 10)
  }, [pengeluaran, shiftSaya, currentUser])

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

    const items = p.items && p.items.length > 0
      ? p.items
      : [{ nama: p.keterangan || 'Pengeluaran Kas', qty: 1, harga: p.jumlah, subtotal: p.jumlah }]

    cetakStrukPengeluaran({
      nomor: p.id,
      waktu: tanggalJam(p.tanggal),
      kasir: currentUser?.nama || 'Kasir',
      shiftNomor: shiftNo,
      kategori: KATEGORI_PENGELUARAN.find((k) => k.value === p.kategori)?.label || p.kategori,
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

  const totalPengeluaranShiftIni = shiftSaya?.totalPengeluaran ?? 0
  const saldoLaciSaatIni = (shiftSaya?.saldoAwal ?? 0) + (shiftSaya?.totalTunai ?? 0) - totalPengeluaranShiftIni

  return (
    <>
      <PageHeader
        judul="Pengeluaran Kasir (Kas Keluar)"
        deskripsi="Catat pengeluaran kas kecil operasional toko langsung dari laci kasir selama shift berjalan."
      />

      {/* Ringkasan Status Shift */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Shift Kasir Aktif"
          value={shiftSaya ? `Shift ${getShiftNomor(shiftSaya)}` : 'Belum Buka Shift'}
          hint={shiftSaya ? `Kasir: ${currentUser?.nama}` : 'Klik untuk buka shift'}
          tone={shiftSaya ? 'green' : 'amber'}
        />
        <StatCard
          label="Total Pengeluaran Shift Ini"
          value={rupiah(totalPengeluaranShiftIni)}
          hint={`${pengeluaranShiftIni.length} kali pengeluaran`}
          tone="rose"
        />
        <StatCard
          label="Estimasi Kas Laci Saat Ini"
          value={rupiah(saldoLaciSaatIni)}
          hint="Modal awal + Tunai - Pengeluaran"
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
        <div className="lg:col-span-7">
          <Card
            title="Form Catat Pengeluaran Kasir"
            subtitle="Masukkan daftar barang atau biaya yang dikeluarkan dari uang laci kasir."
            className="shadow-sm"
          >
            <div className="space-y-4">
              {/* Pilihan Kategori & Catatan */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                </div>
                <div>
                  <Label>Catatan / Keterangan (Opsional)</Label>
                  <Input
                    placeholder="Contoh: Beli di warung sebelah untuk operasional"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    disabled={!shiftSaya}
                  />
                </div>
              </div>

              {/* Tabel Input Barang */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="mb-0">Daftar Barang yang Dikeluarkan</Label>
                  <span className="text-[11px] text-slate-400">
                    Masukkan nama barang & harga per unit
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Nama Barang <span className="text-rose-500">*</span></th>
                        <th className="w-20 px-2 py-2 text-center">Qty</th>
                        <th className="w-36 px-2 py-2 text-right">Harga Barang <span className="text-rose-500">*</span></th>
                        <th className="w-32 px-3 py-2 text-right">Subtotal</th>
                        <th className="w-10 px-2 py-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {baris.map((b, idx) => {
                        const subtotal = Math.max(1, b.qty || 1) * (b.harga || 0)
                        return (
                          <tr key={b.tempId} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <Input
                                placeholder={`Nama barang #${idx + 1} (contoh: Plastik Kresek)`}
                                value={b.nama}
                                onChange={(e) => updateBaris(b.tempId, 'nama', e.target.value)}
                                disabled={!shiftSaya}
                                className="text-xs"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <Input
                                type="number"
                                min={1}
                                value={b.qty}
                                onChange={(e) =>
                                  updateBaris(
                                    b.tempId,
                                    'qty',
                                    Math.max(1, parseInt(e.target.value) || 1),
                                  )
                                }
                                disabled={!shiftSaya}
                                className="text-center text-xs font-bold"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <CurrencyInput
                                sizeVariant="sm"
                                value={b.harga}
                                onChange={(val) => updateBaris(b.tempId, 'harga', val)}
                                disabled={!shiftSaya}
                                className="text-right text-xs"
                              />
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-800">
                              {rupiah(subtotal)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => hapusBaris(b.tempId)}
                                disabled={!shiftSaya}
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 transition"
                                title="Hapus baris ini"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-slate-600">
                          Total Pengeluaran Kasir
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-rose-600">
                          {rupiah(totalPengeluaranForm)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-2 flex justify-start">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={tambahBaris}
                    disabled={!shiftSaya}
                    className="text-xs"
                  >
                    + Tambah Baris Barang
                  </Button>
                </div>
              </div>

              {/* Total Banner & Aksi Simpan */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
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
                    size="md"
                    variant="secondary"
                    onClick={() => simpan(false)}
                    disabled={!shiftSaya || totalPengeluaranForm <= 0}
                  >
                    Simpan Saja
                  </Button>
                  <Button
                    type="button"
                    size="md"
                    variant="success"
                    onClick={() => simpan(true)}
                    disabled={!shiftSaya || totalPengeluaranForm <= 0}
                  >
                    Simpan & Cetak Struk
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabel Riwayat Pengeluaran Shift Ini */}
        <div className="lg:col-span-5">
          <Card
            title="Riwayat Kas Keluar Shift Ini"
            subtitle={`Total ${pengeluaranShiftIni.length} kali pengeluaran dicatat pada shift ini.`}
            className="shadow-sm"
          >
            {pengeluaranShiftIni.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">Belum ada pengeluaran kas pada shift ini.</p>
                <p className="mt-1 text-[11px] text-slate-300">
                  Pengeluaran yang Anda catat akan otomatis memotong kas laci kasir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pengeluaranShiftIni.map((p) => {
                  const itemsList = p.items || []
                  return (
                    <div
                      key={p.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{p.id}</span>
                            <Badge warna="red">{rupiah(p.jumlah)}</Badge>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-800">
                            {p.keterangan}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {tanggalJam(p.tanggal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCetak(p)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Cetak ulang struk pengeluaran"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="6 9 6 2 18 2 18 9"></polyline>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                              <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemHapus(p)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Batalkan / Hapus pengeluaran ini"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Detail barang jika ada */}
                      {itemsList.length > 0 && (
                        <div className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-600 border border-slate-100">
                          <p className="font-semibold text-slate-700 mb-1">Rincian Barang:</p>
                          <ul className="space-y-0.5 divide-y divide-slate-100">
                            {itemsList.map((it, iIdx) => (
                              <li key={iIdx} className="flex justify-between pt-0.5">
                                <span>
                                  {it.nama} <span className="text-slate-400">({it.qty}x)</span>
                                </span>
                                <span className="font-medium text-slate-700">{rupiah(it.subtotal)}</span>
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

          {/* Histori pengeluaran kasir lainnya */}
          {pengeluaranLainnya.length > 0 && (
            <div className="mt-4">
              <Card
                title="Histori Pengeluaran Shift Sebelumnya"
                subtitle="Daftar pengeluaran Anda dari shift sebelumnya."
                className="shadow-2xs"
              >
                <div className="space-y-2">
                  {pengeluaranLainnya.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1 text-xs border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-medium text-slate-700">{p.keterangan}</p>
                        <p className="text-[10px] text-slate-400">{tanggalJam(p.tanggal)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{rupiah(p.jumlah)}</span>
                        <button
                          type="button"
                          onClick={() => handleCetak(p)}
                          className="text-[11px] text-brand-600 hover:underline"
                        >
                          Struk
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
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
