import { useMemo, useState } from 'react'
import type { PenerimaanBarang, Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam, toDateInput } from '@/lib/format'
import { Badge, Button, Card, CurrencyInput, DataTable, FR, Input, Label, Modal, PageHeader, Select } from '@/components/ui'
import { ModalRestockSupplier } from '@/components/ModalRestockSupplier'

type Baris = {
  produkId: string
  satuan: string
  satuanId?: string
  multiplier: number
  qty: number
  hargaBeli: number
  tglExpired?: string
}

type OpsiSatuan = {
  key: string
  label: string
  namaSatuan: string
  satuanId?: string
  multiplier: number
  hargaBeliDefault: number
}

function getOpsiSatuanProduk(p?: Produk): OpsiSatuan[] {
  if (!p) return []
  const baseUnit: OpsiSatuan = {
    key: 'base',
    label: `${p.satuan || 'pcs'} (Satuan Dasar / 1 ${p.satuan || 'pcs'})`,
    namaSatuan: p.satuan || 'pcs',
    satuanId: undefined,
    multiplier: 1,
    hargaBeliDefault: p.hargaBeli,
  }

  const tiers: OpsiSatuan[] = (p.satuanBertingkat || []).map((t) => ({
    key: t.id,
    label: `${t.namaSatuan} (${t.multiplierToBase} ${p.satuan || 'pcs'})`,
    namaSatuan: t.namaSatuan,
    satuanId: t.id,
    multiplier: t.multiplierToBase,
    hargaBeliDefault: t.hargaBeli || (p.hargaBeli * t.multiplierToBase),
  }))

  // Urutkan dari multiplier terbesar ke terkecil agar default-nya satuan terbesar (karton/pax/dst)
  return [...tiers, baseUnit].sort((a, b) => b.multiplier - a.multiplier)
}

function createDefaultBaris(p?: Produk): Baris {
  const opsi = getOpsiSatuanProduk(p)
  const terpilih = opsi[0] // Satuan terbesar
  return {
    produkId: p?.id ?? '',
    satuan: terpilih?.namaSatuan ?? (p?.satuan || 'pcs'),
    satuanId: terpilih?.satuanId,
    multiplier: terpilih?.multiplier ?? 1,
    qty: 1,
    hargaBeli: terpilih?.hargaBeliDefault ?? (p?.hargaBeli || 0),
    tglExpired: p?.tglExpired || '',
  }
}

