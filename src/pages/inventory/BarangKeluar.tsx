import { useMemo, useState } from 'react'
import type { BarangKeluar as TBarangKeluar, KategoriBarangKeluar, ResolusiRetur } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah, tanggalJam } from '@/lib/format'
import { cetakSuratJalanBarangKeluar } from '@/lib/print'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select, StatCard, Textarea } from '@/components/ui'

type BarisItem = {
  produkId: string
  qty: number
  satuan: string
  hargaBeli: number
  alasan: string
}

export function BarangKeluar() {
  const { daftarBarangKeluar, produk, supplier, catatBarangKeluarBaru, selesaikanReturBarang, hapusBarangKeluar } =
    useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  // Filter & Search
  const [tabFilter, setTabFilter] = useState<'semua' | 'cacat' | 'retur_aktif' | 'retur_selesai'>('semua')
  const [cari, setCari] = useState('')

  // Modal Catat Barang Keluar
  const [modalCatat, setModalCatat] = useState(false)
  const [kategori, setKategori] = useState<KategoriBarangKeluar>('cacat')
  const [supplierId, setSupplierId] = useState(supplier[0]?.id ?? '')
  const [catatan, setCatatan] = useState('')
  const [barisItems, setBarisItems] = useState<BarisItem[]>([])

  // Modal Selesaikan Retur
  const [modalSelesaiRetur, setModalSelesaiRetur] = useState(false)
  const [returTerpilih, setReturTerpilih] = useState<TBarangKeluar | null>(null)
  const [resolusi, setResolusi] = useState<ResolusiRetur>('ganti_barang')
  const [catatanResolusi, setCatatanResolusi] = useState('')

  // Modal Detail
  const [modalDetail, setModalDetail] = useState(false)
  const [detailTerpilih, setDetailTerpilih] = useState<TBarangKeluar | null>(null)

  // Inisialisasi baris pertama saat modal catat dibuka
  const bukaModalCatat = (kat: KategoriBarangKeluar = 'cacat') => {
    setKategori(kat)
    const p0 = produk[0]
    setBarisItems([
      {
        produkId: p0?.id ?? '',
        qty: 1,
        satuan: p0?.satuan || 'pcs',
        hargaBeli: p0?.hargaBeli || 0,
        alasan: kat === 'cacat' ? 'Kemasan rusak / bocor' : 'Barang cacat pabrik',
      },
    ])
    setCatatan('')
    setModalCatat(true)
  }

  const tambahBaris = () => {
    const p = produk[0]
    setBarisItems([
      ...barisItems,
      {
        produkId: p?.id ?? '',
        qty: 1,
        satuan: p?.satuan || 'pcs',
        hargaBeli: p?.hargaBeli || 0,
        alasan: '',
      },
    ])
  }

  const ubahBaris = (idx: number, patch: Partial<BarisItem>) => {
    setBarisItems(
      barisItems.map((b, i) => {
        if (i !== idx) return b
        const updated = { ...b, ...patch }
        if (patch.produkId) {
          const p = produk.find((prod) => prod.id === patch.produkId)
          if (p) {
            updated.satuan = p.satuan || 'pcs'
            updated.hargaBeli = p.hargaBeli || 0
          }
        }
        return updated
      }),
    )
  }

  const hapusBaris = (idx: number) => {
    if (barisItems.length === 1) {
      push({ tipe: 'error', judul: 'Minimal harus ada 1 item barang' })
      return
    }
    setBarisItems(barisItems.filter((_, i) => i !== idx))
  }

  // Hitung total estimasi nilai
  const totalNilaiInput = barisItems.reduce((sum, it) => sum + it.qty * it.hargaBeli, 0)
  const totalQtyInput = barisItems.reduce((sum, it) => sum + Number(it.qty || 0), 0)

  // Submit Catat Barang Keluar
  const handleSimpanBarangKeluar = () => {
    if (kategori === 'retur' && !supplierId) {
      push({ tipe: 'error', judul: 'Pilih Supplier', pesan: 'Untuk retur barang ke supplier, data supplier wajib dipilih.' })
      return
    }

    if (barisItems.length === 0) {
      push({ tipe: 'error', judul: 'Belum ada item', pesan: 'Tambahkan minimal 1 item barang.' })
      return
    }

    // Validasi stok
    for (const b of barisItems) {
      const p = produk.find((prod) => prod.id === b.produkId)
      if (!p) {
        push({ tipe: 'error', judul: 'Produk tidak valid' })
        return
      }
      if (b.qty <= 0) {
        push({ tipe: 'error', judul: 'Jumlah tidak valid', pesan: `Kuantitas ${p.nama} harus lebih dari 0.` })
        return
      }
      if (b.qty > p.stok) {
        push({
          tipe: 'error',
          judul: 'Stok tidak mencukupi',
          pesan: `Stok ${p.nama} saat ini hanya ${p.stok} ${p.satuan}. Tidak bisa mengeluarkan ${b.qty}.`,
        })
        return
      }
    }

    const res = catatBarangKeluarBaru({
      kategori,
      supplierId: kategori === 'retur' ? supplierId : undefined,
      items: barisItems.map((b) => ({
        produkId: b.produkId,
        qty: b.qty,
        satuan: b.satuan,
        alasan: b.alasan,
      })),
      catatan,
      userId: currentUser?.id ?? 'USR-01',
    })

    if (kategori === 'cacat') {
      push({
        tipe: 'sukses',
        judul: 'Barang Cacat Berhasil Dicatat',
        pesan: `No. ${res.nomor}. Nilai kerugian ${rupiah(res.totalNilai)} otomatis dicatat ke Pengeluaran Toko.`,
      })
    } else {
      push({
        tipe: 'sukses',
        judul: 'Retur Supplier Berhasil Dicatat',
        pesan: `No. ${res.nomor}. Status proses retur ke supplier. Stok dapat dikembalikan saat retur selesai.`,
      })
    }

    setModalCatat(false)
  }

  // Buka Modal Selesaikan Retur
  const bukaModalSelesaiRetur = (bk: TBarangKeluar) => {
    setReturTerpilih(bk)
    setResolusi('ganti_barang')
    setCatatanResolusi('')
    setModalSelesaiRetur(true)
  }

  // Submit Selesaikan Retur
  const handleSimpanSelesaiRetur = () => {
    if (!returTerpilih) return
    selesaikanReturBarang({
      id: returTerpilih.id,
      resolusi,
      catatan: catatanResolusi,
      userId: currentUser?.id ?? 'USR-01',
    })

    if (resolusi === 'ganti_barang') {
      push({
        tipe: 'sukses',
        judul: 'Retur Selesai & Stok Dikembalikan',
        pesan: `Barang pengganti telah diterima. Stok produk telah otomatis ditambahkan kembali ke inventori.`,
      })
    } else if (resolusi === 'potong_hutang') {
      push({
        tipe: 'sukses',
        judul: 'Retur Selesai (Potong Hutang)',
        pesan: `Nilai retur ${rupiah(returTerpilih.totalNilai)} telah dipotong dari saldo hutang supplier.`,
      })
    } else {
      push({
        tipe: 'sukses',
        judul: 'Retur Selesai (Kembali Dana)',
        pesan: `Pengembalian dana tunai/transfer supplier telah dikonfirmasi selesai.`,
      })
    }

    setModalSelesaiRetur(false)
  }

  // Cetak Dokumen
  const handleCetak = (bk: TBarangKeluar) => {
    const sup = supplier.find((s) => s.id === bk.supplierId)
    cetakSuratJalanBarangKeluar({
      nomor: bk.nomor,
      kategori: bk.kategori,
      supplierNama: sup?.nama,
      supplierKontak: sup?.kontak,
      supplierTelepon: sup?.telepon,
      tanggal: tanggalJam(bk.tanggalKeluar),
      petugas: currentUser?.nama || 'Admin Toko',
      status:
        bk.status === 'selesai'
          ? 'SELESAI (AFKIR)'
          : bk.status === 'proses_retur'
            ? 'MENUNGGU PENGGANTIAN'
            : 'RETUR SELESAI',
      catatan: bk.catatan,
      items: bk.items.map((it) => ({
        namaProduk: it.namaProduk,
        sku: it.sku,
        qty: it.qty,
        satuan: it.satuan,
        hargaBeli: it.hargaBeli,
        subtotal: it.subtotal,
        alasan: it.alasan,
      })),
      totalNilai: bk.totalNilai,
    })
  }

  // Filter Data
  const listData = useMemo(() => {
    return daftarBarangKeluar || []
  }, [daftarBarangKeluar])

  const filteredData = useMemo(() => {
    const q = cari.toLowerCase().trim()
    return listData.filter((item) => {
      // Tab filter
      if (tabFilter === 'cacat' && item.kategori !== 'cacat') return false
      if (tabFilter === 'retur_aktif' && !(item.kategori === 'retur' && item.status === 'proses_retur')) return false
      if (tabFilter === 'retur_selesai' && !(item.kategori === 'retur' && item.status === 'selesai_retur')) return false

      // Search filter
      if (!q) return true
      const sup = supplier.find((s) => s.id === item.supplierId)?.nama ?? ''
      const adaItem = item.items.some(
        (it) => it.namaProduk.toLowerCase().includes(q) || (it.alasan && it.alasan.toLowerCase().includes(q)),
      )
      return item.nomor.toLowerCase().includes(q) || sup.toLowerCase().includes(q) || adaItem
    })
  }, [listData, tabFilter, cari, supplier])

  // Statistics
  const statTotalDokumen = listData.length
  const statKerugianCacat = listData
    .filter((x) => x.kategori === 'cacat')
    .reduce((sum, item) => sum + item.totalNilai, 0)
  const statReturBerjalan = listData.filter((x) => x.kategori === 'retur' && x.status === 'proses_retur').length
  const statReturSelesai = listData.filter((x) => x.kategori === 'retur' && x.status === 'selesai_retur').length

  const countCacat = listData.filter((x) => x.kategori === 'cacat').length

  return (
    <>
      <PageHeader
        judul="Barang Keluar (Cacat & Retur)"
        deskripsi="Manajemen barang cacat/rusak (otomatis tercatat di beban pengeluaran) dan retur ke supplier (stok kembali saat retur selesai)."
        aksi={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => bukaModalCatat('retur')}
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <svg className="w-4 h-4 mr-1 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H4m0 0l4-4m-4 4l4 4" />
              </svg>
              + Retur ke Supplier
            </Button>
            <Button onClick={() => bukaModalCatat('cacat')} className="bg-rose-600 hover:bg-rose-700">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              + Catat Barang Cacat
            </Button>
          </div>
        }
      />

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard
          label="Total Dokumen Keluar"
          value={statTotalDokumen}
          hint={`${countCacat} cacat, ${statReturBerjalan + statReturSelesai} retur`}
        />
        <StatCard
          label="Kerugian Barang Cacat"
          value={<span className="text-rose-600">{rupiah(statKerugianCacat)}</span>}
          hint="Tercatat di Beban Operasional"
        />
        <StatCard
          label="Retur Berjalan"
          value={<span className="text-amber-600">{statReturBerjalan} Dokumen</span>}
          hint="Menunggu penggantian barang/dana"
        />
        <StatCard
          label="Retur Selesai"
          value={<span className="text-emerald-600">{statReturSelesai} Dokumen</span>}
          hint="Stok kembali / hutang terpotong"
        />
      </div>

      {/* Main Content Card */}
      <Card
        title="Daftar Dokumen Barang Keluar"
        subtitle="Pantau alur barang rusak/afkir dan status klaim retur barang ke supplier"
        action={<FR kode="FR-INV-04" />}
      >
        {/* Filter Tabs and Search Bar */}
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setTabFilter('semua')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                tabFilter === 'semua' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({listData.length})
            </button>
            <button
              onClick={() => setTabFilter('cacat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                tabFilter === 'cacat'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Barang Cacat ({countCacat})
            </button>
            <button
              onClick={() => setTabFilter('retur_aktif')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                tabFilter === 'retur_aktif'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Retur Menunggu ({statReturBerjalan})
            </button>
            <button
              onClick={() => setTabFilter('retur_selesai')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                tabFilter === 'retur_selesai'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Retur Selesai ({statReturSelesai})
            </button>
          </div>

          <div className="w-full sm:w-72">
            <Input
              type="text"
              placeholder="Cari no. dokumen, barang, supplier..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Table View */}
        <DataTable
          data={filteredData}
          kolom={[
            {
              key: 'nomor',
              header: 'No. Dokumen & Tanggal',
              render: (row) => (
                <div>
                  <button
                    onClick={() => {
                      setDetailTerpilih(row)
                      setModalDetail(true)
                    }}
                    className="font-bold text-brand-600 hover:underline hover:text-brand-800 text-left block"
                  >
                    {row.nomor}
                  </button>
                  <div className="text-[11px] text-slate-500 mt-0.5">{tanggalJam(row.tanggalKeluar)}</div>
                </div>
              ),
            },
            {
              key: 'kategori',
              header: 'Kategori & Pihak Terkait',
              render: (row) => {
                const sup = supplier.find((s) => s.id === row.supplierId)
                if (row.kategori === 'cacat') {
                  return (
                    <div>
                      <Badge warna="red" className="font-semibold">
                        Cacat / Rusak
                      </Badge>
                      <div className="text-[11px] text-slate-500 mt-1">Beban Afkir Toko</div>
                    </div>
                  )
                }
                return (
                  <div>
                    <Badge warna="amber" className="font-semibold">
                      Retur Supplier
                    </Badge>
                    <div className="text-xs font-medium text-slate-800 mt-1">
                      {sup ? sup.nama : 'Supplier Tidak Diketahui'}
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'items',
              header: 'Rincian Barang',
              render: (row) => (
                <div className="max-w-xs space-y-1">
                  {row.items.slice(0, 2).map((it, idx) => (
                    <div key={idx} className="text-xs text-slate-700 flex items-start gap-1">
                      <span className="font-semibold text-slate-900">
                        {it.qty} {it.satuan}
                      </span>{' '}
                      <span>{it.namaProduk}</span>
                      {it.alasan && <span className="text-[11px] text-slate-400 italic">({it.alasan})</span>}
                    </div>
                  ))}
                  {row.items.length > 2 && (
                    <div className="text-[11px] text-brand-600 font-medium cursor-pointer" onClick={() => { setDetailTerpilih(row); setModalDetail(true); }}>
                      +{row.items.length - 2} item lainnya...
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'total',
              header: 'Total Nilai (HPP)',
              align: 'right',
              render: (row) => (
                <div className="text-right">
                  <div className="font-bold text-slate-900">{rupiah(row.totalNilai)}</div>
                  {row.kategori === 'cacat' && (
                    <span className="inline-block mt-0.5 text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                      Tercatat di Pengeluaran
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status & Resolusi',
              render: (row) => {
                if (row.kategori === 'cacat') {
                  return (
                    <div>
                      <Badge warna="slate">Selesai (Afkir)</Badge>
                      <div className="text-[11px] text-slate-400 mt-0.5">Stok keluar permanen</div>
                    </div>
                  )
                }

                if (row.status === 'proses_retur') {
                  return (
                    <div>
                      <Badge warna="amber">Menunggu Retur</Badge>
                      <div className="text-[11px] text-amber-700 font-medium mt-0.5 animate-pulse">
                        Menunggu Penggantian
                      </div>
                    </div>
                  )
                }

                return (
                  <div>
                    <Badge warna="green">Retur Selesai</Badge>
                    <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      {row.resolusiRetur === 'ganti_barang'
                        ? 'Ganti Barang (+Stok Balik)'
                        : row.resolusiRetur === 'potong_hutang'
                          ? 'Potong Tagihan Hutang'
                          : 'Kembali Dana Tunai'}
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'aksi',
              header: 'Aksi',
              align: 'right',
              render: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                  {row.kategori === 'retur' && row.status === 'proses_retur' && (
                    <Button
                      size="sm"
                      onClick={() => bukaModalSelesaiRetur(row)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Selesaikan Retur
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCetak(row)}
                    title="Cetak Surat Jalan / Bukti Barang Keluar"
                    className="p-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        confirm(
                          `Hapus dokumen ${row.nomor}? ${
                            row.kategori === 'cacat' ? 'Catatan pengeluaran terkait juga akan dihapus.' : ''
                          }`,
                        )
                      ) {
                        hapusBarangKeluar(row.id)
                        push({ tipe: 'sukses', judul: `Dokumen ${row.nomor} dihapus` })
                      }
                    }}
                    title="Hapus Dokumen"
                    className="p-1.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              ),
            },
          ]}
          kosong="Belum ada data barang keluar yang sesuai filter"
        />
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT BARANG KELUAR (CACAT / RETUR)                             */}
      {/* ========================================================================= */}
      <Modal
        open={modalCatat}
        onClose={() => setModalCatat(false)}
        title={kategori === 'cacat' ? 'Catat Barang Cacat / Rusak' : 'Catat Retur Barang ke Supplier'}
        lebar="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalCatat(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSimpanBarangKeluar}
              className={kategori === 'cacat' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700'}
            >
              Simpan & Keluarkan Stok
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Category Switcher Cards */}
          <div>
            <Label>Kategori Barang Keluar</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div
                onClick={() => setKategori('cacat')}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start gap-3 ${
                  kategori === 'cacat'
                    ? 'border-rose-500 bg-rose-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    kategori === 'cacat' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    Barang Cacat / Rusak
                    {kategori === 'cacat' && <Badge warna="red">Dipilih</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Stok keluar permanen. Nilai harga modal otomatis tercatat ke <b>Pengeluaran Toko</b>.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setKategori('retur')}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start gap-3 ${
                  kategori === 'retur'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    kategori === 'retur' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    Retur ke Supplier
                    {kategori === 'retur' && <Badge warna="amber">Dipilih</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Stok keluar sementara. Saat retur selesai, stok produk <b>dapat dikembalikan</b> otomatis.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Selector (Mandatory for Retur, Optional for Cacat) */}
          {kategori === 'retur' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 animate-fade-in">
              <Label htmlFor="supplier" className="text-amber-900 font-semibold">
                Tujuan Supplier Retur <span className="text-rose-500">*</span>
              </Label>
              <Select id="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {supplier.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.kontak} - {s.telepon})
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-amber-700 mt-1">
                Barang akan diklaim penggantiannya kepada supplier yang dipilih.
              </p>
            </div>
          )}

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-800 font-semibold mb-0">Rincian Barang yang Dikeluarkan</Label>
              <Button size="sm" variant="secondary" onClick={tambahBaris} className="text-xs py-1">
                + Tambah Baris Produk
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Produk</th>
                    <th className="p-2.5 w-24 text-center">Stok Sisa</th>
                    <th className="p-2.5 w-24">Jumlah</th>
                    <th className="p-2.5 w-24 text-right">Harga Modal</th>
                    <th className="p-2.5 w-28 text-right">Subtotal</th>
                    <th className="p-2.5 w-40">Alasan / Kerusakan</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {barisItems.map((baris, idx) => {
                    const prod = produk.find((p) => p.id === baris.produkId)
                    const stokAda = prod?.stok ?? 0
                    const isExceed = baris.qty > stokAda

                    return (
                      <tr key={idx} className={isExceed ? 'bg-rose-50/50' : ''}>
                        <td className="p-2">
                          <Select
                            value={baris.produkId}
                            onChange={(e) => ubahBaris(idx, { produkId: e.target.value })}
                            className="text-xs py-1"
                          >
                            {produk.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} ({p.sku})
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded ${
                              stokAda <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {stokAda} {baris.satuan}
                          </span>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            max={stokAda}
                            value={baris.qty}
                            onChange={(e) => ubahBaris(idx, { qty: Math.max(1, parseInt(e.target.value) || 0) })}
                            className={`text-xs py-1 text-center font-bold ${
                              isExceed ? 'border-rose-500 text-rose-600 focus:ring-rose-200' : ''
                            }`}
                          />
                          {isExceed && <div className="text-[10px] text-rose-600 mt-0.5">Melebihi stok!</div>}
                        </td>
                        <td className="p-2 text-right text-slate-600 font-medium">
                          {rupiah(baris.hargaBeli)}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-800">
                          {rupiah(baris.qty * baris.hargaBeli)}
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            placeholder="Alasan cacat/retur..."
                            value={baris.alasan}
                            onChange={(e) => ubahBaris(idx, { alasan: e.target.value })}
                            className="text-xs py-1"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => hapusBaris(idx)}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                            title="Hapus baris"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ringkasan & Peringatan Otomatis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div className="font-semibold text-slate-700 mb-1">Dampak Terhadap Sistem:</div>
              {kategori === 'cacat' ? (
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    Stok sebesar <b>{totalQtyInput} unit</b> akan langsung dipotong dari inventori.
                  </li>
                  <li>
                    Nilai kerugian <b className="text-rose-600">{rupiah(totalNilaiInput)}</b> akan{' '}
                    <b>otomatis tercatat di Laporan Pengeluaran</b> (Beban Operasional Kasir).
                  </li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    Stok sebesar <b>{totalQtyInput} unit</b> akan dikeluarkan sementara ke supplier.
                  </li>
                  <li>
                    Status dokumen menjadi <b>Menunggu Retur</b>.
                  </li>
                  <li>
                    Saat salesman mengganti barang, klik tombol <b>Selesaikan Retur</b> agar stok otomatis bertambah kembali.
                  </li>
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total Barang Dikeluarkan:</span>
                <span className="font-bold text-slate-800">{totalQtyInput} item / unit</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Estimasi Total Nilai (HPP):</span>
                <span className="text-base font-extrabold text-slate-900">{rupiah(totalNilaiInput)}</span>
              </div>
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <Label htmlFor="catatan">Catatan Tambahan (Opsional)</Label>
            <Textarea
              id="catatan"
              rows={2}
              placeholder="Contoh: Titip ke salesman Budi untuk diganti minggu depan, atau kardus penyok saat bongkar muat."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: SELESAIKAN RETUR                                                */}
      {/* ========================================================================= */}
      <Modal
        open={modalSelesaiRetur}
        onClose={() => setModalSelesaiRetur(false)}
        title={`Selesaikan Klaim Retur (${returTerpilih?.nomor || ''})`}
        lebar="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalSelesaiRetur(false)}>
              Batal
            </Button>
            <Button onClick={handleSimpanSelesaiRetur} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Konfirmasi Selesai
            </Button>
          </>
        }
      >
        {returTerpilih && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Retur:</span>
                <span className="font-bold text-slate-800">{returTerpilih.nomor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold text-slate-800">
                  {supplier.find((s) => s.id === returTerpilih.supplierId)?.nama || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Nilai Barang:</span>
                <span className="font-bold text-slate-900">{rupiah(returTerpilih.totalNilai)}</span>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-semibold mb-2">Pilih Bentuk Kompensasi / Resolusi:</Label>
              <div className="space-y-2.5">
                <label
                  onClick={() => setResolusi('ganti_barang')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    resolusi === 'ganti_barang'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolusi"
                    checked={resolusi === 'ganti_barang'}
                    onChange={() => setResolusi('ganti_barang')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                      Ganti Barang Baru (Rekomendasi)
                      <Badge warna="green">Stok Masuk Kembali</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Supplier memberikan fisik barang baru sebagai pengganti. Stok produk akan{' '}
                      <b>otomatis dikembalikan bertambah</b> ke toko.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setResolusi('potong_hutang')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    resolusi === 'potong_hutang'
                      ? 'border-brand-500 bg-brand-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolusi"
                    checked={resolusi === 'potong_hutang'}
                    onChange={() => setResolusi('potong_hutang')}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">Potong Hutang Supplier</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tidak ada fisik barang pengganti. Nilai retur dipotong dari tagihan/saldo hutang berjalan toko ke supplier terkait.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setResolusi('kembali_dana')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    resolusi === 'kembali_dana'
                      ? 'border-brand-500 bg-brand-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolusi"
                    checked={resolusi === 'kembali_dana'}
                    onChange={() => setResolusi('kembali_dana')}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">Pengembalian Dana Kas / Transfer</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Supplier mengembalikan dana dalam bentuk uang tunai atau transfer rekening ke kas toko.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="catatanResolusi">Keterangan Penyelesaian (Opsional)</Label>
              <Input
                id="catatanResolusi"
                type="text"
                placeholder="Contoh: Diterima oleh staf gudang Riko, kondisi barang baik."
                value={catatanResolusi}
                onChange={(e) => setCatatanResolusi(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: DETAIL TRANSAKSI BARANG KELUAR                                   */}
      {/* ========================================================================= */}
      <Modal
        open={modalDetail}
        onClose={() => setModalDetail(false)}
        title={`Detail Dokumen ${detailTerpilih?.nomor || ''}`}
        lebar="max-w-2xl"
        footer={
          detailTerpilih && (
            <div className="flex justify-between w-full">
              <Button variant="secondary" onClick={() => handleCetak(detailTerpilih)}>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Dokumen
              </Button>
              <Button onClick={() => setModalDetail(false)}>Tutup</Button>
            </div>
          )
        }
      >
        {detailTerpilih && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">Kategori</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {detailTerpilih.kategori === 'cacat' ? 'Barang Cacat / Rusak' : 'Retur ke Supplier'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Waktu Pencatatan</span>
                <span className="font-semibold text-slate-800">{tanggalJam(detailTerpilih.tanggalKeluar)}</span>
              </div>
              {detailTerpilih.supplierId && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Supplier Terkait</span>
                  <span className="font-semibold text-slate-800">
                    {supplier.find((s) => s.id === detailTerpilih.supplierId)?.nama || '-'}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-semibold text-slate-800">
                  {detailTerpilih.status === 'selesai'
                    ? 'Selesai (Afkir Toko)'
                    : detailTerpilih.status === 'proses_retur'
                      ? 'Dalam Proses Retur'
                      : 'Retur Selesai'}
                </span>
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700 mb-1.5">Daftar Item:</div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2">No</th>
                      <th className="p-2">Produk</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Harga Beli</th>
                      <th className="p-2 text-right">Subtotal</th>
                      <th className="p-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailTerpilih.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-800">{it.namaProduk}</td>
                        <td className="p-2 text-center font-bold">
                          {it.qty} {it.satuan}
                        </td>
                        <td className="p-2 text-right">{rupiah(it.hargaBeli)}</td>
                        <td className="p-2 text-right font-semibold text-slate-900">{rupiah(it.subtotal)}</td>
                        <td className="p-2 text-slate-500 italic">{it.alasan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-2 text-right text-slate-700">
                        Total Nilai (HPP):
                      </td>
                      <td className="p-2 text-right text-brand-700">{rupiah(detailTerpilih.totalNilai)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {detailTerpilih.catatan && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Catatan:</span>
                <span className="text-slate-700">{detailTerpilih.catatan}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
