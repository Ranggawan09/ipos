import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, getShiftNomor } from '@/lib/format'
import { Badge, Button, Card, CurrencyInput, DataTable, Label, Modal, PageHeader, StatCard } from '@/components/ui'

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

export function ShiftPage() {
  const { shifts, users, transaksi, tutupShift } = useDataStore()
  const { currentUser } = useSessionStore()
  const push = useToast((s) => s.push)

  const isAdmin = currentUser?.role === 'admin'
  const [tutupModal, setTutupModal] = useState(false)
  const [saldoAkhir, setSaldoAkhir] = useState(0)
  const [filterShiftNomor, setFilterShiftNomor] = useState<string>('semua')

  const shiftSaya = shifts.find((s) => s.kasirId === currentUser?.id && s.status === 'buka') ?? null

  const rows = useMemo(() => {
    return shifts.filter((s) => {
      const cocokUser = isAdmin || s.kasirId === currentUser?.id
      const no = getShiftNomor(s)
      const cocokShift = filterShiftNomor === 'semua' || String(no) === filterShiftNomor
      return cocokUser && cocokShift
    })
  }, [shifts, isAdmin, currentUser?.id, filterShiftNomor])

  const namaKasir = (id: string) => users.find((u) => u.id === id)?.nama ?? id

  const jumlahTransaksiShift = (shiftId: string) =>
    transaksi.filter((t) => t.shiftId === shiftId && t.status === 'selesai').length

  const totalPengeluaranShift = shiftSaya?.totalPengeluaran ?? 0
  const kasDiharapkan = (shiftSaya?.saldoAwal ?? 0) + (shiftSaya?.totalTunai ?? 0) - totalPengeluaranShift

  const bukaTutup = () => {
    if (!shiftSaya) return
    setSaldoAkhir(kasDiharapkan)
    setTutupModal(true)
  }

  const konfirmasiTutup = () => {
    if (!shiftSaya) return
    tutupShift(shiftSaya.id, saldoAkhir)
    push({ tipe: 'sukses', judul: 'Shift ditutup', pesan: `Saldo akhir ${rupiah(saldoAkhir)}` })
    setTutupModal(false)
  }

  const selisihShift = shiftSaya ? saldoAkhir - kasDiharapkan : 0

  const totalShiftTutup = rows.filter((s) => s.status === 'tutup').length
  const totalPenjualanSemua = rows.reduce((a, s) => a + s.totalPenjualan, 0)

  return (
    <>
      <PageHeader
        judul="Shift Kasir"
        deskripsi="Catat pembukaan dan penutupan shift beserta saldo kas awal dan akhir."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Shift" value={rows.length} hint={`${totalShiftTutup} sudah ditutup`} tone="brand" />
        <StatCard label="Total Penjualan (semua shift)" value={rupiah(totalPenjualanSemua)} tone="green" />
        <StatCard
          label="Status Shift Anda"
          value={shiftSaya ? 'Sedang berjalan' : 'Tidak ada'}
          tone={shiftSaya ? 'amber' : 'violet'}
        />
      </div>

      {shiftSaya && (
        <Card
          className="mb-4 border-amber-200 bg-amber-50/50"
          title="Shift Anda Saat Ini"
          action={renderShiftBadge(getShiftNomor(shiftSaya))}
          subtitle={`Dibuka ${tanggalJam(shiftSaya.waktuBuka)}`}
        >
          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">Saldo awal</p>
              <p className="text-sm font-semibold text-slate-700">{rupiah(shiftSaya.saldoAwal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Penjualan tunai</p>
              <p className="text-sm font-semibold text-slate-700">{rupiah(shiftSaya.totalTunai)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pengeluaran kasir</p>
              <p className="text-sm font-semibold text-rose-600">
                {totalPengeluaranShift > 0 ? `-${rupiah(totalPengeluaranShift)}` : 'Rp 0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Penjualan non-tunai</p>
              <p className="text-sm font-semibold text-slate-700">{rupiah(shiftSaya.totalNonTunai)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Transaksi</p>
              <p className="text-sm font-semibold text-slate-700">{shiftSaya.jumlahTransaksi}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">Perkiraan saldo kas di laci</p>
              <p className="text-lg font-bold text-slate-800">{rupiah(kasDiharapkan)}</p>
            </div>
            <Button variant="danger" onClick={bukaTutup}>Tutup Shift</Button>
          </div>
        </Card>
      )}

      <Card
        title="Daftar Shift"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Filter:</span>
              <select
                value={filterShiftNomor}
                onChange={(e) => setFilterShiftNomor(e.target.value)}
                className="border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
              >
                <option value="semua">Semua Shift (1–2)</option>
                <option value="1">Shift 1 (Pagi)</option>
                <option value="2">Shift 2 (Siang / Malam)</option>
              </select>
            </div>
            <Badge warna="blue">FR-POS-08</Badge>
          </div>
        }
      >
        <DataTable
          data={rows}
          kolom={[
            {
              key: 'kasir',
              header: 'Kasir & Shift',
              render: (s) => (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{namaKasir(s.kasirId)}</span>
                  {renderShiftBadge(getShiftNomor(s))}
                </div>
              ),
            },
            { key: 'buka', header: 'Buka', render: (s) => <span className="text-xs text-slate-500">{tanggalJam(s.waktuBuka)}</span> },
            { key: 'tutup', header: 'Tutup', render: (s) => <span className="text-xs text-slate-500">{s.waktuTutup ? tanggalJam(s.waktuTutup) : '-'}</span> },
            { key: 'saldoAwal', header: 'Saldo Awal', align: 'right', render: (s) => rupiah(s.saldoAwal) },
            { key: 'penjualan', header: 'Penjualan', align: 'right', render: (s) => (
              <div>
                <p className="font-medium">{rupiah(s.totalPenjualan)}</p>
                <p className="text-[11px] text-slate-400">{jumlahTransaksiShift(s.id)} trx</p>
              </div>
            ) },
            { key: 'tunai', header: 'Tunai', align: 'right', render: (s) => rupiah(s.totalTunai) },
            {
              key: 'pengeluaran',
              header: 'Kas Keluar',
              align: 'right',
              render: (s) =>
                s.totalPengeluaran ? (
                  <span className="font-medium text-rose-600">-{rupiah(s.totalPengeluaran)}</span>
                ) : (
                  '-'
                ),
            },
            { key: 'nonTunai', header: 'Non-Tunai', align: 'right', render: (s) => rupiah(s.totalNonTunai) },
            { key: 'saldoAkhir', header: 'Saldo Akhir', align: 'right', render: (s) => s.saldoAkhir !== undefined ? rupiah(s.saldoAkhir) : '-' },
            { key: 'status', header: 'Status', render: (s) => s.status === 'buka' ? <Badge warna="amber">Buka</Badge> : <Badge warna="slate">Tutup</Badge> },
          ]}
          kosong="Belum ada data shift"
        />
      </Card>

      <Modal
        open={tutupModal}
        onClose={() => setTutupModal(false)}
        title="Tutup Shift"
        footer={<><Button variant="secondary" onClick={() => setTutupModal(false)}>Batal</Button><Button variant="danger" onClick={konfirmasiTutup}>Tutup Shift</Button></>}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Hitung uang fisik di laci kas, lalu masukkan jumlahnya. Sistem akan menampilkan selisih terhadap perkiraan.
          </p>
          <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Saldo awal</span><span>{rupiah(shiftSaya?.saldoAwal ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Penjualan tunai</span><span>{rupiah(shiftSaya?.totalTunai ?? 0)}</span></div>
            {totalPengeluaranShift > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Pengeluaran kasir (kas keluar)</span>
                <span>-{rupiah(totalPengeluaranShift)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-medium"><span>Perkiraan kas fisik laci</span><span>{rupiah(kasDiharapkan)}</span></div>
          </div>
          <div>
            <Label>Saldo kas akhir (hasil hitung fisik)</Label>
            <CurrencyInput sizeVariant="lg" value={saldoAkhir} onChange={setSaldoAkhir} className="text-lg font-semibold" />
          </div>
          <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${selisihShift === 0 ? 'bg-emerald-50' : selisihShift > 0 ? 'bg-brand-50' : 'bg-rose-50'}`}>
            <span className="text-sm font-medium text-slate-600">Selisih</span>
            <span className={`text-lg font-bold ${selisihShift === 0 ? 'text-emerald-700' : selisihShift > 0 ? 'text-brand-700' : 'text-rose-700'}`}>
              {selisihShift > 0 ? '+' : ''}{rupiah(selisihShift)}
            </span>
          </div>
        </div>
      </Modal>
    </>
  )
}
