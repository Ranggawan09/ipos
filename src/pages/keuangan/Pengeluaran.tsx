import { useMemo, useState } from 'react'
import type { Pengeluaran as TPengeluaran } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalSingkat, toDateInput } from '@/lib/format'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CurrencyInput, DataTable, FR, Input, Label, Modal, PageHeader, Select, StatCard } from '@/components/ui'

// Kategori pengeluaran operasional toko: hanya Operasional Kasir dan Lain-lain
const KATEGORI = [
  { value: 'operasional_kasir', label: 'Operasional Kasir' },
  { value: 'lainnya', label: 'Lain-lain' },
] as const

const LABEL_KATEGORI: Record<string, string> = {
  operasional_kasir: 'Operasional Kasir',
  lainnya: 'Lain-lain',
  listrik: 'Listrik & air',
  sewa: 'Sewa tempat',
  gaji: 'Gaji karyawan',
  transport: 'Transport',
}

const kosong: Omit<TPengeluaran, 'id'> = {
  kategori: 'operasional_kasir',
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

  const isOwner = currentUser?.role === 'owner'

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const rows = useMemo(() => {
    return pengeluaran
      .filter((p) => {
        // Mode Owner: Melihat seluruh transaksi & seluruh kategori pengeluaran toko
        if (isOwner) {
          return true
        }

        // Mode Admin:
        // 1. Kategori hanya operasional_kasir dan lainnya (jangan tampilkan kategori selain 2 ini)
        if (p.kategori !== 'operasional_kasir' && p.kategori !== 'lainnya') {
          return false
        }

        // 2. Hanya transaksi yang dibuat oleh kasir dan admin itu sendiri (jangan transaksi owner)
        const pembuat = userMap.get(p.userId)
        if (pembuat && pembuat.role === 'owner') {
          return false
        }

        const dibuatKasirAtauAdmin = Boolean(p.shiftId) || (pembuat ? pembuat.role === 'kasir' || pembuat.role === 'admin' : true)
        return dibuatKasirAtauAdmin
      })
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
  }, [pengeluaran, isOwner, userMap])

  const total = rows.reduce((a, p) => a + p.jumlah, 0)
  const bulanIni = rows
    .filter((p) => new Date(p.tanggal).getMonth() === new Date().getMonth())
    .reduce((a, p) => a + p.jumlah, 0)

  const perKategori = useMemo(() => {
    if (!isOwner) {
      // Role Admin: hanya 2 kategori (Operasional Kasir & Lain-lain)
      return [
        {
          nama: 'Operasional Kasir',
          nilai: rows.filter((p) => p.kategori === 'operasional_kasir').reduce((a, p) => a + p.jumlah, 0),
        },
        {
          nama: 'Lain-lain',
          nilai: rows.filter((p) => p.kategori === 'lainnya').reduce((a, p) => a + p.jumlah, 0),
        },
      ].filter((x) => x.nilai > 0)
    }

    // Role Owner: Kelompokkan semua kategori yang tercatat (listrik, sewa, gaji, transport, operasional_kasir, lainnya)
    const semuaKategoriTercatat = Array.from(new Set(rows.map((r) => r.kategori)))
    const urutanPrioritas = ['operasional_kasir', 'lainnya', 'gaji', 'listrik', 'sewa', 'transport']
    const urutanKategori = [
      ...urutanPrioritas.filter((k) => semuaKategoriTercatat.includes(k as any)),
      ...semuaKategoriTercatat.filter((k) => !urutanPrioritas.includes(k)),
    ]

    return urutanKategori
      .map((kVal) => ({
        nama: LABEL_KATEGORI[kVal] ?? kVal,
        nilai: rows.filter((p) => p.kategori === kVal).reduce((a, p) => a + p.jumlah, 0),
      }))
      .filter((x) => x.nilai > 0)
  }, [rows, isOwner])

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

  const opsiKategoriForm = useMemo(() => {
    if (isOwner && form.kategori) {
      const ada = KATEGORI.some((k) => k.value === form.kategori)
      if (!ada) {
        return [...KATEGORI, { value: form.kategori, label: LABEL_KATEGORI[form.kategori] ?? form.kategori }]
      }
    }
    return KATEGORI
  }, [isOwner, form.kategori])

  return (
    <>
      <PageHeader
        judul="Pengeluaran Operasional"
        deskripsi={isOwner ? "Pantauan biaya operasional toko (mode baca owner)." : "Pencatatan biaya operasional toko: operasional kasir dan lain-lain."}
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
                <YAxis type="category" dataKey="nama" width={110} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
              { key: 'kategori', header: 'Kategori', render: (p) => {
                const warna: 'blue' | 'amber' | 'green' | 'violet' | 'red' =
                  p.kategori === 'operasional_kasir' ? 'blue' :
                  p.kategori === 'gaji' ? 'green' :
                  p.kategori === 'sewa' ? 'red' :
                  p.kategori === 'listrik' ? 'violet' : 'amber'
                return (
                  <Badge warna={warna}>
                    {LABEL_KATEGORI[p.kategori] ?? p.kategori}
                  </Badge>
                )
              } },
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
              <Select
                value={form.kategori}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, kategori: e.target.value as TPengeluaran['kategori'] })}
              >
                {opsiKategoriForm.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.tanggal}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Keterangan</Label>
            <Input
              value={form.keterangan}
              disabled={isOwner}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Contoh: beli kantong kresek, sabun cuci kios..."
            />
          </div>
          <div>
            <Label>Jumlah (Rp)</Label>
            <CurrencyInput
              value={form.jumlah}
              disabled={isOwner}
              onChange={(val) => setForm({ ...form, jumlah: val })}
            />
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
