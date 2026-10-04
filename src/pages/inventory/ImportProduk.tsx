import { useState, useRef } from 'react'
import type { Produk as TProduk, SatuanBertingkat } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { exportXLSX, parseWorkbook, toCSV } from '@/lib/csv'
import { rupiah } from '@/lib/format'
import { Button, Card, DataTable, FR, PageHeader } from '@/components/ui'

// Format header import .xlsx tanpa kolom jenis dan barcode (1 baris = 1 produk)
const TEMPLATE_HEADER = [
  'sku',
  'nama',
  'kategori',
  'satuan',
  'harga_beli',
  'harga_jual',
  'stok',
  'stok_minimum',
  // Tingkat Satuan Tambahan 2, 3, 4 (Opsional)
  'satuan_2',
  'isi_2',
  'harga_beli_2',
  'harga_jual_2',
  'satuan_3',
  'isi_3',
  'harga_beli_3',
  'harga_jual_3',
  'satuan_4',
  'isi_4',
  'harga_beli_4',
  'harga_jual_4',
  // Pecahan / Eceran 1, 2, 3 (Opsional)
  'pecahan_1',
  'isi_pecahan_1',
  'harga_jual_pecahan_1',
  'pecahan_2',
  'isi_pecahan_2',
  'harga_jual_pecahan_2',
  'pecahan_3',
  'isi_pecahan_3',
  'harga_jual_pecahan_3',
]

