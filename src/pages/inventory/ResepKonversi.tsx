import { useMemo, useState } from 'react'
import type { ResepKonversi as TResep } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { Badge, Button, Card, DataTable, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

type ItemForm = { produkKemasanId: string; beratPerKemasan: number }

const emptyForm = {
  nama: '',
  produkCurahId: '',
  beratPerUnit: 50,
  satuanDasar: 'kg',
  items: [{ produkKemasanId: '', beratPerKemasan: 1 }] as ItemForm[],
  biayaKemasanPerUnit: 0,
}

export function ResepKonversi() {
  const { produk, resepKonversi, simpanResep, hapusResep } = useDataStore()
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TResep | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [hapusTarget, setHapusTarget] = useState<TResep | null>(null)

  const produkAktif = produk.filter((p) => p.aktif)
  const getNama = (id: string) => produk.find((p) => p.id === id)?.nama ?? '-'

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return resepKonversi.filter((r) => {
      const curahNama = getNama(r.produkCurahId).toLowerCase()
      return !q || r.nama.toLowerCase().includes(q) || curahNama.includes(q)
    })
  }, [resepKonversi, cari, produk])

  const bukaTambah = () => {
    setEdit(null)
    setForm({
      ...emptyForm,
      produkCurahId: produkAktif[0]?.id ?? '',
      items: [{ produkKemasanId: produkAktif[0]?.id ?? '', beratPerKemasan: 1 }],
    })
    setModal(true)
  }

  const bukaEdit = (r: TResep) => {
    setEdit(r)
    setForm({
      nama: r.nama,
      produkCurahId: r.produkCurahId,
      beratPerUnit: r.beratPerUnit,
      satuanDasar: r.satuanDasar,
      items: r.items.map((it) => ({ produkKemasanId: it.produkKemasanId, beratPerKemasan: it.beratPerKemasan })),
      biayaKemasanPerUnit: r.biayaKemasanPerUnit,
    })
    setModal(true)
  }

  const tambahItem = () => {
    setForm({ ...form, items: [...form.items, { produkKemasanId: produkAktif[0]?.id ?? '', beratPerKemasan: 1 }] })
  }

  const ubahItem = (i: number, patch: Partial<ItemForm>) => {
    setForm({
      ...form,
      items: form.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    })
  }

  const hapusItem = (i: number) => {
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })
  }

  const simpan = () => {
    if (!form.nama.trim()) {
      push({ tipe: 'error', judul: 'Nama resep wajib diisi' })
      return
    }
    if (!form.produkCurahId) {
      push({ tipe: 'error', judul: 'Pilih produk curah' })
      return
    }
    if (form.items.length === 0) {
      push({ tipe: 'error', judul: 'Tambahkan minimal 1 varian kemasan' })
      return
    }
    simpanResep(
      edit
        ? {
            id: edit.id,
            nama: form.nama,
            produkCurahId: form.produkCurahId,
            beratPerUnit: form.beratPerUnit,
            satuanDasar: form.satuanDasar,
            items: form.items,
            biayaKemasanPerUnit: form.biayaKemasanPerUnit,
          }
        : {
            nama: form.nama,
            produkCurahId: form.produkCurahId,
            beratPerUnit: form.beratPerUnit,
            satuanDasar: form.satuanDasar,
            items: form.items,
            biayaKemasanPerUnit: form.biayaKemasanPerUnit,
          },
    )
    push({ tipe: 'sukses', judul: edit ? 'Resep diperbarui' : 'Resep ditambahkan', pesan: form.nama })
    setModal(false)
  }

  const konfirmasiHapus = () => {
    if (!hapusTarget) return
    hapusResep(hapusTarget.id)
    push({ tipe: 'sukses', judul: 'Resep dihapus', pesan: hapusTarget.nama })
    setHapusTarget(null)
  }

  const curahTerpilih = produk.find((p) => p.id === form.produkCurahId)

  return (
    <>
      <PageHeader
        judul="Resep Konversi"
        deskripsi="Atur resep pengemasan dari produk curah ke varian kemasan eceran."
        aksi={<Button onClick={bukaTambah}>Tambah Resep</Button>}
      />

      <Card
        title="Daftar Resep"
        subtitle="Setiap resep menghubungkan 1 produk curah dengan beberapa varian kemasan."
      >
        <div className="mb-3 max-w-sm">
          <Input placeholder="Cari resep..." value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <DataTable
          data={rows}
          kolom={[
            {
              key: 'nama',
              header: 'Nama Resep',
              render: (r) => <span className="font-medium text-slate-700">{r.nama}</span>,
            },
            {
              key: 'curah',
              header: 'Produk Curah',
              render: (r) => (
                <div>
                  <p className="text-sm">{getNama(r.produkCurahId)}</p>
                  <p className="text-[11px] text-slate-400">
                    {r.beratPerUnit} {r.satuanDasar} / unit
                  </p>
                </div>
              ),
            },
            {
              key: 'varian',
              header: 'Varian Kemasan',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.items.map((it, i) => (
                    <Badge key={i} warna="blue">
                      {getNama(it.produkKemasanId)} ({it.beratPerKemasan}
                      {r.satuanDasar})
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              key: 'aksi',
              header: '',
              align: 'right' as const,
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => bukaEdit(r)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapusTarget(r)}>
                    Hapus
                  </Button>
                </div>
              ),
            },
          ]}
          kosong="Belum ada resep konversi"
        />
      </Card>

      {/* Modal Tambah / Edit */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? 'Ubah Resep Konversi' : 'Tambah Resep Konversi'}
        lebar="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Batal
            </Button>
            <Button onClick={simpan}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>
              Nama resep <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Repack Gula Pasir Curah"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Produk curah</Label>
              <Select
                value={form.produkCurahId}
                onChange={(e) => setForm({ ...form, produkCurahId: e.target.value })}
              >
                {produkAktif.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Berat per unit</Label>
              <Input
                type="number"
                min={0.1}
                step="any"
                value={form.beratPerUnit}
                onChange={(e) => setForm({ ...form, beratPerUnit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Satuan dasar</Label>
              <Select value={form.satuanDasar} onChange={(e) => setForm({ ...form, satuanDasar: e.target.value })}>
                <option value="kg">kg</option>
                <option value="gram">gram</option>
                <option value="liter">liter</option>
                <option value="ml">ml</option>
              </Select>
            </div>
          </div>

          {curahTerpilih && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Stok curah saat ini: <span className="font-semibold">{curahTerpilih.stok} {curahTerpilih.satuan}</span>
              {' | '}Harga beli: <span className="font-semibold">Rp {curahTerpilih.hargaBeli.toLocaleString('id-ID')}</span>
              {' | '}HPP per {form.satuanDasar}:{' '}
              <span className="font-semibold">
                Rp {form.beratPerUnit > 0 ? Math.round(curahTerpilih.hargaBeli / form.beratPerUnit).toLocaleString('id-ID') : 0}
              </span>
            </div>
          )}

          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">Varian Kemasan</p>
              <Button size="sm" variant="secondary" onClick={tambahItem}>
                Tambah varian
              </Button>
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto p-3">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-7">
                    <Label>Produk kemasan</Label>
                    <Select
                      value={it.produkKemasanId}
                      onChange={(e) => ubahItem(i, { produkKemasanId: e.target.value })}
                    >
                      {produkAktif.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.sku})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label>Berat ({form.satuanDasar})</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="any"
                      value={it.beratPerKemasan}
                      onChange={(e) => ubahItem(i, { beratPerKemasan: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1 pb-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => hapusItem(i)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Biaya kemasan per eksekusi (opsional)</Label>
            <Input
              type="number"
              value={form.biayaKemasanPerUnit}
              onChange={(e) => setForm({ ...form, biayaKemasanPerUnit: Number(e.target.value) })}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        title="Hapus Resep"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHapusTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={konfirmasiHapus}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Hapus resep <span className="font-semibold">{hapusTarget?.nama}</span>? Riwayat pengemasan yang sudah ada
          tidak akan terhapus.
        </p>
      </Modal>
    </>
  )
}
