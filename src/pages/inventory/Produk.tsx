import { useMemo, useState } from 'react'
import type { Produk as TProduk, VarianBobot } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah } from '@/lib/format'
import { Badge, Button, Card, CurrencyInput, DataTable, FR, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

const kosong: Omit<TProduk, 'id'> = {
  sku: '', barcode: '', nama: '', kategoriId: '', satuan: 'pcs',
  hargaBeli: 0, hargaJual: 0, stok: 0, stokMinimum: 5, aktif: true,
}

export function Produk() {
  const { produk, kategori, supplier, simpanProduk, hapusProduk, resepKonversi } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [filterStok, setFilterStok] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TProduk | null>(null)
  const [form, setForm] = useState<Omit<TProduk, 'id'>>(kosong)
  const [marginInput, setMarginInput] = useState<string>('')
  const [hapusTarget, setHapusTarget] = useState<TProduk | null>(null)

  const katNama = (id: string) => kategori.find((k) => k.id === id)?.nama ?? '-'

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return produk.filter((p) => {
      const cocok =
        !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)
      const kat = !filterKat || p.kategoriId === filterKat
      const stok =
        filterStok === 'kritis' ? p.stok <= p.stokMinimum :
        filterStok === 'habis' ? p.stok === 0 :
        filterStok === 'aman' ? p.stok > p.stokMinimum : true
      return cocok && kat && stok
    })
  }, [produk, cari, filterKat, filterStok])

  const totalNilai = rows.reduce((a, p) => a + p.stok * p.hargaBeli, 0)

  const bukaTambah = () => {
    setEdit(null)
    setMarginInput('20')
    setForm({ ...kosong, kategoriId: kategori[0]?.id ?? '', sku: `SKU${String(produk.length + 1).padStart(4, '0')}`, barcode: String(8990000000 + produk.length + 1) })
    setModal(true)
  }

  const bukaEdit = (p: TProduk) => {
    setEdit(p)
    setForm({ ...p })
    const pct = p.hargaBeli > 0 ? ((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100 : 0
    const rounded = Math.round(pct * 10) / 10
    setMarginInput(p.hargaBeli > 0 ? String(rounded) : '')
    setModal(true)
  }

  const handleMarginChange = (val: string) => {
    setMarginInput(val)
    const pct = parseFloat(val)
    if (!isNaN(pct) && form.hargaBeli > 0) {
      const newJual = Math.round(form.hargaBeli * (1 + pct / 100))
      setForm((prev) => ({ ...prev, hargaJual: Math.max(0, newJual) }))
    }
  }

  const handleHargaBeliChange = (beliVal: number) => {
    const beli = Math.max(0, beliVal)
    const pct = parseFloat(marginInput)
    if (!isNaN(pct) && marginInput !== '' && beli > 0) {
      const newJual = Math.round(beli * (1 + pct / 100))
      setForm((prev) => ({ ...prev, hargaBeli: beli, hargaJual: Math.max(0, newJual) }))
    } else {
      setForm((prev) => ({ ...prev, hargaBeli: beli }))
    }
  }

  const handleHargaJualChange = (jualVal: number) => {
    const jual = Math.max(0, jualVal)
    setForm((prev) => ({ ...prev, hargaJual: jual }))
    if (form.hargaBeli > 0) {
      const pct = ((jual - form.hargaBeli) / form.hargaBeli) * 100
      const rounded = Math.round(pct * 10) / 10
      setMarginInput(String(rounded))
    }
  }

  const toggleVarian = (checked: boolean) => {
    if (checked) {
      const defaultSatuan = form.satuan === 'pcs' ? 'kg' : form.satuan
      setForm({
        ...form,
        satuan: defaultSatuan,
        varian: [
          { id: `VAR-${Date.now()}-1`, nama: '5 kg', bobot: 5, hargaJual: Math.round(form.hargaJual * 5) || 70000 },
          { id: `VAR-${Date.now()}-2`, nama: '2 kg', bobot: 2, hargaJual: Math.round(form.hargaJual * 2) || 30000 },
          { id: `VAR-${Date.now()}-3`, nama: '1 kg', bobot: 1, hargaJual: form.hargaJual || 15000 },
        ],
      })
    } else {
      setForm({ ...form, varian: undefined })
    }
  }

  const tambahVarian = () => {
    const list = form.varian ? [...form.varian] : []
    list.push({
      id: `VAR-${Date.now()}-${list.length + 1}`,
      nama: '',
      bobot: 1,
      hargaJual: form.hargaJual || 0,
    })
    setForm({ ...form, varian: list })
  }

  const ubahVarian = (index: number, field: keyof VarianBobot, val: any) => {
    if (!form.varian) return
    const list = form.varian.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    setForm({ ...form, varian: list })
  }

  const hapusVarian = (index: number) => {
    if (!form.varian) return
    const list = form.varian.filter((_, i) => i !== index)
    setForm({ ...form, varian: list.length > 0 ? list : undefined })
  }

  const simpan = () => {
    if (!form.nama.trim() || !form.sku.trim()) {
      push({ tipe: 'error', judul: 'Data belum lengkap', pesan: 'Nama dan SKU wajib diisi.' })
      return
    }
    if (form.varian && form.varian.length > 0) {
      const invalid = form.varian.some((v) => !v.nama.trim() || v.bobot <= 0 || v.hargaJual <= 0)
      if (invalid) {
        push({
          tipe: 'error',
          judul: 'Data varian belum lengkap',
          pesan: 'Nama, bobot, dan harga jual setiap varian harus diisi dengan benar.',
        })
        return
      }
    }
    simpanProduk(edit ? { ...form, id: edit.id } : form)
    push({ tipe: 'sukses', judul: edit ? 'Produk diperbarui' : 'Produk ditambahkan', pesan: form.nama })
    setModal(false)
  }

  const konfirmasiHapus = () => {
    if (!hapusTarget) return
    hapusProduk(hapusTarget.id)
    push({ tipe: 'sukses', judul: 'Produk dihapus', pesan: hapusTarget.nama })
    setHapusTarget(null)
  }

  const isOwner = currentUser?.role === 'owner'

  return (
    <>
      <PageHeader
        judul="Data Produk"
        deskripsi={isOwner ? "Pantauan stok dan harga produk toko (mode baca owner)." : "Kelola seluruh item barang toko beserta harga dan batas stok minimum."}
        aksi={
          <>
            <Button variant="secondary" onClick={() => setCari('')}>
              {rows.length} dari {produk.length} produk
            </Button>
            {!isOwner && <Button onClick={bukaTambah}>Tambah Produk</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Cari produk</Label>
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Nama, SKU, atau barcode..."
            />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status stok</Label>
            <Select value={filterStok} onChange={(e) => setFilterStok(e.target.value)}>
              <option value="">Semua</option>
              <option value="kritis">Di bawah minimum</option>
              <option value="habis">Stok habis</option>
              <option value="aman">Stok aman</option>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Nilai stok (harga beli) untuk hasil filter: <span className="font-semibold text-slate-700">{rupiah(totalNilai)}</span>
          <FR kode="FR-INV-01" />
          <FR kode="FR-INV-02" />
          <FR kode="FR-INV-06" />
        </p>
      </Card>

      <Card>
        <DataTable
          data={rows}
          kolom={[
            { key: 'sku', header: 'SKU / Barcode', render: (p) => (
              <div>
                <p className="font-mono text-xs text-slate-600">{p.sku}</p>
                <p className="font-mono text-[11px] text-slate-400">{p.barcode}</p>
              </div>
            ) },
            { key: 'nama', header: 'Nama Produk', render: (p) => {
              const isCurah = resepKonversi.some((r) => r.produkCurahId === p.id)
              const isKemasan = resepKonversi.some((r) => r.items.some((it) => it.produkKemasanId === p.id))
              const supp = supplier.find((s) => s.id === p.supplierId)
              return (
                <div>
                  <p className="font-medium text-slate-700">
                    {p.nama}
                    {isCurah && <Badge warna="blue" className="ml-1.5 text-[10px]">Curah</Badge>}
                    {isKemasan && <Badge warna="purple" className="ml-1.5 text-[10px]">Kemasan</Badge>}
                    {p.varian && p.varian.length > 0 && (
                      <Badge warna="purple" className="ml-1.5 text-[10px]">
                        Varian Bobot ({p.varian.map((v) => v.nama).join(', ')})
                      </Badge>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                    <span>{katNama(p.kategoriId)} | {p.satuan}</span>
                    {supp ? (
                      <span className="inline-flex items-center text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                        {supp.nama}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                        Supplier: -
                      </span>
                    )}
                  </div>
                </div>
              )
            } },
            { key: 'hargaBeli', header: 'Harga Beli', align: 'right', render: (p) => rupiah(p.hargaBeli) },
            { key: 'hargaJual', header: 'Harga Jual', align: 'right', render: (p) => (
              <div>
                <p className="font-medium">{rupiah(p.hargaJual)}</p>
                <p className="text-[11px] text-emerald-600">
                  margin {p.hargaBeli ? Math.round(((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100) : 0}%
                </p>
              </div>
            ) },
            { key: 'stok', header: 'Stok', align: 'right', render: (p) => (
              <div>
                <span className={`font-semibold ${p.stok === 0 ? 'text-rose-600' : p.stok <= p.stokMinimum ? 'text-amber-600' : 'text-slate-700'}`}>
                  {angka(p.stok)}
                </span>
                <p className="text-[11px] text-slate-400">min {p.stokMinimum}</p>
              </div>
            ) },
            { key: 'status', header: 'Status', render: (p) =>
              p.stok === 0 ? <Badge warna="red">Habis</Badge>
              : p.stok <= p.stokMinimum ? <Badge warna="amber">Stok kritis</Badge>
              : <Badge warna="green">Aman</Badge> },
            { key: 'aksi', header: '', align: 'right', render: (p) => (
              <div className="flex justify-end gap-1">
                {isOwner ? (
                  <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Lihat</Button>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Ubah</Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapusTarget(p)}>Hapus</Button>
                  </>
                )}
              </div>
            ) },
          ]}
          kosong="Produk tidak ditemukan"
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={isOwner ? 'Detail Produk (Read-Only)' : edit ? 'Ubah Produk' : 'Tambah Produk'}
        lebar="max-w-2xl"
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nama produk <span className="text-rose-500">*</span></Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <Label>SKU <span className="text-rose-500">*</span></Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={form.kategoriId} onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </Select>
          </div>
          <div>
            <Label>Satuan</Label>
            <Input value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Supplier Pemasok</Label>
            <Select
              value={form.supplierId || ''}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value || undefined })}
            >
              <option value="">-- Belum Ditentukan (Pilih Supplier) --</option>
              {supplier.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.kontak} - {s.telepon})
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-slate-400">
              Digunakan untuk pengelompokan pesanan restock (Purchase Order) otomatis saat stok menipis.
            </p>
          </div>
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Penetapan Harga & Margin</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Harga Beli (Modal)</Label>
                <CurrencyInput
                  value={form.hargaBeli}
                  onChange={handleHargaBeliChange}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Margin (%)</Label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.1"
                    value={marginInput}
                    onChange={(e) => handleMarginChange(e.target.value)}
                    placeholder="0"
                    className="pr-7 font-semibold text-emerald-600"
                  />
                  <span className="pointer-events-none absolute right-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
              <div>
                <Label>Harga Jual</Label>
                <CurrencyInput
                  value={form.hargaJual}
                  onChange={handleHargaJualChange}
                  placeholder="0"
                  className="font-semibold text-slate-800"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500 pt-1.5 border-t border-slate-200/60">
              <span>
                Laba kotor per unit: <span className="font-semibold text-emerald-700">{rupiah(form.hargaJual - form.hargaBeli)}</span>
                <span className="ml-1 text-[11px] text-slate-400">
                  ({form.hargaBeli > 0 ? (((form.hargaJual - form.hargaBeli) / form.hargaBeli) * 100).toFixed(1) : '0'}%)
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                Harga jual dihitung otomatis dari harga beli + margin %.
              </span>
            </div>
          </div>
          <div>
            <Label>Stok</Label>
            <Input
              type="number"
              value={form.stok}
              onChange={(e) => setForm({ ...form, stok: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Stok minimum</Label>
            <Input
              type="number"
              value={form.stokMinimum}
              onChange={(e) => setForm({ ...form, stokMinimum: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
              />
              Produk aktif dijual
            </label>
          </div>

          {/* Pengaturan Varian Bobot (Shared Pool) */}
          <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(form.varian && form.varian.length > 0)}
                    onChange={(e) => toggleVarian(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Produk Memiliki Varian Ukuran / Bobot (Dynamic Shared Pool)</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Cocok untuk barang curah/karungan seperti Beras, Gula, atau Minyak yang dijual dalam kemasan 5kg, 2kg, 1kg tanpa memecah SKU.
                </p>
              </div>
              {form.varian && form.varian.length > 0 && (
                <Button size="sm" variant="secondary" onClick={tambahVarian}>
                  + Tambah Varian
                </Button>
              )}
            </div>

            {form.varian && form.varian.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-blue-100">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-600 px-1">
                  <span className="col-span-4">Nama Varian (Label)</span>
                  <span className="col-span-3">Bobot ({form.satuan || 'kg'})</span>
                  <span className="col-span-4">Harga Jual (Rp)</span>
                  <span className="col-span-1 text-center">Hapus</span>
                </div>

                {form.varian.map((v, idx) => (
                  <div key={v.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="col-span-4">
                      <Input
                        value={v.nama}
                        onChange={(e) => ubahVarian(idx, 'nama', e.target.value)}
                        placeholder="contoh: 5 kg"
                        className="text-xs py-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={v.bobot || ''}
                        onChange={(e) => ubahVarian(idx, 'bobot', Number(e.target.value))}
                        placeholder="1"
                        className="text-xs py-1 font-mono"
                      />
                    </div>
                    <div className="col-span-4">
                      <CurrencyInput
                        sizeVariant="sm"
                        value={v.hargaJual}
                        onChange={(val) => ubahVarian(idx, 'hargaJual', val)}
                        placeholder="0"
                        className="font-mono font-semibold text-emerald-600"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => hapusVarian(idx)}
                        className="h-6 w-6 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center font-bold text-sm"
                        title="Hapus varian"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-[11px] text-slate-500 italic mt-1">
                  * Stok induk di atas ({form.stok} {form.satuan}) akan menjadi kuota bersama. Saat varian 5 kg terjual 1 unit, stok induk otomatis berkurang 5 {form.satuan}.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        title="Hapus Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHapusTarget(null)}>Batal</Button>
            <Button variant="danger" onClick={konfirmasiHapus}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Hapus <span className="font-semibold">{hapusTarget?.nama}</span>? Tindakan ini tidak dapat dibatalkan
          dan akan dicatat sebagai perubahan data produk.
        </p>
        <p className="mt-2 text-xs text-slate-400">Operator: {currentUser?.nama}</p>
      </Modal>
    </>
  )
}
