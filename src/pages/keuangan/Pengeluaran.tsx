import { useMemo, useState } from 'react'
import type { Pengeluaran as TPengeluaran } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalSingkat, toDateInput } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select, StatCard } from '@/components/ui'

const KATEGORI = [
  { value: 'listrik', label: 'Listrik & air' },
  { value: 'sewa', label: 'Sewa tempat' },
  { value: 'gaji', label: 'Gaji karyawan' },
  { value: 'transport', label: 'Transport' },
  { value: 'lainnya', label: 'Lain-lain' },
] as const

const kosong: Omit<TPengeluaran, 'id'> = {
  kategori: 'lainnya',
  keterangan: '',
  jumlah: 0,
  tanggal: toDateInput(new Date().toISOString()),
  userId: '',
}

export function Pengeluaran() {
  const { pengeluaran, users, simpanPengeluaran, hapusPengeluaran } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TPengeluaran | null>(null)
  const [form, setForm] = useState(kosong)
  const [hapus, setHapus] = useState<TPengeluaran | null>(null)

  const rows = useMemo(() => [...pengeluaran].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)), [pengeluaran])

  const total = rows.reduce((a, p) => a + p.jumlah, 0)
  const bulanIni = rows
    .filter((p) => new Date(p.tanggal).getMonth() === new Date().getMonth())
    .reduce((a, p) => a + p.jumlah, 0)

  const perKategori = KATEGORI.map((k) => ({
    nama: k.label,
    nilai: rows.filter((p) => p.kategori === k.value).reduce((a, p) => a + p.jumlah, 0),
  })).filter((x) => x.nilai > 0)

  const simpan = () => {
    if (!form.keterangan.trim() || form.jumlah <= 0) {
      push({ tipe: 'error', judul: 'Lengkapi keterangan dan jumlah pengeluaran' })
      return
    }
    simpanPengeluaran({
      ...form,
      id: edit?.id,
      tanggal: new Date(form.tanggal).toISOString(),
      userId: currentUser?.id ?? 'USR-01',
    })
    push({ tipe: 'sukses', judul: edit ? 'Pengeluaran diperbarui' : 'Pengeluaran dicatat' })
    setModal(false)
  }

  const namaUser = (id: string) => users.find((u) => u.id === id)?.nama ?? id

  const isOwner = currentUser?.role === 'owner'

  return (
    <>
      <PageHeader
        judul="Pengeluaran Operasional"
        deskripsi={isOwner ? "Pantauan biaya operasional non-barang toko (mode baca owner)." : "Pencatatan biaya operasional non-barang: listrik, sewa, gaji, dan lain-lain."}
        aksi={
          <>
            <FR kode="FR-FIN-03" />
            {!isOwner && (
              <Button onClick={() => { setEdit(null); setForm({ ...kosong, tanggal: toDateInput(new Date().toISOString()) }); setModal(true) }}>
                Catat Pengeluaran
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Pengeluaran" value={rupiah(total)} tone="rose" />
        <StatCard label="Bulan Ini" value={rupiah(bulanIni)} tone="amber" />
        <StatCard label="Jumlah Catatan" value={rows.length} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Pengeluaran per Kategori" className="lg:col-span-1">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perKategori} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nama" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => rupiah(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="nilai" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Riwayat Pengeluaran" className="lg:col-span-2">
          <DataTable
            data={rows}
            kolom={[
              { key: 'tanggal', header: 'Tanggal', render: (p) => <span className="text-xs text-slate-500">{tanggalSingkat(p.tanggal)}</span> },
              { key: 'kategori', header: 'Kategori', render: (p) => (
                <Badge warna={p.kategori === 'sewa' ? 'violet' : p.kategori === 'gaji' ? 'blue' : 'amber'}>
                  {KATEGORI.find((k) => k.value === p.kategori)?.label}
                </Badge>
              ) },
              { key: 'keterangan', header: 'Keterangan', className: 'text-slate-600' },
              { key: 'userId', header: 'Dicatat oleh', render: (p) => <span className="text-xs text-slate-500">{namaUser(p.userId)}</span> },
              { key: 'jumlah', header: 'Jumlah', align: 'right', render: (p) => <span className="font-medium text-rose-600">{rupiah(p.jumlah)}</span> },
              { key: 'aksi', header: '', align: 'right', render: (p) => (
                <div className="flex justify-end gap-1">
                  {isOwner ? (
                    <Button size="sm" variant="ghost" onClick={() => { setEdit(p); setForm({ ...p, tanggal: toDateInput(p.tanggal) }); setModal(true) }}>Lihat</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEdit(p); setForm({ ...p, tanggal: toDateInput(p.tanggal) }); setModal(true) }}>Ubah</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapus(p)}>Hapus</Button>
                    </>
                  )}
                </div>
              ) },
            ]}
          />
        </Card>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={isOwner ? 'Detail Pengeluaran (Read-Only)' : edit ? 'Ubah Pengeluaran' : 'Catat Pengeluaran'}
        footer={
          isOwner ? (
            <Button variant="secondary" onClick={() => setModal(false)}>Tutup</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
              <Button onClick={simpan}>Simpan</Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Kategori</Label>
              <Select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value as TPengeluaran['kategori'] })}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Keterangan</Label>
            <Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Contoh: token listrik kios" />
          </div>
          <div>
            <Label>Jumlah (Rp)</Label>
            <Input type="number" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!hapus}
        onClose={() => setHapus(null)}
        title="Hapus Pengeluaran"
        footer={<><Button variant="secondary" onClick={() => setHapus(null)}>Batal</Button><Button variant="danger" onClick={() => { if (hapus) { hapusPengeluaran(hapus.id); push({ tipe: 'sukses', judul: 'Pengeluaran dihapus' }) } setHapus(null) }}>Hapus</Button></>}
      >
        <p className="text-sm text-slate-600">Hapus catatan <span className="font-semibold">{hapus?.keterangan}</span> sebesar {rupiah(hapus?.jumlah ?? 0)}?</p>
      </Modal>
    </>
  )
}
