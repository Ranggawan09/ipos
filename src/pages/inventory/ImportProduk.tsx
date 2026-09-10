import { useState } from 'react'
import type { Produk as TProduk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { exportCSV, parseCSV } from '@/lib/csv'
import { rupiah } from '@/lib/format'
import { Button, Card, DataTable, FR, PageHeader } from '@/components/ui'

const TEMPLATE_HEADER = ['sku', 'barcode', 'nama', 'kategori', 'satuan', 'harga_beli', 'harga_jual', 'stok', 'stok_minimum']

const CONTOH = `sku,barcode,nama,kategori,satuan,harga_beli,harga_jual,stok,stok_minimum
SKU9001,8999000001,Contoh Produk A,Sembako,pcs,10000,12500,50,10
SKU9002,8999000002,Contoh Produk B,Minuman,botol,5000,7000,100,20`

type BarisPreview = {
  sku: string
  barcode: string
  nama: string
  kategoriNama: string
  kategoriId: string
  satuan: string
  hargaBeli: number
  hargaJual: number
  stok: number
  stokMinimum: number
  valid: boolean
  catatan: string
}

export function ImportProduk() {
  const { kategori, simpanProduk } = useDataStore()
  const push = useToast((s) => s.push)
  const [teks, setTeks] = useState(CONTOH)
  const [preview, setPreview] = useState<BarisPreview[] | null>(null)

  const proses = () => {
    const rows = parseCSV(teks)
    if (rows.length < 2) {
      push({ tipe: 'error', judul: 'Data tidak valid', pesan: 'Minimal satu baris data diperlukan.' })
      return
    }
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const idx = (nama: string) => header.indexOf(nama)

    const hasil: BarisPreview[] = rows.slice(1).map((r) => {
      const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? '').trim() : '')
      const nama = get('nama')
      const sku = get('sku')
      const kategoriNama = get('kategori')
      const kat = kategori.find((k) => k.nama.toLowerCase() === kategoriNama.toLowerCase())
      const hargaBeli = Number(get('harga_beli')) || 0
      const hargaJual = Number(get('harga_jual')) || 0
      const catatan: string[] = []
      if (!nama) catatan.push('nama kosong')
      if (!sku) catatan.push('sku kosong')
      if (!kat) catatan.push('kategori tidak dikenal')
      if (hargaJual < hargaBeli) catatan.push('harga jual < harga beli')
      return {
        sku,
        barcode: get('barcode') || sku,
        nama,
        kategoriNama: kategoriNama || '-',
        kategoriId: kat?.id ?? kategori[0]?.id ?? '',
        satuan: get('satuan') || 'pcs',
        hargaBeli,
        hargaJual,
        stok: Number(get('stok')) || 0,
        stokMinimum: Number(get('stok_minimum')) || 5,
        valid: catatan.length === 0,
        catatan: catatan.join(', '),
      }
    })
    setPreview(hasil)
  }

  const impor = () => {
    if (!preview) return
    const valid = preview.filter((p) => p.valid)
    valid.forEach((p) => {
      simpanProduk({
        sku: p.sku,
        barcode: p.barcode,
        nama: p.nama,
        kategoriId: p.kategoriId,
        satuan: p.satuan,
        hargaBeli: p.hargaBeli,
        hargaJual: p.hargaJual,
        stok: p.stok,
        stokMinimum: p.stokMinimum,
        aktif: true,
      } as Omit<TProduk, 'id'>)
    })
    push({
      tipe: 'sukses',
      judul: `${valid.length} produk berhasil diimpor`,
      pesan: preview.length - valid.length > 0 ? `${preview.length - valid.length} baris dilewati karena tidak valid.` : undefined,
    })
    setPreview(null)
  }

  const unduhTemplate = () =>
    exportCSV('template-import-produk.csv', TEMPLATE_HEADER, [
      ['SKU9001', '8999000001', 'Contoh Produk A', 'Sembako', 'pcs', 10000, 12500, 50, 10],
    ])

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setTeks(String(reader.result))
    reader.readAsText(file)
  }

  return (
    <>
      <PageHeader
        judul="Import Produk Massal"
        deskripsi="Impor data produk dari file CSV untuk kebutuhan input awal ribuan item."
        aksi={
          <Button variant="secondary" onClick={unduhTemplate}>Unduh Template CSV</Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="1. Tempel atau unggah data" subtitle="Format CSV, pemisah koma. Baris pertama adalah judul kolom." action={<FR kode="FR-INV-08" />} className="lg:col-span-2">
          <textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Pilih file CSV
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
            <Button onClick={proses}>Pratinjau Data</Button>
            <Button variant="ghost" onClick={() => { setTeks(CONTOH); setPreview(null) }}>Muat contoh</Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Catatan: demo ini membaca berkas CSV. Untuk Excel (.xlsx), simpan lembar kerja sebagai CSV terlebih dahulu.
          </p>
        </Card>

        <Card title="Kolom yang dibutuhkan">
          <ul className="space-y-2 text-xs text-slate-600">
            {[
              ['sku', 'Kode unik produk (wajib)'],
              ['barcode', 'Barcode produk (opsional, default = sku)'],
              ['nama', 'Nama produk (wajib)'],
              ['kategori', 'Nama kategori yang sudah terdaftar'],
              ['satuan', 'pcs, kg, dus, ... (default pcs)'],
              ['harga_beli', 'Angka tanpa titik/koma'],
              ['harga_jual', 'Angka tanpa titik/koma'],
              ['stok', 'Stok awal'],
              ['stok_minimum', 'Batas notifikasi stok'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-2">
                <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-brand-700">{k}</code>
                <span className="text-slate-500">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {preview && (
        <Card
          className="mt-4"
          title={`Pratinjau: ${preview.length} baris`}
          subtitle={`${preview.filter((p) => p.valid).length} valid, ${preview.filter((p) => !p.valid).length} bermasalah`}
          action={<Button onClick={impor} disabled={preview.every((p) => !p.valid)}>Impor {preview.filter((p) => p.valid).length} produk</Button>}
        >
          <DataTable
            data={preview.map((p, i) => ({ ...p, id: String(i) }))}
            kolom={[
              { key: 'valid', header: 'Status', render: (p) => p.valid
                ? <span className="text-xs font-medium text-emerald-600">Valid</span>
                : <span className="text-xs font-medium text-rose-600" title={p.catatan}>{p.catatan}</span> },
              { key: 'sku', header: 'SKU', render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
              { key: 'nama', header: 'Nama', render: (p) => <span className="font-medium text-slate-700">{p.nama || '-'}</span> },
              { key: 'kategori', header: 'Kategori', render: (p) => p.kategoriNama },
              { key: 'satuan', header: 'Satuan' },
              { key: 'hargaBeli', header: 'Harga Beli', align: 'right', render: (p) => rupiah(p.hargaBeli) },
              { key: 'hargaJual', header: 'Harga Jual', align: 'right', render: (p) => rupiah(p.hargaJual) },
              { key: 'stok', header: 'Stok', align: 'right' },
            ]}
          />
        </Card>
      )}
    </>
  )
}
