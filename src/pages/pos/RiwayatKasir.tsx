import { useMemo, useState } from 'react'
import type { Transaksi } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, getShiftNomor } from '@/lib/format'
import { Badge, Button, Card, DataTable, Input, Modal, PageHeader, Select } from '@/components/ui'

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

export function RiwayatKasir() {
  const { transaksi, shifts, users, returPelanggan } = useDataStore()
  const { currentUser, pendingQueue } = useSessionStore()
  const push = useToast((s) => s.push)

  const isAdmin = currentUser?.role === 'admin'
  const [filterShift, setFilterShift] = useState('')
  const [filterKasir, setFilterKasir] = useState(isAdmin ? '' : currentUser?.id ?? '')
  const [cari, setCari] = useState('')
  const [returTarget, setReturTarget] = useState<Transaksi | null>(null)
  const [qtyRetur, setQtyRetur] = useState<Record<string, number>>({})

  const shiftKasir = shifts.filter((s) => isAdmin || s.kasirId === currentUser?.id)

  const getShiftNoForTrx = (shiftId: string): 1 | 2 => {
    const s = shifts.find((x) => x.id === shiftId)
    return getShiftNomor(s ?? (shiftId ? { id: shiftId } : null))
  }

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return transaksi.filter((t) => {
      const cocokKasir = !filterKasir || t.kasirId === filterKasir
      const shiftNo = getShiftNoForTrx(t.shiftId)
      const cocokShift = !filterShift || (
        ['1', '2'].includes(filterShift)
          ? String(shiftNo) === filterShift
          : t.shiftId === filterShift
      )
      const cocokCari = !q || t.nomor.toLowerCase().includes(q)
      return cocokKasir && cocokShift && cocokCari
    })
  }, [transaksi, filterKasir, filterShift, cari, shifts])

  const namaKasir = (id: string) => users.find((u) => u.id === id)?.nama ?? id
  const shiftLabel = (id: string) => {
    const s = shifts.find((x) => x.id === id)
    return s ? tanggalJam(s.waktuBuka) : '-'
  }

  const konfirmasiRetur = () => {
    if (!returTarget) return
    const items = Object.entries(qtyRetur)
      .filter(([, q]) => q > 0)
      .map(([produkId, qty]) => ({ produkId, qty }))
    if (items.length === 0) {
      push({ tipe: 'peringatan', judul: 'Pilih minimal satu item untuk diretur' })
      return
    }
    returPelanggan({ transaksiId: returTarget.id, items, userId: currentUser?.id ?? '' })
    push({ tipe: 'sukses', judul: 'Retur diproses', pesan: `${items.length} item dikembalikan ke stok` })
    setReturTarget(null)
    setQtyRetur({})
  }

  return (
    <>
      <PageHeader
        judul="Riwayat Transaksi"
        deskripsi="Transaksi dapat difilter berdasarkan kasir dan shift."
      />

      {pendingQueue.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800">
            {pendingQueue.length} transaksi tersimpan offline dan menunggu sinkronisasi.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Matikan mode offline pada bilah atas untuk mengirim ke server lokal.
          </p>
        </Card>
      )}

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Cari nomor transaksi..." value={cari} onChange={(e) => setCari(e.target.value)} />
          <Select value={filterKasir} onChange={(e) => setFilterKasir(e.target.value)}>
            <option value="">Semua kasir</option>
            {users.filter((u) => u.role === 'kasir' || u.role === 'admin').map((u) => (
              <option key={u.id} value={u.id}>{u.nama}</option>
            ))}
          </Select>
          <Select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
            <option value="">Semua shift (1–2)</option>
            <option value="1">Shift 1 (Pagi)</option>
            <option value="2">Shift 2 (Siang / Malam)</option>
            {shiftKasir.slice(0, 40).map((s) => (
              <option key={s.id} value={s.id}>{tanggalJam(s.waktuBuka)} ({namaKasir(s.kasirId)})</option>
            ))}
          </Select>
          <div className="flex items-center justify-end text-xs text-slate-500">
            {rows.length} transaksi | {rupiah(rows.filter((t) => t.status === 'selesai').reduce((a, t) => a + t.total, 0))}
          </div>
        </div>
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
            { key: 'kasir', header: 'Kasir', render: (t) => namaKasir(t.kasirId) },
            { key: 'shift', header: 'Shift', render: (t) => {
              const shiftNo = getShiftNoForTrx(t.shiftId)
              return (
                <div className="flex items-center gap-1.5">
                  {renderShiftBadge(shiftNo)}
                  <span className="text-xs text-slate-500">{shiftLabel(t.shiftId)}</span>
                </div>
              )
            } },
            { key: 'items', header: 'Item', align: 'right', render: (t) => t.detail.reduce((a, d) => a + d.qty, 0) },
            { key: 'metode', header: 'Bayar', render: (t) => <span className="text-xs capitalize">{t.metode}</span> },
            { key: 'total', header: 'Total', align: 'right', render: (t) => <span className="font-semibold">{rupiah(t.total)}</span> },
            { key: 'status', header: 'Status', render: (t) =>
              t.status === 'void' ? <Badge warna="red">Void</Badge> :
              t.status === 'menunggu_sinkron' ? <Badge warna="amber">Menunggu sinkron</Badge> :
              <Badge warna="green">Selesai</Badge> },
            { key: 'aksi', header: '', align: 'right', render: (t) => (
              <Button
                size="sm"
                variant="ghost"
                disabled={t.status !== 'selesai'}
                onClick={() => { setReturTarget(t); setQtyRetur({}) }}
              >
                Retur
              </Button>
            ) },
          ]}
          kosong="Belum ada transaksi"
        />
      </Card>

      <Modal
        open={!!returTarget}
        onClose={() => setReturTarget(null)}
        title="Retur Barang Pelanggan"
        lebar="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setReturTarget(null)}>Batal</Button><Button onClick={konfirmasiRetur}>Proses Retur</Button></>}
      >
        {returTarget && (
          <div>
            <p className="mb-3 text-sm text-slate-600">
              Nomor <span className="font-mono">{returTarget.nomor}</span> | {tanggalJam(returTarget.waktu)}
            </p>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Produk</th>
                    <th className="px-3 py-2 text-right">Dibeli</th>
                    <th className="px-3 py-2 text-right">Harga</th>
                    <th className="px-3 py-2 text-right">Qty Retur</th>
                  </tr>
                </thead>
                <tbody>
                  {returTarget.detail.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{d.namaProduk}</td>
                      <td className="px-3 py-2 text-right">{d.qty}</td>
                      <td className="px-3 py-2 text-right">{rupiah(d.hargaSatuan)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={d.qty}
                          value={qtyRetur[d.produkId] ?? 0}
                          onChange={(e) => setQtyRetur({ ...qtyRetur, [d.produkId]: Math.min(d.qty, Math.max(0, Number(e.target.value))) })}
                          className="w-20 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Barang yang diretur akan otomatis menambah kembali stok produk.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
