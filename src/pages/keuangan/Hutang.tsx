import { useMemo, useState } from 'react'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggal, tanggalSingkat } from '@/lib/format'
import { Badge, Button, Card, DataTable, FR, Modal, PageHeader, Select, StatCard } from '@/components/ui'

export function HutangSupplier() {
  const { hutang, supplier, lunasiHutang } = useDataStore()
  const push = useToast((s) => s.push)
  const [filter, setFilter] = useState('')
  const [target, setTarget] = useState<string | null>(null)

  const namaSupplier = (id: string) => supplier.find((s) => s.id === id)?.nama ?? id
  const hariIni = new Date().getTime()

  const rows = useMemo(
    () =>
      hutang
        .filter((h) => !filter || h.status === filter)
        .sort((a, b) => (a.status === b.status ? (a.jatuhTempo < b.jatuhTempo ? -1 : 1) : a.status === 'belum_lunas' ? -1 : 1)),
    [hutang, filter],
  )

  const belumLunas = hutang.filter((h) => h.status === 'belum_lunas')
  const totalHutang = belumLunas.reduce((a, h) => a + h.sisa, 0)
  const jatuhTempo = belumLunas.filter((h) => new Date(h.jatuhTempo).getTime() < hariIni)

  const konfirmasi = () => {
    if (!target) return
    const h = hutang.find((x) => x.id === target)
    lunasiHutang(target)
    push({ tipe: 'sukses', judul: 'Hutang ditandai lunas', pesan: h ? `${namaSupplier(h.supplierId)} (${h.nomorFaktur})` : undefined })
    setTarget(null)
  }

  return (
    <>
      <PageHeader
        judul="Hutang Supplier"
        deskripsi="Pencatatan dan pemantauan kewajiban pembayaran atas pembelian barang secara kredit."
        aksi={<FR kode="FR-FIN-07" />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Hutang Aktif" value={rupiah(totalHutang)} hint={`${belumLunas.length} faktur`} tone="rose" />
        <StatCard label="Jatuh Tempo" value={jatuhTempo.length} hint="Faktur melewati jatuh tempo" tone="amber" />
        <StatCard label="Supplier Terdampak" value={new Set(belumLunas.map((h) => h.supplierId)).size} tone="brand" />
      </div>

      <Card
        title="Daftar Faktur Hutang"
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="">Semua status</option>
            <option value="belum_lunas">Belum lunas</option>
            <option value="lunas">Lunas</option>
          </Select>
        }
      >
        <DataTable
          data={rows}
          kolom={[
            { key: 'faktur', header: 'No. Faktur', render: (h) => <span className="font-mono text-xs text-slate-700">{h.nomorFaktur}</span> },
            { key: 'supplier', header: 'Supplier', render: (h) => <span className="font-medium text-slate-700">{namaSupplier(h.supplierId)}</span> },
            { key: 'tanggal', header: 'Tanggal', render: (h) => <span className="text-xs text-slate-500">{tanggalSingkat(h.tanggal)}</span> },
            { key: 'jatuhTempo', header: 'Jatuh Tempo', render: (h) => {
              const lewat = h.status === 'belum_lunas' && new Date(h.jatuhTempo).getTime() < hariIni
              return (
                <div>
                  <p className="text-xs text-slate-600">{tanggalSingkat(h.jatuhTempo)}</p>
                  {lewat && <Badge warna="red">Terlambat</Badge>}
                </div>
              )
            } },
            { key: 'jumlah', header: 'Nilai Faktur', align: 'right', render: (h) => rupiah(h.jumlah) },
            { key: 'sisa', header: 'Sisa', align: 'right', render: (h) => (
              <span className={h.sisa > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}>{rupiah(h.sisa)}</span>
            ) },
            { key: 'status', header: 'Status', render: (h) => h.status === 'lunas' ? <Badge warna="green">Lunas</Badge> : <Badge warna="amber">Belum Lunas</Badge> },
            { key: 'aksi', header: '', align: 'right', render: (h) => (
              <Button size="sm" variant="ghost" disabled={h.status === 'lunas'} onClick={() => setTarget(h.id)}>Tandai Lunas</Button>
            ) },
          ]}
          kosong="Tidak ada data hutang"
        />
      </Card>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Konfirmasi Pelunasan"
        footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Batal</Button><Button variant="success" onClick={konfirmasi}>Ya, Tandai Lunas</Button></>}
      >
        {(() => {
          const h = hutang.find((x) => x.id === target)
          if (!h) return null
          return (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">Tandai faktur berikut sebagai lunas?</p>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between"><span className="text-slate-500">Faktur</span><span className="font-mono text-xs">{h.nomorFaktur}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span>{namaSupplier(h.supplierId)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sisa</span><span className="font-semibold text-rose-600">{rupiah(h.sisa)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Jatuh tempo</span><span>{tanggal(h.jatuhTempo)}</span></div>
              </div>
            </div>
          )
        })()}
      </Modal>
    </>
  )
}
