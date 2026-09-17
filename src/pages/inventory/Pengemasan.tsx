import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam } from '@/lib/format'
import { Badge, Button, Card, DataTable, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

type DistribusiRow = { produkKemasanId: string; qty: number }

export function Pengemasan() {
  const { produk, resepKonversi, pengemasan, eksekusiPengemasan } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [modal, setModal] = useState(false)
  const [resepId, setResepId] = useState(resepKonversi[0]?.id ?? '')
  const [jumlahUnit, setJumlahUnit] = useState(1)
  const [distribusi, setDistribusi] = useState<DistribusiRow[]>([])
  const [waste, setWaste] = useState(0)

  const getNama = (id: string) => produk.find((p) => p.id === id)?.nama ?? '-'

  const resepTerpilih = resepKonversi.find((r) => r.id === resepId)
  const curahTerpilih = resepTerpilih ? produk.find((p) => p.id === resepTerpilih.produkCurahId) : null

  const totalBerat = resepTerpilih ? jumlahUnit * resepTerpilih.beratPerUnit : 0
  const hppPerSatuan = curahTerpilih && resepTerpilih ? curahTerpilih.hargaBeli / resepTerpilih.beratPerUnit : 0

  const totalBeratKemasan = distribusi.reduce((acc, d) => {
    const item = resepTerpilih?.items.find((it) => it.produkKemasanId === d.produkKemasanId)
    return acc + (item ? d.qty * item.beratPerKemasan : 0)
  }, 0)

  const sisaBerat = totalBerat - totalBeratKemasan - waste
  const isValid = sisaBerat >= 0 && distribusi.some((d) => d.qty > 0) && jumlahUnit > 0

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return pengemasan.filter((p) => {
      return !q || p.resepNama.toLowerCase().includes(q) || p.namaProdukCurah.toLowerCase().includes(q)
    })
  }, [pengemasan, cari])

  const bukaModal = () => {
    const r = resepKonversi[0]
    if (!r) {
      push({ tipe: 'error', judul: 'Belum ada resep konversi', pesan: 'Buat resep di halaman Resep Konversi terlebih dahulu.' })
      return
    }
    setResepId(r.id)
    setJumlahUnit(1)
    setWaste(0)
    setDistribusi(r.items.map((it) => ({ produkKemasanId: it.produkKemasanId, qty: 0 })))
    setModal(true)
  }

  const pilihResep = (id: string) => {
    setResepId(id)
    const r = resepKonversi.find((x) => x.id === id)
    if (r) {
      setDistribusi(r.items.map((it) => ({ produkKemasanId: it.produkKemasanId, qty: 0 })))
      setWaste(0)
    }
  }

  const ubahQty = (i: number, qty: number) => {
    setDistribusi(distribusi.map((d, idx) => (idx === i ? { ...d, qty } : d)))
  }

  const eksekusi = () => {
    if (!resepTerpilih || !curahTerpilih) return
    if (curahTerpilih.stok < jumlahUnit) {
      push({ tipe: 'error', judul: 'Stok curah tidak cukup', pesan: `Stok: ${curahTerpilih.stok}, dibutuhkan: ${jumlahUnit}` })
      return
    }
    if (!isValid) {
      push({ tipe: 'error', judul: 'Data tidak valid', pesan: 'Total berat kemasan + waste melebihi total berat curah.' })
      return
    }
    const validDistribusi = distribusi.filter((d) => d.qty > 0)
    eksekusiPengemasan({
      resepId,
      jumlahUnitCurah: jumlahUnit,
      distribusi: validDistribusi,
      waste,
      userId: currentUser?.id ?? 'USR-01',
    })
    const totalKemasan = validDistribusi.reduce((a, d) => a + d.qty, 0)
    push({
      tipe: 'sukses',
      judul: 'Pengemasan berhasil',
      pesan: `${jumlahUnit} ${curahTerpilih.satuan} menjadi ${totalKemasan} kemasan${waste > 0 ? `, waste: ${waste} ${resepTerpilih.satuanDasar}` : ''}`,
    })
    setModal(false)
  }

  return (
    <>
      <PageHeader
        judul="Pengemasan"
        deskripsi="Eksekusi pengemasan curah ke kemasan eceran berdasarkan resep konversi."
        aksi={<Button onClick={bukaModal}>Kemas Sekarang</Button>}
      />

      <Card
        title="Riwayat Pengemasan"
        subtitle="Catatan pengemasan produk curah yang sudah dieksekusi."
      >
        <div className="mb-3 max-w-sm">
          <Input placeholder="Cari riwayat..." value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <DataTable
          data={rows}
          kolom={[
            {
              key: 'waktu',
              header: 'Waktu',
              render: (p) => <span className="text-xs text-slate-500">{tanggalJam(p.waktu)}</span>,
            },
            {
              key: 'resep',
              header: 'Resep',
              render: (p) => <span className="font-medium text-slate-700">{p.resepNama}</span>,
            },
            {
              key: 'curah',
              header: 'Curah',
              render: (p) => (
                <div>
                  <p className="text-sm">{p.namaProdukCurah}</p>
                  <p className="text-[11px] text-slate-400">
                    {p.jumlahUnitCurah} unit ({p.totalBerat} {resepKonversi.find((r) => r.id === p.resepId)?.satuanDasar ?? ''})
                  </p>
                </div>
              ),
            },
            {
              key: 'kemasan',
              header: 'Hasil Kemasan',
              render: (p) => (
                <div className="space-y-0.5">
                  {p.items.map((it, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{it.qty}×</span> {it.namaProduk}
                      <span className="text-slate-400"> (HPP {rupiah(it.hppPerKemasan)})</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'waste',
              header: 'Waste',
              align: 'right' as const,
              render: (p) =>
                p.waste > 0 ? (
                  <Badge warna="amber">{p.waste} {resepKonversi.find((r) => r.id === p.resepId)?.satuanDasar ?? ''}</Badge>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                ),
            },
            {
              key: 'berat',
              header: 'Berat',
              align: 'right' as const,
              render: (p) => (
                <span className="text-xs font-medium">{p.totalBeratKemasan} / {p.totalBerat}</span>
              ),
            },
          ]}
          kosong="Belum ada riwayat pengemasan"
        />
      </Card>

      {/* Modal Eksekusi Pengemasan */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Eksekusi Pengemasan"
        lebar="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Batal
            </Button>
            <Button onClick={eksekusi} disabled={!isValid}>
              Eksekusi Pengemasan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Pilih Resep & Unit */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Resep konversi</Label>
              <Select value={resepId} onChange={(e) => pilihResep(e.target.value)}>
                {resepKonversi.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Jumlah unit curah yang dikemas</Label>
              <Input
                type="number"
                min={1}
                value={jumlahUnit}
                onChange={(e) => setJumlahUnit(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Info Curah */}
          {curahTerpilih && resepTerpilih && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Produk curah: <span className="font-semibold">{curahTerpilih.nama}</span>
                </span>
                <span>
                  Stok tersedia: <span className="font-semibold">{curahTerpilih.stok} {curahTerpilih.satuan}</span>
                </span>
                <span>
                  Total berat:{' '}
                  <span className="font-semibold">
                    {totalBerat} {resepTerpilih.satuanDasar}
                  </span>
                </span>
                <span>
                  HPP / {resepTerpilih.satuanDasar}: <span className="font-semibold">{rupiah(hppPerSatuan)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Distribusi Kemasan */}
          {resepTerpilih && (
            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-sm font-semibold text-slate-700">Distribusi Kemasan</p>
              </div>
              <div className="space-y-2 p-3">
                {distribusi.map((d, i) => {
                  const resepItem = resepTerpilih.items.find((it) => it.produkKemasanId === d.produkKemasanId)
                  const hppKemasan = resepItem ? Math.round(hppPerSatuan * resepItem.beratPerKemasan) : 0
                  const beratItem = resepItem ? d.qty * resepItem.beratPerKemasan : 0
                  return (
                    <div key={i} className="grid grid-cols-12 items-center gap-2">
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-slate-700">{getNama(d.produkKemasanId)}</p>
                        <p className="text-[11px] text-slate-400">
                          @{resepItem?.beratPerKemasan ?? 0}
                          {resepTerpilih.satuanDasar} | HPP {rupiah(hppKemasan)}
                        </p>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min={0}
                          value={d.qty}
                          onChange={(e) => ubahQty(i, Math.max(0, Number(e.target.value)))}
                        />
                      </div>
                      <div className="col-span-4 text-right text-xs text-slate-500">
                        = {beratItem} {resepTerpilih.satuanDasar}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Waste */}
          <div className="max-w-xs">
            <Label>Waste / susut ({resepTerpilih?.satuanDasar ?? 'kg'})</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={waste}
              onChange={(e) => setWaste(Math.max(0, Number(e.target.value)))}
            />
          </div>

          {/* Ringkasan */}
          {resepTerpilih && (
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                sisaBerat < 0 ? 'bg-rose-50 text-rose-700' : sisaBerat === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <div className="space-y-0.5">
                <p>
                  Total kemasan: <span className="font-semibold">{totalBeratKemasan} {resepTerpilih.satuanDasar}</span>
                  {waste > 0 && (
                    <span>
                      {' '}+ waste: <span className="font-semibold">{waste} {resepTerpilih.satuanDasar}</span>
                    </span>
                  )}
                </p>
                <p>
                  Total curah: <span className="font-semibold">{totalBerat} {resepTerpilih.satuanDasar}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs">Sisa</p>
                <p className="text-lg font-bold">
                  {sisaBerat >= 0 ? sisaBerat.toFixed(2) : sisaBerat.toFixed(2)} {resepTerpilih.satuanDasar}
                </p>
                {sisaBerat < 0 && <p className="text-xs font-medium">Melebihi kapasitas!</p>}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
