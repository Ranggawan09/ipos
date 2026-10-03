import { useState, useRef } from 'react'
import type { Produk as TProduk, SatuanBertingkat } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { exportXLS, parseXLS, toCSV } from '@/lib/csv'
import { rupiah } from '@/lib/format'
import { Button, Card, DataTable, FR, PageHeader } from '@/components/ui'

// Format header import .xls tanpa kolom barcode
const TEMPLATE_HEADER = [
  'jenis',
  'sku',
  'nama',
  'kategori',
  'satuan',
  'satuan_induk',
  'isi',
  'harga_beli',
  'harga_jual',
  'stok',
  'stok_minimum',
]

// Data contoh komprehensif: produk bertingkat & pecahan (Beras, Gula, Kopi) serta produk reguler
const CONTOH_ROWS: (string | number)[][] = [
  // 1. Beras Curah: Satuan dasar kg, 1 tingkat satuan (sak = 50 kg), dan 3 pecahan (5kg, 2kg, 1kg)
  ['produk', 'SKU-BRS-001', 'Beras Ramos Super Curah', 'Sembako', 'kg', '', 1, 12000, 14500, 250, 25],
  ['satuan', '', '', '', 'sak', 'kg', 50, 600000, 690000, '', ''],
  ['pecahan', '', '5kg', '', '', 'sak', 5, 60000, 69000, '', ''],
  ['pecahan', '', '2kg', '', '', 'sak', 2, 24000, 28500, '', ''],
  ['pecahan', '', '1kg', '', '', 'sak', 1, 12000, 14500, '', ''],

  // 2. Gula Pasir Curah: Satuan dasar kg, 1 tingkat satuan (sak = 50 kg), dan 3 pecahan (1kg, 1/2kg, 1/4kg)
  ['produk', 'SKU-GLA-001', 'Gula Pasir Kristal Curah', 'Sembako', 'kg', '', 1, 14000, 17000, 200, 20],
  ['satuan', '', '', '', 'sak', 'kg', 50, 700000, 770000, '', ''],
  ['pecahan', '', '1kg', '', '', 'sak', 1, 14000, 17000, '', ''],
  ['pecahan', '', '1/2kg', '', '', 'sak', 0.5, 7000, 8750, '', ''],
  ['pecahan', '', '1/4kg', '', '', 'sak', 0.25, 3500, 4500, '', ''],

  // 3. Kopi Kapal Api: 3 tingkat satuan (pcs -> renceng [10 pcs] -> karton [12 renceng]), dan 1 pecahan (1/2 renceng)
  ['produk', 'SKU-KPI-001', 'Kopi Kapal Api Spesial Mix', 'Minuman', 'pcs', '', 1, 1200, 1500, 240, 20],
  ['satuan', '', '', '', 'renceng', 'pcs', 10, 11500, 13500, '', ''],
  ['satuan', '', '', '', 'karton', 'renceng', 12, 135000, 155000, '', ''],
  ['pecahan', '', '1/2 renceng', '', '', 'renceng', 0.5, 6000, 7000, '', ''],

  // 4. Produk Reguler Satuan Tunggal (tanpa satuan bertingkat & tanpa pecahan)
  ['produk', 'SKU-MYK-001', 'Minyak Goreng Sania 2L', 'Sembako', 'pouch', '', 1, 32000, 36000, 60, 10],
  ['produk', 'SKU-TGG-001', 'Tepung Terigu Segitiga Biru 1kg', 'Sembako', 'pcs', '', 1, 11000, 13000, 80, 15],
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
  const [fileName, setFileName] = useState<string | null>('contoh-data.xls')
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [showRawEditor, setShowRawEditor] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<BarisPreview[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Unduh template dalam format .xls resmi
  const unduhTemplate = () => {
    exportXLS('template-import-produk.xls', TEMPLATE_HEADER, CONTOH_ROWS, 'Template Produk')
    push({
      tipe: 'info',
      judul: 'Template Excel Diunduh',
      pesan: 'Berkas template-import-produk.xls siap diedit di Microsoft Excel atau WPS Office.',
    })
  }

  // Parser data bertingkat (Mendukung .xls XML Spreadsheet, HTML Table, dan CSV)
  const parseData = (content: string) => {
    const rows = parseXLS(content)
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

    type RawRow = {
      lineNo: number
      jenis: string
      sku: string
      nama: string
      kategori: string
      satuan: string
      satuanInduk: string
      isi: string
      hargaBeli: string
      hargaJual: string
      stok: string
      stokMinimum: string
    }

    type ProdukGroup = {
      mainRow: RawRow
      tierRows: RawRow[]
      pecahanRows: RawRow[]
    }

    const groups: ProdukGroup[] = []
    let currentGroup: ProdukGroup | null = null

    rows.slice(1).forEach((r, rowIdx) => {
      if (!r.some((c) => c && c.trim() !== '')) return

      const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? '').trim() : '')
      const rowObj: RawRow = {
        lineNo: rowIdx + 2,
        jenis: get('jenis').toLowerCase(),
        sku: get('sku'),
        nama: get('nama'),
        kategori: get('kategori'),
        satuan: get('satuan'),
        satuanInduk: get('satuan_induk'),
        isi: get('isi'),
        hargaBeli: get('harga_beli'),
        hargaJual: get('harga_jual'),
        stok: get('stok'),
        stokMinimum: get('stok_minimum'),
      }

      if (rowObj.jenis === 'satuan') {
        if (currentGroup) {
          currentGroup.tierRows.push(rowObj)
        } else {
          groups.push({
            mainRow: { ...rowObj, sku: '', nama: '[Tanpa Produk Induk]' },
            tierRows: [rowObj],
            pecahanRows: [],
          })
        }
      } else if (rowObj.jenis === 'pecahan') {
        if (currentGroup) {
          currentGroup.pecahanRows.push(rowObj)
        } else {
          groups.push({
            mainRow: { ...rowObj, sku: '', nama: '[Tanpa Produk Induk]' },
            tierRows: [],
            pecahanRows: [rowObj],
          })
        }
      } else {
        currentGroup = {
          mainRow: rowObj,
          tierRows: [],
          pecahanRows: [],
        }
        groups.push(currentGroup)
      }
    })

    const hasil: BarisPreview[] = groups.map((g, pIdx) => {
      const m = g.mainRow
      const sku = m.sku
      const nama = m.nama
      const kategoriNama = m.kategori
      const kat = kategori.find((k) => k.nama.toLowerCase() === kategoriNama.toLowerCase())
      const baseSatuan = (m.satuan || 'pcs').toLowerCase()
      const baseHargaBeli = Number(m.hargaBeli) || 0
      const baseHargaJual = Number(m.hargaJual) || 0
      const stok = Number(m.stok) || 0
      const stokMinimum = Number(m.stokMinimum) || 5

      const catatan: string[] = []

      if (!sku) catatan.push('SKU wajib diisi')
      if (!nama || nama === '[Tanpa Produk Induk]') catatan.push('Nama produk wajib diisi')
      if (!kat && kategoriNama) catatan.push(`Kategori "${kategoriNama}" belum terdaftar`)
      if (baseHargaJual < baseHargaBeli && baseHargaBeli > 0) catatan.push('Harga jual dasar < harga beli')

      // Validasi batas maksimum: maksimal 4 tingkat satuan & 4 pecahan
      if (g.tierRows.length > 4) {
        catatan.push(`Maksimal 4 tingkat satuan (ditemukan ${g.tierRows.length} baris satuan)`)
      }
      if (g.pecahanRows.length > 4) {
        catatan.push(`Maksimal 4 pecahan (ditemukan ${g.pecahanRows.length} baris pecahan)`)
      }

      const createdTiers: SatuanBertingkat[] = []
      let prevSatuan = baseSatuan
      let prevMultiplier = 1

      // 1. Proses Tingkat Satuan (maksimal 4 tingkat)
      g.tierRows.slice(0, 4).forEach((tr, tIdx) => {
        const namaSatuan = (tr.satuan || tr.nama || '').trim().toLowerCase()
        if (!namaSatuan) {
          catatan.push(`Tingkat satuan #${tIdx + 1}: Nama satuan kosong`)
          return
        }
        if (namaSatuan === baseSatuan) {
          catatan.push(`Tingkat satuan #${tIdx + 1}: Satuan '${namaSatuan}' sama dengan satuan dasar`)
          return
        }
        if (createdTiers.some((t) => t.namaSatuan.toLowerCase() === namaSatuan)) {
          catatan.push(`Tingkat satuan #${tIdx + 1}: Satuan '${namaSatuan}' duplikat`)
          return
        }

        const satuanInduk = (tr.satuanInduk || prevSatuan).trim().toLowerCase()
        const isiVal = parseFloat(tr.isi) || 1

        let multToBase = isiVal
        if (satuanInduk === baseSatuan) {
          multToBase = isiVal
        } else {
          const parentFound = createdTiers.find((t) => t.namaSatuan === satuanInduk)
          if (parentFound) {
            multToBase = parentFound.multiplierToBase * isiVal
          } else {
            multToBase = prevMultiplier * isiVal
          }
        }

        const hargaBeli =
          tr.hargaBeli && Number(tr.hargaBeli) > 0
            ? Number(tr.hargaBeli)
            : Math.round(baseHargaBeli * multToBase)

        const hargaJual =
          tr.hargaJual && Number(tr.hargaJual) > 0
            ? Number(tr.hargaJual)
            : hargaBeli > 0
              ? Math.round(hargaBeli * 1.15)
              : Math.round(baseHargaJual * multToBase)

        const marginPersen =
          hargaBeli > 0 ? Math.round(((hargaJual - hargaBeli) / hargaBeli) * 100 * 10) / 10 : 0

        createdTiers.push({
          id: `STB-IMP-${Date.now()}-${pIdx}-${tIdx + 1}`,
          namaSatuan,
          satuanTurunan: satuanInduk,
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

      // 2. Proses Pecahan (maksimal 4 pecahan)
      g.pecahanRows.slice(0, 4).forEach((fr, fIdx) => {
        const namaPecahan = (fr.nama || fr.satuan || `Pecahan ${fIdx + 1}`).trim()
        if (!namaPecahan) {
          catatan.push(`Pecahan #${fIdx + 1}: Nama pecahan kosong`)
          return
        }

        const satuanInduk = (
          fr.satuanInduk ||
          (createdTiers.length > 0 ? createdTiers[0].namaSatuan : baseSatuan)
        ).trim().toLowerCase()

        const isiVal = parseFloat(fr.isi) || 1
        const isParentBase = satuanInduk === baseSatuan
        const parentTier = !isParentBase
          ? createdTiers.find((t) => t.namaSatuan.toLowerCase() === satuanInduk)
          : null
        const parentMultiplier = parentTier ? parentTier.multiplierToBase : 1

        let multToBase = 1
        let rasio = 1

        if (isiVal < 1) {
          // Rasio terhadap induk (contoh 0.5 = 1/2 satuan induk)
          rasio = isiVal
          multToBase = Math.max(0.001, Math.round(parentMultiplier * rasio * 1000) / 1000)
        } else {
          // Bobot langsung dalam satuan dasar (contoh 5 = 5 kg dari 1 sak)
          multToBase = isiVal
          rasio = parentMultiplier > 0 ? isiVal / parentMultiplier : 1
        }

        const hargaBeli =
          fr.hargaBeli && Number(fr.hargaBeli) > 0
            ? Number(fr.hargaBeli)
            : Math.round(baseHargaBeli * multToBase)

        const hargaJual =
          fr.hargaJual && Number(fr.hargaJual) > 0
            ? Number(fr.hargaJual)
            : hargaBeli > 0
              ? Math.round(hargaBeli * 1.15)
              : Math.round(baseHargaJual * multToBase)

        const marginPersen =
          hargaBeli > 0 ? Math.round(((hargaJual - hargaBeli) / hargaBeli) * 100 * 10) / 10 : 0

        createdTiers.push({
          id: `STB-FRAC-IMP-${Date.now()}-${pIdx}-${fIdx + 1}`,
          namaSatuan: namaPecahan,
          satuanTurunan: baseSatuan,
          isi: multToBase,
          multiplierToBase: multToBase,
          hargaBeli,
          marginPersen,
          hargaJual,
          isPecahan: true,
          indukSatuan: satuanInduk,
          rasio,
        })
      })

      return {
        rowNumber: m.lineNo,
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
      }
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
      const content = String(reader.result ?? '')
      setRawText(content)
      parseData(content)
    }
    reader.readAsText(file)
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
    setFileName('contoh-data.xls')
    setFileSize('1.8 KB')
    parseData(CONTOH_TEXT)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Impor Produk Massal (.xls)"
        deskripsi="Impor produk dalam format Excel (.xls) dengan dukungan Satuan Bertingkat (maks. 4 tingkat) dan Pecahan (maks. 4 pecahan)."
        aksi={
          <Button variant="secondary" onClick={unduhTemplate} className="gap-2">
            <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Unduh Template .XLS
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom 1 & 2: Unggah Berkas & Editor */}
        <Card
          title="1. Unggah Berkas Excel (.xls) atau Teks"
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
              accept=".xls,.xlsx,.csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm transition-transform group-hover:scale-105">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Klik untuk memilih berkas Excel (.xls) atau seret ke sini
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Format yang didukung: <span className="font-medium text-slate-700">.xls</span> (Excel XML / Spreadsheet), <span className="font-medium text-slate-700">.csv</span>
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
        <Card title="Aturan Format Bertingkat" subtitle="Struktur baris untuk multi-satuan & pecahan">
          <div className="space-y-4 text-xs text-slate-600">
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
              <div className="font-semibold text-blue-900">Format Baris Bertingkat</div>
              <p className="mt-1 leading-relaxed text-blue-800">
                Setiap item dimulai dengan baris <code className="rounded bg-blue-100 px-1 font-mono text-blue-900">produk</code>, diikuti baris <code className="rounded bg-blue-100 px-1 font-mono text-blue-900">satuan</code> atau <code className="rounded bg-blue-100 px-1 font-mono text-blue-900">pecahan</code>.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">jenis</span>
                <span>
                  <strong>produk</strong> (induk), <strong>satuan</strong> (tingkat satuan, maks. 4), atau <strong>pecahan</strong> (kemasan eceran, maks. 4).
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">satuan</span>
                <span>Satuan dasar produk (cth: kg, pcs) atau nama tingkat satuan (cth: sak, renceng).</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">satuan_induk</span>
                <span>Satuan acuan di bawahnya (cth: renceng mengacu ke pcs, karton mengacu ke renceng).</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">isi</span>
                <span>
                  Pengali isi. Pada pecahan: desimal &lt; 1 adalah rasio induk (cth: 0.5 = 1/2 sak), angka &ge; 1 adalah bobot satuan dasar (cth: 5 = 5 kg).
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
              <strong>Batasan:</strong> Maksimal 4 tingkat satuan dan 4 pecahan untuk tiap produk.
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
                header: 'Satuan Bertingkat (Maks. 4)',
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
                header: 'Pecahan / Eceran (Maks. 4)',
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