export function BarangMasuk() {
  const { produk, supplier, kategori, penerimaan, terimaBarang, simpanProduk } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [modal, setModal] = useState(false)
  const [modalRestock, setModalRestock] = useState(false)
  const [modalTambahProduk, setModalTambahProduk] = useState(false)
  const [detailPenerimaan, setDetailPenerimaan] = useState<PenerimaanBarang | null>(null)
  const [supplierId, setSupplierId] = useState(supplier[0]?.id ?? '')
  const [metode, setMetode] = useState<'tunai' | 'kredit'>('tunai')
  const [jatuhTempo, setJatuhTempo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return toDateInput(d.toISOString())
  })
  const [baris, setBaris] = useState<Baris[]>(() => {
    if (produk.length > 0) {
      return [createDefaultBaris(produk[0])]
    }
    return [{ produkId: '', satuan: 'pcs', multiplier: 1, qty: 1, hargaBeli: 0, tglExpired: '' }]
  })

  // State untuk form tambah produk baru langsung dari penerimaan
  const [formProdukBaru, setFormProdukBaru] = useState({
    nama: '',
    kategoriId: '',
    satuan: 'pcs',
    hargaBeli: 0,
    hargaJual: 0,
    stokMinimum: 5,
    tglExpired: '',
  })
  const [cari, setCari] = useState('')

  const jumlahKritis = useMemo(() => produk.filter((p) => p.aktif && p.stok <= p.stokMinimum).length, [produk])

  const total = baris.reduce((a, b) => a + b.qty * b.hargaBeli, 0)
  const totalStokFisik = baris.reduce((a, b) => a + b.qty * b.multiplier, 0)

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return penerimaan.filter((p) => {
      const sup = supplier.find((s) => s.id === p.supplierId)?.nama ?? ''
      return !q || p.nomor.toLowerCase().includes(q) || sup.toLowerCase().includes(q)
    })
  }, [penerimaan, supplier, cari])

  const tambahBaris = () => {
    const p = produk[0]
    setBaris([...baris, createDefaultBaris(p)])
  }

  const ubahBaris = (i: number, patch: Partial<Baris>) => {
    setBaris(
      baris.map((b, idx) => {
        if (idx !== i) return b
        return { ...b, ...patch }
      }),
    )
  }

  const gantiProdukBaris = (i: number, newProdukId: string) => {
    const p = produk.find((x) => x.id === newProdukId)
    const def = createDefaultBaris(p)
    setBaris((prev) => prev.map((b, idx) => (idx === i ? def : b)))
  }

  const gantiSatuanBaris = (i: number, selectedKey: string) => {
    const b = baris[i]
    const p = produk.find((x) => x.id === b.produkId)
    const opsi = getOpsiSatuanProduk(p)
    const found = opsi.find((o) => o.key === selectedKey)
    if (!found) return

    setBaris((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              satuan: found.namaSatuan,
              satuanId: found.satuanId,
              multiplier: found.multiplier,
              hargaBeli: found.hargaBeliDefault,
            }
          : item,
      ),
    )
  }

  const reset = () => {
    setSupplierId(supplier[0]?.id ?? '')
    setMetode('tunai')
    if (produk.length > 0) {
      setBaris([createDefaultBaris(produk[0])])
    }
  }

  const simpan = () => {
    const valid = baris.filter((b) => b.produkId && b.qty > 0)
    if (valid.length === 0) {
      push({ tipe: 'error', judul: 'Belum ada item barang' })
      return
    }
    if (!supplierId) {
      push({ tipe: 'error', judul: 'Pilih supplier terlebih dahulu' })
      return
    }
    terimaBarang({
      supplierId,
      items: valid.map((b) => ({
        produkId: b.produkId,
        qty: b.qty,
        hargaBeli: b.hargaBeli,
        satuan: b.satuan,
        satuanId: b.satuanId,
        multiplier: b.multiplier,
        tglExpired: b.tglExpired || undefined,
      })),
      metode,
      jatuhTempo: metode === 'kredit' ? new Date(jatuhTempo).toISOString() : undefined,
      userId: currentUser?.id ?? 'USR-01',
    })
    push({
      tipe: 'sukses',
      judul: 'Penerimaan barang dicatat',
      pesan: `${valid.length} item, total ${rupiah(total)}${metode === 'kredit' ? ' (kredit)' : ''}`,
    })
    setModal(false)
    reset()
  }

  const handleSimpanProdukBaru = () => {
    if (!formProdukBaru.nama.trim()) {
      push({ tipe: 'error', judul: 'Nama produk wajib diisi' })
      return
    }
    const nextNum = produk.length + 1
    const sku = `SKU${String(nextNum).padStart(4, '0')}`
    const barcode = String(8990000000 + nextNum)
    const created = simpanProduk({
      sku,
      barcode,
      nama: formProdukBaru.nama.trim(),
      kategoriId: formProdukBaru.kategoriId || (kategori[0]?.id ?? 'KAT-01'),
      supplierId: supplierId || undefined,
      satuan: formProdukBaru.satuan.trim().toLowerCase() || 'pcs',
      hargaBeli: formProdukBaru.hargaBeli,
      hargaJual: formProdukBaru.hargaJual || Math.round(formProdukBaru.hargaBeli * 1.2),
      stok: 0,
      stokMinimum: formProdukBaru.stokMinimum || 5,
      aktif: true,
      tglExpired: formProdukBaru.tglExpired || undefined,
    })

    const barisBaru: Baris = {
      produkId: created.id,
      satuan: created.satuan,
      multiplier: 1,
      qty: 1,
      hargaBeli: created.hargaBeli,
      tglExpired: formProdukBaru.tglExpired || '',
    }

    if (baris.length === 1 && !baris[0].produkId) {
      setBaris([barisBaru])
    } else {
      setBaris([...baris, barisBaru])
    }

    push({
      tipe: 'sukses',
      judul: 'Produk Baru Ditambahkan',
      pesan: `${created.nama} telah ditambahkan ke daftar penerimaan barang.`,
    })
    setModalTambahProduk(false)
    setFormProdukBaru({
      nama: '',
      kategoriId: kategori[0]?.id ?? '',
      satuan: 'pcs',
      hargaBeli: 0,
      hargaJual: 0,
      stokMinimum: 5,
      tglExpired: '',
    })
  }

  return (
    <>
      <PageHeader
        judul="Barang Masuk"
        deskripsi="Catat penerimaan barang dari supplier beserta pilihan satuan beli (karton/pax/pcs) dan konversi stok otomatis."
        aksi={
          <div className="flex items-center gap-2">
            {jumlahKritis > 0 && (
              <Button
                variant="secondary"
                className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                onClick={() => setModalRestock(true)}
              >
                Rekomendasi Restock ({jumlahKritis})
              </Button>
            )}
            <Button
              onClick={() => {
                reset()
                setModal(true)
              }}
            >
              Catat Penerimaan
            </Button>
          </div>
        }
      />

      <Card
        title="Riwayat Penerimaan Barang"
        subtitle="Stok produk otomatis bertambah sesuai rasio satuan pembelian saat penerimaan disimpan."
        action={<FR kode="FR-INV-03" />}
      >
        <div className="mb-3 max-w-sm">
          <Input placeholder="Cari nomor / supplier..." value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <DataTable
          data={rows}
          kolom={[
            { key: 'nomor', header: 'No. Penerimaan', render: (p) => <span className="font-mono text-xs font-semibold text-slate-800">{p.nomor}</span> },
            { key: 'supplier', header: 'Supplier', render: (p) => supplier.find((s) => s.id === p.supplierId)?.nama ?? '-' },
            {
              key: 'items',
              header: 'Ringkasan Item',
              render: (p) => (
                <div className="max-w-xs space-y-0.5">
                  <div className="font-medium text-slate-800 text-xs">
                    {p.items.length} item
                  </div>
                  <div className="text-[11px] text-slate-500 truncate" title={p.items.map((i) => `${i.qty} ${i.satuan || 'pcs'} ${i.namaProduk}`).join(', ')}>
                    {p.items.map((i) => `${i.qty} ${i.satuan || 'pcs'} ${i.namaProduk}`).slice(0, 2).join(', ')}
                    {p.items.length > 2 ? ` (+${p.items.length - 2} lainnya)` : ''}
                  </div>
                </div>
              ),
            },
            { key: 'total', header: 'Total Nilai', align: 'right', render: (p) => <span className="font-bold text-slate-900">{rupiah(p.total)}</span> },
            { key: 'metode', header: 'Pembayaran', render: (p) => p.metode === 'kredit' ? <Badge warna="amber">Kredit</Badge> : <Badge warna="green">Tunai</Badge> },
            { key: 'waktu', header: 'Waktu', render: (p) => <span className="text-xs text-slate-500">{tanggalJam(p.waktu)}</span> },
            {
              key: 'aksi',
              header: '',
              align: 'right',
              render: (p) => (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium"
                  onClick={() => setDetailPenerimaan(p)}
                >
                  Detail
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal Input Penerimaan Barang */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Catat Penerimaan Barang (Restock)"
        lebar="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Batal
            </Button>
            <Button onClick={simpan}>Simpan Penerimaan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {supplier.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Metode pembayaran</Label>
              <Select value={metode} onChange={(e) => setMetode(e.target.value as 'tunai' | 'kredit')}>
                <option value="tunai">Tunai</option>
                <option value="kredit">Kredit (menjadi hutang)</option>
              </Select>
            </div>
            <div>
              <Label>Jatuh tempo</Label>
              <Input
                type="date"
                value={jatuhTempo}
                disabled={metode === 'tunai'}
                onChange={(e) => setJatuhTempo(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-800">Daftar Item Barang Masuk</p>
                <p className="text-xs text-slate-500">Pilih satuan pembelian, harga beli, dan tanggal expired produk</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFormProdukBaru({
                      nama: '',
                      kategoriId: kategori[0]?.id ?? '',
                      satuan: 'pcs',
                      hargaBeli: 0,
                      hargaJual: 0,
                      stokMinimum: 5,
                      tglExpired: '',
                    })
                    setModalTambahProduk(true)
                  }}
                  className="text-xs border-brand-300 text-brand-700 hover:bg-brand-50"
                >
                  + Produk Baru
                </Button>
                <Button size="sm" variant="secondary" onClick={tambahBaris}>
                  + Tambah Baris
                </Button>
              </div>
            </div>

            <div className="max-h-[380px] space-y-3 overflow-y-auto p-3">
              {baris.map((b, i) => {
                const prod = produk.find((x) => x.id === b.produkId)
                const opsiList = getOpsiSatuanProduk(prod)
                const stokMasuk = b.qty * b.multiplier
                const subtotal = b.qty * b.hargaBeli

                return (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2.5 transition hover:border-slate-300"
                  >
                    <div className="grid grid-cols-12 items-end gap-2.5">
                      {/* Produk */}
                      <div className="col-span-12 md:col-span-3">
                        <Label className="text-xs font-semibold text-slate-700">Produk</Label>
                        <Select value={b.produkId} onChange={(e) => gantiProdukBaris(i, e.target.value)}>
                          {produk.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama} ({p.sku})
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Satuan Pembelian */}
                      <div className="col-span-6 sm:col-span-3 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700">Satuan Pembelian</Label>
                          {opsiList.length > 1 && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                              Multi
                            </span>
                          )}
                        </div>
                        <Select
                          value={b.satuanId || 'base'}
                          onChange={(e) => gantiSatuanBaris(i, e.target.value)}
                          disabled={opsiList.length <= 1}
                        >
                          {opsiList.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Qty Beli */}
                      <div className="col-span-6 sm:col-span-2 md:col-span-2">
                        <Label className="text-xs font-semibold text-slate-700">Qty Beli</Label>
                        <Input
                          type="number"
                          min={1}
                          value={b.qty}
                          onChange={(e) => ubahBaris(i, { qty: Math.max(1, Number(e.target.value)) })}
                        />
                      </div>

                      {/* Harga Beli Satuan */}
                      <div className="col-span-6 sm:col-span-3 md:col-span-2">
                        <Label className="text-xs font-semibold text-slate-700">
                          Harga / {b.satuan}
                        </Label>
                        <CurrencyInput
                          sizeVariant="sm"
                          value={b.hargaBeli}
                          onChange={(val) => ubahBaris(i, { hargaBeli: val })}
                        />
                      </div>

                      {/* Tgl Expired */}
                      <div className="col-span-5 sm:col-span-3 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700">Tgl Expired</Label>
                          {b.tglExpired && (
                            <button
                              type="button"
                              onClick={() => ubahBaris(i, { tglExpired: '' })}
                              className="text-[10px] text-slate-400 hover:text-rose-500 font-normal"
                              title="Kosongkan tanggal expired"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <Input
                          type="date"
                          value={b.tglExpired || ''}
                          onChange={(e) => ubahBaris(i, { tglExpired: e.target.value })}
                          className="text-xs py-1"
                        />
                      </div>

                      {/* Hapus baris */}
                      <div className="col-span-1 flex justify-end pb-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          onClick={() => setBaris(baris.filter((_, idx) => idx !== i))}
                          disabled={baris.length === 1}
                          title="Hapus baris ini"
                        >
                          ×
                        </Button>
                      </div>
                    </div>

                    {/* Informasi Konversi Stok Fisik & Subtotal */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 px-2.5 py-1.5 text-xs border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          📦 Stok masuk: +{stokMasuk.toLocaleString('id-ID')} {prod?.satuan || 'pcs'}
                        </span>
                        {b.multiplier > 1 ? (
                          <span className="text-slate-500 font-medium">
                            (1 {b.satuan} = {b.multiplier} {prod?.satuan || 'pcs'})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            (Satuan eceran)
                          </span>
                        )}
                        {b.tglExpired ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                            📅 Exp: {b.tglExpired}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            (Tanpa expired)
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600">
                        Subtotal: <span className="font-bold text-slate-900">{rupiah(subtotal)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <div>
                <span className="text-xs font-medium text-slate-500">Total Stok Fisik Masuk:</span>
                <span className="ml-1.5 text-sm font-bold text-emerald-700">
                  +{totalStokFisik.toLocaleString('id-ID')} unit dasar
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Total Nilai Penerimaan:</span>
                <span className="text-lg font-extrabold text-slate-900">{rupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Penerimaan */}
      <Modal
        open={Boolean(detailPenerimaan)}
        onClose={() => setDetailPenerimaan(null)}
        title={`Detail Penerimaan Barang - ${detailPenerimaan?.nomor ?? ''}`}
        lebar="max-w-3xl"
        footer={<Button onClick={() => setDetailPenerimaan(null)}>Tutup</Button>}
      >
        {detailPenerimaan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-500 block">Supplier</span>
                <span className="font-bold text-slate-800 text-sm">
                  {supplier.find((s) => s.id === detailPenerimaan.supplierId)?.nama ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Waktu Penerimaan</span>
                <span className="font-semibold text-slate-800">
                  {tanggalJam(detailPenerimaan.waktu)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Metode Pembayaran</span>
                <div>
                  {detailPenerimaan.metode === 'kredit' ? (
                    <Badge warna="amber">Kredit (Jatuh Tempo: {detailPenerimaan.jatuhTempo ? tanggalJam(detailPenerimaan.jatuhTempo).split(' ')[0] : '-'})</Badge>
                  ) : (
                    <Badge warna="green">Tunai (Lunas)</Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Total Faktur</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {rupiah(detailPenerimaan.total)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Produk</th>
                    <th className="p-2.5">Satuan Beli</th>
                    <th className="p-2.5 text-right">Qty Beli</th>
                    <th className="p-2.5 text-right">Stok Fisik Masuk</th>
                    <th className="p-2.5">Tgl Expired</th>
                    <th className="p-2.5 text-right">Harga Beli Satuan</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailPenerimaan.items.map((item, idx) => {
                    const prod = produk.find((p) => p.id === item.produkId)
                    const mult = item.multiplier || 1
                    const stokMasuk = item.jumlahStokMasuk || item.qty * mult
                    const subtotal = item.qty * item.hargaBeli

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-2.5 font-medium text-slate-800">
                          {item.namaProduk}
                          {prod?.sku && <span className="ml-1 text-slate-400 font-normal">({prod.sku})</span>}
                        </td>
                        <td className="p-2.5">
                          <span className="capitalize font-semibold text-slate-700">
                            {item.satuan || prod?.satuan || 'pcs'}
                          </span>
                          {mult > 1 && (
                            <span className="ml-1 text-[11px] text-slate-500">
                              (isi {mult} {prod?.satuan || 'pcs'})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-800">
                          {item.qty} {item.satuan || prod?.satuan || 'pcs'}
                        </td>
                        <td className="p-2.5 text-right">
                          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                            +{stokMasuk.toLocaleString('id-ID')} {prod?.satuan || 'pcs'}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {item.tglExpired ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                              📅 {item.tglExpired}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          {rupiah(item.hargaBeli)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {rupiah(subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-slate-700">
                      Total
                    </td>
                    <td className="p-2.5 text-right text-blue-700">
                      +
                      {detailPenerimaan.items
                        .reduce((a, b) => a + (b.jumlahStokMasuk || b.qty * (b.multiplier || 1)), 0)
                        .toLocaleString('id-ID')}{' '}
                      unit fisik
                    </td>
                    <td colSpan={2} className="p-2.5 text-right">Grand Total:</td>
                    <td className="p-2.5 text-right text-slate-900">
                      {rupiah(detailPenerimaan.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tambah Produk Baru Langsung dari Penerimaan */}
      <Modal
        open={modalTambahProduk}
        onClose={() => setModalTambahProduk(false)}
        title="Tambah Produk Baru ke Database"
        lebar="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalTambahProduk(false)}>
              Batal
            </Button>
            <Button onClick={handleSimpanProdukBaru}>
              Simpan & Masukkan ke Penerimaan
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <Label>Nama Produk <span className="text-rose-500">*</span></Label>
            <Input
              type="text"
              placeholder="Contoh: Susu UHT Cokelat 1L"
              value={formProdukBaru.nama}
              onChange={(e) => setFormProdukBaru({ ...formProdukBaru, nama: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategori</Label>
              <Select
                value={formProdukBaru.kategoriId}
                onChange={(e) => setFormProdukBaru({ ...formProdukBaru, kategoriId: e.target.value })}
                className="text-xs"
              >
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Satuan Terkecil</Label>
              <Input
                type="text"
                placeholder="pcs / kg / botol"
                value={formProdukBaru.satuan}
                onChange={(e) => setFormProdukBaru({ ...formProdukBaru, satuan: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Harga Beli (Modal)</Label>
              <CurrencyInput
                sizeVariant="sm"
                value={formProdukBaru.hargaBeli}
                onChange={(val) => setFormProdukBaru({ ...formProdukBaru, hargaBeli: val })}
              />
            </div>
            <div>
              <Label>Harga Jual Estimasi</Label>
              <CurrencyInput
                sizeVariant="sm"
                value={formProdukBaru.hargaJual}
                onChange={(val) => setFormProdukBaru({ ...formProdukBaru, hargaJual: val })}
              />
            </div>
          </div>

          <div>
            <Label className="text-brand-900 font-semibold">
              Tanggal Kedaluwarsa (Expired Date)
            </Label>
            <Input
              type="date"
              value={formProdukBaru.tglExpired}
              onChange={(e) => setFormProdukBaru({ ...formProdukBaru, tglExpired: e.target.value })}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tanggal expired batch pertama produk ini.
            </p>
          </div>
        </div>
      </Modal>

      <ModalRestockSupplier
        open={modalRestock}
        onClose={() => setModalRestock(false)}
      />
    </>
  )
}

