import { useMemo, useState } from 'react'
import type { Transaksi } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, getShiftNomor } from '@/lib/format'
import { cetakStruk } from '@/lib/print'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select, Textarea } from '@/components/ui'

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

export function TransaksiAdmin() {
  const { transaksi, users, shifts, voidTransaksi } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const isOwner = currentUser?.role === 'owner'
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [detail, setDetail] = useState<Transaksi | null>(null)
  const [voidTarget, setVoidTarget] = useState<Transaksi | null>(null)
  const [adminId, setAdminId] = useState('')
  const [pin, setPin] = useState('')
  const [alasan, setAlasan] = useState('')

  const namaKasir = (id: string) => users.find((u) => u.id === id)?.nama ?? id
  const shiftLabel = (id: string) => {
    const s = shifts.find((x) => x.id === id)
    return s ? tanggalJam(s.waktuBuka) : '-'
  }
  const getShiftNoForTrx = (shiftId: string): 1 | 2 => {
    const s = shifts.find((x) => x.id === shiftId)
    return getShiftNomor(s ?? (shiftId ? { id: shiftId } : null))
  }

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return transaksi.filter((t) => {
      const cocokCari = !q || t.nomor.toLowerCase().includes(q)
      const shiftNo = getShiftNoForTrx(t.shiftId)
      const cocokShift = !filterShift || String(shiftNo) === filterShift
      const cocokStatus = !filterStatus || t.status === filterStatus
      const cocokDari = !dari || t.waktu >= new Date(dari).toISOString()
      const cocokSampai = !sampai || t.waktu <= new Date(sampai + 'T23:59:59').toISOString()
      return cocokCari && cocokShift && cocokStatus && cocokDari && cocokSampai
    })
  }, [transaksi, cari, filterShift, filterStatus, dari, sampai, shifts])

  const bukaVoid = (t: Transaksi) => {
    setVoidTarget(t)
    setAdminId(users.find((u) => u.role === 'admin')?.id ?? '')
    setPin('')
    setAlasan('')
  }

  const konfirmasiVoid = () => {
    if (!voidTarget) return
    const admin = users.find((u) => u.id === adminId)
    if (!admin || admin.pin !== pin) {
      push({ tipe: 'error', judul: 'Otorisasi gagal', pesan: 'PIN admin tidak sesuai.' })
      return
    }
    if (!alasan.trim()) {
      push({ tipe: 'error', judul: 'Alasan void wajib diisi' })
      return
    }
    voidTransaksi(voidTarget.id, admin.id, alasan)
    push({ tipe: 'sukses', judul: 'Transaksi dibatalkan', pesan: `${voidTarget.nomor}: stok dikembalikan` })
    setVoidTarget(null)
  }

  const totalSelesai = rows.filter((t) => t.status === 'selesai').reduce((a, t) => a + t.total, 0)

  return (
    <>
      <PageHeader
        judul="Transaksi Penjualan"
        deskripsi="Seluruh transaksi dari modul POS. Pembatalan (void) memerlukan otorisasi admin."
        aksi={<FR kode="FR-POS-07" />}
      />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Input placeholder="Cari nomor..." value={cari} onChange={(e) => setCari(e.target.value)} />
          <Select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
            <option value="">Semua Shift (1–2)</option>
            <option value="1">Shift 1 (Pagi)</option>
            <option value="2">Shift 2 (Siang / Malam)</option>
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua status</option>
            <option value="selesai">Selesai</option>
            <option value="void">Void</option>
          </Select>
          <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
          <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {rows.length} transaksi | Nilai transaksi selesai: <span className="font-semibold text-slate-700">{rupiah(totalSelesai)}</span>
        </p>
      </Card>

      <Card>
        <DataTable
          data={rows}
          kolom={[
            { key: 'nomor', header: 'Nomor', render: (t) => (
              <div>
                <p className="font-mono text-xs text-slate-700">{t.nomor}</p>
                <p className="text-[11px] text-slate-400">{tanggalJam(t.waktu)}</p>
              </div>
            ) },
            { key: 'kasir', header: 'Kasir & Shift', render: (t) => {
              const shiftNo = getShiftNoForTrx(t.shiftId)
              return (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-700">{namaKasir(t.kasirId)}</span>
                    {renderShiftBadge(shiftNo)}
                  </div>
                  <p className="text-[11px] text-slate-400">{shiftLabel(t.shiftId)}</p>
                </div>
              )
            } },
            { key: 'items', header: 'Item', align: 'right', render: (t) => t.detail.reduce((a, d) => a + d.qty, 0) },
            { key: 'metode', header: 'Bayar', render: (t) => <span className="text-xs capitalize">{t.metode}</span> },
            { key: 'hpp', header: 'HPP', align: 'right', render: (t) => <span className="text-xs text-slate-500">{rupiah(t.hpp)}</span> },
            { key: 'total', header: 'Total', align: 'right', render: (t) => <span className="font-semibold">{rupiah(t.total)}</span> },
            { key: 'status', header: 'Status', render: (t) => t.status === 'void' ? <Badge warna="red">Void</Badge> : <Badge warna="green">Selesai</Badge> },
            { key: 'aksi', header: '', align: 'right', render: (t) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDetail(t)}>Detail</Button>
                {!isOwner && (
                  <Button size="sm" variant="ghost" className="text-rose-600" disabled={t.status === 'void'} onClick={() => bukaVoid(t)}>Void</Button>
                )}
              </div>
            ) },
          ]}
        />
      </Card>

      {/* Detail transaksi */}
      {/* Detail transaksi */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Transaksi"
        lebar="max-w-2xl"
        footer={
          detail ? (
            <div className="flex w-full items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const subtotalKotor = detail.detail.reduce((a, d) => a + d.qty * d.hargaSatuan, 0)
                  const totalDiskonItem = detail.detail.reduce((a, d) => a + (d.diskonItem || 0), 0)
                  const diskonNota = detail.diskonNominal || 0
                  cetakStruk({
                    namaToko: 'TOKO PASAR JAYA',
                    alamat: 'Pasar Induk Blok A No. 12, Jakarta',
                    nomor: detail.nomor,
                    waktu: tanggalJam(detail.waktu),
                    kasir: namaKasir(detail.kasirId),
                    items: detail.detail.map((d) => ({
                      nama: d.namaProduk,
                      qty: d.qty,
                      harga: d.hargaSatuan,
                      diskonItem: d.diskonItem,
                      subtotal: d.subtotal,
                    })),
                    subtotal: subtotalKotor,
                    diskonItem: totalDiskonItem,
                    diskonNota,
                    diskon: totalDiskonItem + diskonNota,
                    total: detail.total,
                    metode: detail.metode.toUpperCase(),
                    dibayar: detail.dibayar,
                    kembalian: detail.kembalian,
                  })
                }}
              >
                Cetak Struk Thermal
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>
                Tutup
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Nomor</p><p className="font-mono">{detail.nomor}</p></div>
              <div><p className="text-xs text-slate-400">Waktu</p><p>{tanggalJam(detail.waktu)}</p></div>
              <div><p className="text-xs text-slate-400">Kasir</p><p>{namaKasir(detail.kasirId)}</p></div>
              <div>
                <p className="text-xs text-slate-400">Shift</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {renderShiftBadge(getShiftNoForTrx(detail.shiftId))}
                  <span className="text-xs text-slate-500">({shiftLabel(detail.shiftId)})</span>
                </div>
              </div>
              <div><p className="text-xs text-slate-400">Metode</p><p className="capitalize">{detail.metode}</p></div>
            </div>
            {detail.status === 'void' && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Dibatalkan oleh {namaKasir(detail.voidBy ?? '')}: {detail.voidAlasan}
              </div>
            )}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Produk</th>
                    <th className="px-3 py-2 text-right">Harga</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Potongan</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.detail.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{d.namaProduk}<span className="ml-2 font-mono text-[10px] text-slate-400">{d.sku}</span></td>
                      <td className="px-3 py-2 text-right">{rupiah(d.hargaSatuan)}</td>
                      <td className="px-3 py-2 text-right">{d.qty}</td>
                      <td className="px-3 py-2 text-right">{d.diskonItem > 0 ? rupiah(d.diskonItem) : '-'}</td>
                      <td className="px-3 py-2 text-right">{rupiah(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const subtotalKotor = detail.detail.reduce((a, d) => a + d.qty * d.hargaSatuan, 0)
              const totalDiskonItem = detail.detail.reduce((a, d) => a + (d.diskonItem || 0), 0)
              return (
                <div className="ml-auto w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{rupiah(subtotalKotor)}</span></div>
                  {totalDiskonItem > 0 && (
                    <div className="flex justify-between text-rose-500"><span>Diskon item</span><span>-{rupiah(totalDiskonItem)}</span></div>
                  )}
                  {detail.diskonNominal > 0 && (
                    <div className="flex justify-between text-rose-500"><span>Diskon nota</span><span>-{rupiah(detail.diskonNominal)}</span></div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><span>Total</span><span>{rupiah(detail.total)}</span></div>
                  <div className="flex justify-between text-xs text-slate-400"><span>HPP</span><span>{rupiah(detail.hpp)}</span></div>
                  <div className="flex justify-between text-xs text-emerald-600"><span>Laba kotor</span><span>{rupiah(detail.total - detail.hpp)}</span></div>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      {/* Otorisasi void */}
      <Modal
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        title="Otorisasi Pembatalan Transaksi (Void)"
        footer={<><Button variant="secondary" onClick={() => setVoidTarget(null)}>Batal</Button><Button variant="danger" onClick={konfirmasiVoid}>Batalkan Transaksi</Button></>}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Void akan mengembalikan stok produk ke kondisi sebelum transaksi dan mencatat pergerakan stok.
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Nomor</span><span className="font-mono text-xs">{voidTarget?.nomor}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold">{rupiah(voidTarget?.total ?? 0)}</span></div>
          </div>
          <div>
            <Label>Admin yang mengotorisasi</Label>
            <Select value={adminId} onChange={(e) => setAdminId(e.target.value)}>
              {users.filter((u) => u.role === 'admin').map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </Select>
          </div>
          <div>
            <Label>PIN admin</Label>
            <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} placeholder="4 digit PIN admin" />
          </div>
          <div>
            <Label>Alasan pembatalan</Label>
            <Textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: salah input produk / pembeli batal" />
          </div>
          <p className="text-[11px] text-slate-400">PIN otorisasi administrator diperlukan untuk menyetujui pembatalan transaksi.</p>
        </div>
      </Modal>
    </>
  )
}