// Data contoh komprehensif: 1 baris per produk dengan kolom satuan bertingkat & pecahan opsional
const CONTOH_ROWS: (string | number)[][] = [
  // 1. Beras Curah: Satuan dasar kg, 1 tingkat satuan (sak = 50 kg), dan 3 pecahan (5kg, 2kg, 1kg)
  [
    'SKU-BRS-001',
    'Beras Ramos Super Curah',
    'Sembako',
    'kg',
    12000,
    14500,
    250,
    25,
    'sak',
    50,
    600000,
    690000,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '5kg',
    5,
    69000,
    '2kg',
    2,
    28500,
    '1kg',
    1,
    14500,
  ],

  // 2. Gula Pasir Curah: Satuan dasar kg, 1 tingkat satuan (sak = 50 kg), dan 3 pecahan (1kg, 1/2kg, 1/4kg)
  [
    'SKU-GLA-001',
    'Gula Pasir Kristal Curah',
    'Sembako',
    'kg',
    14000,
    17000,
    200,
    20,
    'sak',
    50,
    700000,
    770000,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '1kg',
    1,
    17000,
    '1/2kg',
    0.5,
    8750,
    '1/4kg',
    0.25,
    4500,
  ],

  // 3. Kopi Kapal Api: Satuan dasar pcs, 2 tingkat satuan (renceng = 10 pcs, karton = 12 renceng), 1 pecahan (1/2 renceng)
  [
    'SKU-KPI-001',
    'Kopi Kapal Api Spesial Mix',
    'Minuman',
    'pcs',
    1200,
    1500,
    240,
    20,
    'renceng',
    10,
    11500,
    13500,
    'karton',
    12,
    135000,
    155000,
    '',
    '',
    '',
    '',
    '1/2 renceng',
    0.5,
    7000,
    '',
    '',
    '',
    '',
    '',
    '',
  ],

  // 4. Produk Reguler Satuan Tunggal (tanpa satuan bertingkat & tanpa pecahan)
  [
    'SKU-MYK-001',
    'Minyak Goreng Sania 2L',
    'Sembako',
    'pouch',
    32000,
    36000,
    60,
    10,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
  [
    'SKU-TGG-001',
    'Tepung Terigu Segitiga Biru 1kg',
    'Sembako',
    'pcs',
    11000,
    13000,
    80,
    15,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
]

const CONTOH_TEXT = toCSV(TEMPLATE_HEADER, CONTOH_ROWS)

type BarisPreview = {
  rowNumber: number
  sku: string
  nama: string
  kategoriNama: string
  kategoriId: string
  satuan: string
  hargaBeli: number
  hargaJual: number
  stok: number
  stokMinimum: number
  satuanBertingkat: SatuanBertingkat[]
  valid: boolean
  catatan: string[]
}

export function ImportProduk() {
  const { kategori, produk, simpanProduk } = useDataStore()
  const push = useToast((s) => s.push)

  const [rawText, setRawText] = useState(CONTOH_TEXT)
  const [fileName, setFileName] = useState<string | null>('contoh-data.xlsx')
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [showRawEditor, setShowRawEditor] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<BarisPreview[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Unduh template dalam format .xlsx resmi
  const unduhTemplate = () => {
    exportXLSX('template-import-produk.xlsx', TEMPLATE_HEADER, CONTOH_ROWS, 'Template Produk')
    push({
      tipe: 'info',
      judul: 'Template Excel Diunduh',
      pesan: 'Berkas template-import-produk.xlsx siap diedit di Microsoft Excel atau WPS Office.',
    })
  }

  // Parser data 1 baris per produk dengan kolom satuan & pecahan opsional
  const parseData = (contentOrData: string | ArrayBuffer | string[][]) => {
    const rows = Array.isArray(contentOrData) ? contentOrData : parseWorkbook(contentOrData)
    if (rows.length < 2) {
      push({
        tipe: 'error',
        judul: 'Data tidak valid',
        pesan: 'Berkas kosong atau tidak memiliki baris data di bawah header.',
      })
      return
    }

    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const idx = (nama: string) => header.indexOf(nama)

    if (idx('sku') === -1 || idx('nama') === -1 || idx('satuan') === -1) {
      push({
        tipe: 'error',
        judul: 'Header tidak lengkap',
        pesan: 'Kolom sku, nama, dan satuan wajib tercantum dalam berkas.',
      })
      return
    }

    const hasil: BarisPreview[] = []

    rows.slice(1).forEach((r, rowIdx) => {
      if (!r.some((c) => c && c.trim() !== '')) return

      const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? '').trim() : '')
      const lineNo = rowIdx + 2

      const sku = get('sku')
      const nama = get('nama')
      const kategoriNama = get('kategori')
      const kat = kategori.find((k) => k.nama.toLowerCase() === kategoriNama.toLowerCase())
      const baseSatuan = (get('satuan') || 'pcs').toLowerCase()
      const baseHargaBeli = Number(get('harga_beli')) || 0
      const baseHargaJual = Number(get('harga_jual')) || 0
      const stok = Number(get('stok')) || 0
      const stokMinimum = Number(get('stok_minimum')) || 5

      const catatan: string[] = []
      if (!sku) catatan.push('SKU wajib diisi')
      if (!nama) catatan.push('Nama produk wajib diisi')
      if (!kat && kategoriNama) catatan.push(`Kategori "${kategoriNama}" belum terdaftar`)
      if (baseHargaJual < baseHargaBeli && baseHargaBeli > 0) catatan.push('Harga jual dasar < harga beli')

      const createdTiers: SatuanBertingkat[] = []
      let prevSatuan = baseSatuan
      let prevMultiplier = 1

      // 1. Proses Tingkat Satuan Tambahan (satuan_2, satuan_3, satuan_4)
      const tierLevels = [2, 3, 4]
      tierLevels.forEach((lvl) => {
        const namaSatuan = get(`satuan_${lvl}`).toLowerCase()
        if (!namaSatuan) return

        if (namaSatuan === baseSatuan) {
          catatan.push(`Satuan_${lvl} '${namaSatuan}' sama dengan satuan dasar`)
          return
        }
        if (createdTiers.some((t) => t.namaSatuan.toLowerCase() === namaSatuan)) {
          catatan.push(`Satuan_${lvl} '${namaSatuan}' duplikat`)
          return
        }

        const isiVal = parseFloat(get(`isi_${lvl}`)) || 1
        const multToBase = prevMultiplier * isiVal
        const satuanTurunan = prevSatuan

        const hbInput = get(`harga_beli_${lvl}`)
        const hjInput = get(`harga_jual_${lvl}`)

        const hargaBeli =
          hbInput && Number(hbInput) > 0
            ? Number(hbInput)
            : Math.round(baseHargaBeli * multToBase)

        const hargaJual =
          hjInput && Number(hjInput) > 0
            ? Number(hjInput)
            : hargaBeli > 0
              ? Math.round(hargaBeli * 1.15)
              : Math.round(baseHargaJual * multToBase)

        const marginPersen =
          hargaBeli > 0 ? Math.round(((hargaJual - hargaBeli) / hargaBeli) * 100 * 10) / 10 : 0

        createdTiers.push({
          id: `STB-IMP-${Date.now()}-${rowIdx}-${lvl}`,
          namaSatuan,
          satuanTurunan,
          isi: isiVal,
          multiplierToBase: multToBase,
          hargaBeli,
          marginPersen,
          hargaJual,
          isPecahan: false,
        })

        prevSatuan = namaSatuan
        prevMultiplier = multToBase
      })

      // 2. Proses Pecahan (pecahan_1, pecahan_2, pecahan_3)
      const fracLevels = [1, 2, 3]
      fracLevels.forEach((lvl) => {
        const namaPecahan = get(`pecahan_${lvl}`)
        if (!namaPecahan) return

        const isiRaw = get(`isi_pecahan_${lvl}`)
        const isiVal = parseFloat(isiRaw) || 1

        // Induk satuan: unit bertingkat pertama jika ada, atau satuan dasar
        const firstTier = createdTiers.find((t) => !t.isPecahan)
        const parentUnitName = firstTier ? firstTier.namaSatuan : baseSatuan
        const parentMultiplier = firstTier ? firstTier.multiplierToBase : 1
        const parentHargaBeli = firstTier ? firstTier.hargaBeli : baseHargaBeli

        let multToBase = 1
        let rasio = 1

        if (isiVal < 1) {
          rasio = isiVal
          multToBase = Math.max(0.001, Math.round(parentMultiplier * rasio * 1000) / 1000)
        } else {
          multToBase = isiVal
          rasio = parentMultiplier > 0 ? isiVal / parentMultiplier : 1
        }

        const hargaBeli =
          firstTier && isiVal < 1
            ? Math.round(parentHargaBeli * rasio)
            : Math.round(baseHargaBeli * multToBase)

        const hjInput = get(`harga_jual_pecahan_${lvl}`)
        const hargaJual =
          hjInput && Number(hjInput) > 0
            ? Number(hjInput)
            : hargaBeli > 0
              ? Math.round(hargaBeli * 1.15)
              : Math.round(baseHargaJual * multToBase)

        const marginPersen =
          hargaBeli > 0 ? Math.round(((hargaJual - hargaBeli) / hargaBeli) * 100 * 10) / 10 : 0

        createdTiers.push({
          id: `STB-FRAC-IMP-${Date.now()}-${rowIdx}-${lvl}`,
          namaSatuan: namaPecahan,
          satuanTurunan: baseSatuan,
          isi: multToBase,
          multiplierToBase: multToBase,
          hargaBeli,
          marginPersen,
          hargaJual,
          isPecahan: true,
          indukSatuan: parentUnitName,
          rasio,
        })
      })

      hasil.push({
        rowNumber: lineNo,
        sku,
        nama,
        kategoriNama: kategoriNama || (kategori[0]?.nama ?? '-'),
        kategoriId: kat?.id ?? (kategori[0]?.id ?? ''),
        satuan: baseSatuan,
        hargaBeli: baseHargaBeli,
        hargaJual: baseHargaJual,
        stok,
        stokMinimum,
        satuanBertingkat: createdTiers,
        valid: catatan.length === 0,
        catatan,
      })
    })

    setPreview(hasil)
    const validCount = hasil.filter((p) => p.valid).length
    const invalidCount = hasil.length - validCount

    if (invalidCount > 0) {
      push({
        tipe: 'peringatan',
        judul: `Pratinjau: ${hasil.length} Produk`,
        pesan: `${validCount} valid, ${invalidCount} baris memiliki catatan/error.`,
      })
    } else {
      push({
        tipe: 'sukses',
        judul: `Pratinjau Siap`,
        pesan: `Semua ${validCount} produk valid dan siap diimpor.`,
      })
    }
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`)
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      const rows = parseWorkbook(buffer)
      if (rows.length > 0) {
        setRawText(toCSV(rows[0], rows.slice(1)))
      }
      parseData(rows)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const impor = () => {
    if (!preview) return
    const valid = preview.filter((p) => p.valid)
    if (valid.length === 0) {
      push({
        tipe: 'error',
        judul: 'Tidak Ada Data Valid',
        pesan: 'Perbaiki kesalahan pada baris data sebelum melakukan impor.',
      })
      return
    }

    let updatedCount = 0
    let createdCount = 0

    valid.forEach((p) => {
      const existing = produk.find((item) => item.sku.toLowerCase() === p.sku.toLowerCase())
      if (existing) updatedCount++
      else createdCount++

      simpanProduk({
        id: existing?.id,
        sku: p.sku,
        barcode: existing?.barcode || p.sku, // Barcode default otomatis menggunakan SKU
        nama: p.nama,
        kategoriId: p.kategoriId,
        satuan: p.satuan,
        hargaBeli: p.hargaBeli,
        hargaJual: p.hargaJual,
        stok: p.stok,
        stokMinimum: p.stokMinimum,
        aktif: true,
        satuanBertingkat: p.satuanBertingkat.length > 0 ? p.satuanBertingkat : undefined,
      } as Omit<TProduk, 'id'> & { id?: string })
    })

    const ringkasan = [
      createdCount > 0 ? `${createdCount} produk baru` : '',
      updatedCount > 0 ? `${updatedCount} produk diperbarui` : '',
    ]
      .filter(Boolean)
      .join(', ')

    push({
      tipe: 'sukses',
      judul: `${valid.length} Produk Berhasil Diimpor`,
      pesan: `${ringkasan}. ${preview.length - valid.length > 0 ? `${preview.length - valid.length} baris dilewati karena bermasalah.` : ''}`,
    })
    setPreview(null)
  }

  const resetContoh = () => {
    setRawText(CONTOH_TEXT)
    setFileName('contoh-data.xlsx')
    setFileSize('2.4 KB')
    parseData(CONTOH_TEXT)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Impor Produk Massal (.xlsx)"
        deskripsi="Impor produk massal (1 baris per produk) dalam format Excel (.xlsx) dengan kolom opsional Satuan Bertingkat (maks. 3 tingkat) dan Pecahan (maks. 3 kemasan)."
        aksi={
          <Button variant="secondary" onClick={unduhTemplate} className="gap-2">
            <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Unduh Template .XLSX
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom 1 & 2: Unggah Berkas & Editor */}
        <Card
          title="1. Unggah Berkas Excel (.xlsx) atau Teks"
          subtitle="Pilih berkas dari komputer atau tempel data langsung."
          action={<FR kode="FR-INV-08" />}
          className="lg:col-span-2"
        >
          {/* Dropzone Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? 'border-brand-500 bg-brand-50/60'
                : 'border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm transition-transform group-hover:scale-105">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Klik untuk memilih berkas Excel (.xlsx) atau seret ke sini
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Format yang didukung: <span className="font-medium text-slate-700">.xlsx</span> (Excel Workbook), <span className="font-medium text-slate-700">.xls</span>, <span className="font-medium text-slate-700">.csv</span>
            </p>

            {fileName && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{fileName}</span>
                {fileSize && <span className="text-emerald-600">({fileSize})</span>}
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => parseData(rawText)} className="gap-1.5">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Pratinjau Data
              </Button>
              <Button variant="ghost" onClick={resetContoh}>
                Muat Contoh Data
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setShowRawEditor(!showRawEditor)}
              className="text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              {showRawEditor ? 'Sembunyikan Editor Teks' : 'Lihat / Edit Teks Mentah'}
            </button>
          </div>

          {/* Optional Raw Textarea Editor */}
          {showRawEditor && (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-600">
                Isi Mentah Berkas (CSV / XML):
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <p className="text-[11px] text-slate-400">
                Anda dapat mengubah baris langsung di sini kemudian klik <strong>Pratinjau Data</strong>.
              </p>
            </div>
          )}
        </Card>

        {/* Kolom 3: Panduan Format Bertingkat */}
        <Card title="Aturan Format Template" subtitle="1 baris per produk dengan kolom opsional">
          <div className="space-y-4 text-xs text-slate-600">
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
              <div className="font-semibold text-blue-900">Format 1 Baris per Produk</div>
              <p className="mt-1 leading-relaxed text-blue-800">
                Setiap baris mewakili 1 produk lengkap. Kolom tingkat satuan tambahan (<code className="rounded bg-blue-100 px-1 font-mono text-blue-900">satuan_2..4</code>) dan pecahan (<code className="rounded bg-blue-100 px-1 font-mono text-blue-900">pecahan_1..3</code>) bersifat <strong>opsional</strong> dan dapat dikosongkan untuk produk reguler.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">satuan</span>
                <span>Satuan dasar terkecil produk (cth: kg, pcs, pouch). Menjadi basis perhitungan stok.</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">satuan_2..4</span>
                <span>
                  Nama tingkat satuan grosir/kemasan di atasnya (cth: renceng, karton, sak).
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">isi_2..4</span>
                <span>
                  Isi terhadap tingkat satuan di bawahnya (cth: 1 karton isi 12 renceng, 1 renceng isi 10 pcs).
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">harga_beli_N</span>
                <span>
                  Opsional. Jika dikosongkan, modal dihitung otomatis proporsional dari satuan dasar/induk.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">pecahan_1..3</span>
                <span>
                  Kemasan eceran/pecahan (cth: 5kg, 2kg, 1/2 renceng).
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">isi_pecahan</span>
                <span>
                  Angka &lt; 1 adalah rasio terhadap induk (cth: 0.5 = 1/2 renceng), angka &ge; 1 adalah kuantitas satuan dasar (cth: 5 = 5 kg).
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-800">barcode</span>
                <span className="text-rose-700">
                  <strong>Ditiadakan</strong>. Barcode otomatis disamakan dengan SKU produk.
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
              <strong>Kapasitas:</strong> Mendukung hingga 3 tingkat satuan tambahan dan 3 pecahan untuk tiap produk.
            </div>
          </div>
        </Card>
      </div>

      {/* Tabel Pratinjau */}
      {preview && (
        <Card
          className="mt-6"
          title={`Pratinjau: ${preview.length} Produk Terdeteksi`}
          subtitle={`${preview.filter((p) => p.valid).length} produk valid, ${preview.filter((p) => !p.valid).length} bermasalah`}
          action={
            <Button
              onClick={impor}
              disabled={preview.every((p) => !p.valid)}
              className="gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Impor {preview.filter((p) => p.valid).length} Produk Valid
            </Button>
          }
        >
          <DataTable
            data={preview.map((p, i) => ({ ...p, id: String(i) }))}
            kolom={[
              {
                key: 'valid',
                header: 'Status',
                render: (p) =>
                  p.valid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Valid
                    </span>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Bermasalah
                      </span>
                      <div className="text-[11px] text-rose-600">{p.catatan.join(', ')}</div>
                    </div>
                  ),
              },
              {
                key: 'sku',
                header: 'SKU',
                render: (p) => (
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-800">{p.sku || '-'}</span>
                    <div className="text-[10px] text-slate-400">Baris ke-{p.rowNumber}</div>
                  </div>
                ),
              },
              {
                key: 'nama',
                header: 'Produk & Kategori',
                render: (p) => (
                  <div>
                    <div className="font-semibold text-slate-800">{p.nama || '-'}</div>
                    <div className="text-xs text-slate-500">{p.kategoriNama}</div>
                  </div>
                ),
              },
              {
                key: 'satuan',
                header: 'Satuan Dasar & Stok',
                render: (p) => (
                  <div>
                    <div className="font-medium text-slate-700">
                      {p.stok.toLocaleString('id-ID')} <span className="font-semibold text-brand-700">{p.satuan}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Min: {p.stokMinimum} {p.satuan}</div>
                  </div>
                ),
              },
              {
                key: 'satuanBertingkat',
                header: 'Satuan Bertingkat (Maks. 3)',
                render: (p) => {
                  const tiers = p.satuanBertingkat.filter((t) => !t.isPecahan)
                  if (tiers.length === 0) {
                    return <span className="text-xs italic text-slate-400">- Tidak ada -</span>
                  }
                  return (
                    <div className="flex flex-col gap-1">
                      {tiers.map((t, idx) => (
                        <div
                          key={t.id || idx}
                          className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-900 border border-blue-200"
                        >
                          <span className="font-bold">{t.namaSatuan}</span>
                          <span className="text-blue-600">(= {t.isi} {t.satuanTurunan})</span>
                          <span className="font-semibold text-blue-800">• {rupiah(t.hargaJual)}</span>
                        </div>
                      ))}
                    </div>
                  )
                },
              },
              {
                key: 'pecahan',
                header: 'Pecahan / Eceran (Maks. 3)',
                render: (p) => {
                  const fracs = p.satuanBertingkat.filter((t) => t.isPecahan)
                  if (fracs.length === 0) {
                    return <span className="text-xs italic text-slate-400">- Tidak ada -</span>
                  }
                  return (
                    <div className="flex flex-col gap-1">
                      {fracs.map((f, idx) => (
                        <div
                          key={f.id || idx}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900 border border-amber-200"
                        >
                          <span className="font-bold">{f.namaSatuan}</span>
                          <span className="text-amber-700">({f.multiplierToBase} {p.satuan})</span>
                          <span className="font-semibold text-amber-800">• {rupiah(f.hargaJual)}</span>
                        </div>
                      ))}
                    </div>
                  )
                },
              },
              {
                key: 'hargaDasar',
                header: 'Harga Dasar',
                align: 'right',
                render: (p) => (
                  <div className="text-right">
                    <div className="font-semibold text-slate-800">{rupiah(p.hargaJual)}</div>
                    <div className="text-[11px] text-slate-400">Modal: {rupiah(p.hargaBeli)}</div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
