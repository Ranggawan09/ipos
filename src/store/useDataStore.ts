import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  BarangKeluar,
  HutangSupplier,
  Kategori,
  KategoriBarangKeluar,
  LogSinkron,
  PenerimaanBarang,
  Pengemasan,
  PergerakanStok,
  Pengeluaran,
  Produk,
  ResepKonversi,
  ResolusiRetur,
  Shift,
  Supplier,
  Transaksi,
  User,
} from '@/types'
import {
  buildBarangKeluar,
  buildHutang,
  buildPenerimaan,
  buildPengeluaran,
  buildPengemasan,
  buildProduk,
  buildResepKonversi,
  buildShiftDanTransaksi,
  KATEGORI_SEED,
  SUPPLIER_SEED,
  USER_SEED,
  isoDaysAgo,
} from '@/data/seed'
import { syncService } from '@/lib/syncService'
import { useToast } from './useToast'

// ---------------------------------------------------------------------------
// Data store: seluruh data bisnis. Dipersist ke localStorage dan disinkronkan
// antar-tab browser (mensimulasikan WebSocket real-time di jaringan lokal).
// ---------------------------------------------------------------------------

const initialProduk = buildProduk()
const { shifts: initialShifts, transaksi: initialTransaksi, pergerakan: initialPergerakan } =
  buildShiftDanTransaksi(initialProduk)
const initialResep = buildResepKonversi(initialProduk)
const initialPengemasan = buildPengemasan(initialProduk, initialResep)
const initialBarangKeluar = buildBarangKeluar(initialProduk, SUPPLIER_SEED)

export const DEFAULT_SATUAN = [
  'pcs',
  'kg',
  'liter',
  'gram',
  'ml',
  'karton',
  'dus',
  'pax',
  'renceng',
  'sak',
  'pack',
  'lembar',
  'bungkus',
  'botol',
  'kaleng',
  'sachet',
  'lusin',
  'kodi',
]

export type DataState = {
  users: User[]
  kategori: Kategori[]
  supplier: Supplier[]
  produk: Produk[]
  pergerakan: PergerakanStok[]
  transaksi: Transaksi[]
  shifts: Shift[]
  pengeluaran: Pengeluaran[]
  hutang: HutangSupplier[]
  penerimaan: PenerimaanBarang[]
  logSinkron: LogSinkron[]
  resepKonversi: ResepKonversi[]
  pengemasan: Pengemasan[]
  daftarSatuan: string[]
  daftarBarangKeluar: BarangKeluar[]

  // Kamus Satuan
  tambahSatuanKamus: (satuan: string) => void

  // Inventory
  simpanProduk: (p: Omit<Produk, 'id'> & { id?: string }) => Produk
  hapusProduk: (id: string) => void
  simpanKategori: (k: Omit<Kategori, 'id'> & { id?: string }) => void
  hapusKategori: (id: string) => void
  simpanSupplier: (s: Omit<Supplier, 'id'> & { id?: string }) => void
  hapusSupplier: (id: string) => void
  terimaBarang: (input: {
    supplierId: string
    items: {
      produkId: string
      qty: number
      hargaBeli: number
      satuan?: string
      satuanId?: string
      multiplier?: number
      tglExpired?: string
    }[]
    metode: 'tunai' | 'kredit'
    jatuhTempo?: string
    userId: string
  }) => void
  barangKeluar: (input: {
    produkId: string
    jumlah: number
    jenis: 'keluar_rusak' | 'keluar_hilang' | 'retur_supplier'
    keterangan: string
    userId: string
  }) => void
  catatBarangKeluarBaru: (input: {
    kategori: KategoriBarangKeluar
    supplierId?: string
    items: {
      produkId: string
      qty: number
      satuan: string
      alasan?: string
    }[]
    catatan?: string
    userId: string
  }) => BarangKeluar
  selesaikanReturBarang: (input: {
    id: string
    resolusi: ResolusiRetur
    catatan?: string
    userId: string
  }) => void
  hapusBarangKeluar: (id: string) => void
  stockOpname: (input: { produkId: string; stokFisik: number; userId: string }) => void
  importProduk: (rows: (Omit<Produk, 'id'> & { id?: string })[]) => number

  // Repack / Pengemasan
  simpanResep: (r: Omit<ResepKonversi, 'id'> & { id?: string }) => void
  hapusResep: (id: string) => void
  eksekusiPengemasan: (input: {
    resepId: string
    jumlahUnitCurah: number
    distribusi: { produkKemasanId: string; qty: number }[]
    waste: number
    userId: string
  }) => void

  // POS
  bukaShift: (kasirId: string, saldoAwal: number, shiftNomor?: 1 | 2) => Shift
  tutupShift: (shiftId: string, saldoAkhir: number) => void
  buatTransaksi: (input: {
    shiftId: string
    kasirId: string
    detail: Transaksi['detail']
    diskonNota: number
    metode: Transaksi['metode']
    dibayar: number
    status?: Transaksi['status']
  }) => Transaksi
  voidTransaksi: (id: string, adminId: string, alasan: string) => void
  returPelanggan: (input: {
    transaksiId: string
    items: { produkId: string; qty: number }[]
    userId: string
  }) => void

  // Keuangan
  simpanPengeluaran: (p: Omit<Pengeluaran, 'id'> & { id?: string }) => Pengeluaran
  hapusPengeluaran: (id: string) => void
  lunasiHutang: (id: string) => void

  // Sinkronisasi
  tambahLogSinkron: (log: Omit<LogSinkron, 'id'>) => void

  resetData: () => void
}

function freshData() {
  return {
    users: structuredClone(USER_SEED),
    kategori: structuredClone(KATEGORI_SEED),
    supplier: structuredClone(SUPPLIER_SEED),
    produk: structuredClone(initialProduk),
    pergerakan: structuredClone(initialPergerakan),
    transaksi: structuredClone(initialTransaksi),
    shifts: structuredClone(initialShifts),
    pengeluaran: structuredClone(buildPengeluaran()),
    hutang: structuredClone(buildHutang()),
    penerimaan: structuredClone(buildPenerimaan(initialProduk)),
    logSinkron: [
      {
        id: 'SYNC-0001',
        waktu: isoDaysAgo(0, 7, 0),
        jenis: 'cloud' as const,
        jumlahData: initialTransaksi.length,
        keterangan: 'Sinkronisasi otomatis ke basis data cloud',
        status: 'sukses' as const,
      },
    ],
    resepKonversi: structuredClone(initialResep),
    pengemasan: structuredClone(initialPengemasan),
    daftarSatuan: [...DEFAULT_SATUAN],
    daftarBarangKeluar: structuredClone(initialBarangKeluar),
  }
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      ...freshData(),

      tambahSatuanKamus: (satuan) => {
        const s = satuan.trim().toLowerCase()
        if (!s) return
        const current = get().daftarSatuan || DEFAULT_SATUAN
        if (!current.includes(s)) {
          set({ daftarSatuan: [...current, s] })
        }
      },

      simpanProduk: (p) => {
        const list = get().produk
        if (p.id) {
          const updated = { ...(p as Produk) }
          set({ produk: list.map((x) => (x.id === p.id ? updated : x)) })
          return updated
        }
        const nextNum = list.length + 1
        const created: Produk = {
          ...(p as Produk),
          id: `PRD-${String(nextNum).padStart(4, '0')}-${Math.random().toString(36).slice(2, 6)}`,
        }
        set({ produk: [created, ...list] })
        return created
      },

      hapusProduk: (id) => set({ produk: get().produk.filter((p) => p.id !== id) }),

      simpanKategori: (k) => {
        const list = get().kategori
        if (k.id) set({ kategori: list.map((x) => (x.id === k.id ? (k as Kategori) : x)) })
        else
          set({
            kategori: [
              ...list,
              { ...(k as Kategori), id: `KAT-${String(list.length + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 5)}` },
            ],
          })
      },
      hapusKategori: (id) => set({ kategori: get().kategori.filter((k) => k.id !== id) }),

      simpanSupplier: (s) => {
        const list = get().supplier
        if (s.id) set({ supplier: list.map((x) => (x.id === s.id ? (s as Supplier) : x)) })
        else
          set({
            supplier: [
              ...list,
              { ...(s as Supplier), id: `SUP-${String(list.length + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 5)}` },
            ],
          })
      },
      hapusSupplier: (id) => set({ supplier: get().supplier.filter((s) => s.id !== id) }),

      terimaBarang: ({ supplierId, items, metode, jatuhTempo, userId }) => {
        const produks = get().produk
        const now = new Date().toISOString()
        const pergerakanBaru: PergerakanStok[] = []
        const produksBaru = produks.map((p) => ({ ...p }))

        items.forEach((item, idx) => {
          const p = produksBaru.find((x) => x.id === item.produkId)
          if (!p) return
          const mult = item.multiplier || 1
          const stokMasuk = item.qty * mult
          const sebelum = p.stok
          p.stok = sebelum + stokMasuk

          if (item.tglExpired) {
            p.tglExpired = item.tglExpired
          }

          const satuanKet = item.satuan && item.satuan !== p.satuan
            ? `${item.qty} ${item.satuan} (${stokMasuk} ${p.satuan || 'pcs'})`
            : `${stokMasuk} ${p.satuan || 'pcs'}`

          const expKet = item.tglExpired ? ` [Exp: ${item.tglExpired}]` : ''

          pergerakanBaru.push({
            id: `MOV-IN-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'masuk',
            jumlah: stokMasuk,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: `Penerimaan barang dari supplier: ${satuanKet}${expKet}`,
            userId,
            waktu: now,
          })
        })

        const total = items.reduce((a, i) => a + i.qty * i.hargaBeli, 0)
        const nomor = `BM/${String(get().penerimaan.length + 1).padStart(4, '0')}/2026`
        const penerimaan: PenerimaanBarang = {
          id: `RCV-${Date.now()}`,
          nomor,
          supplierId,
          items: items.map((i) => {
            const p = produks.find((x) => x.id === i.produkId)!
            const mult = i.multiplier || 1
            return {
              produkId: i.produkId,
              namaProduk: p?.nama ?? '-',
              qty: i.qty,
              hargaBeli: i.hargaBeli,
              satuan: i.satuan || p?.satuan || 'pcs',
              satuanId: i.satuanId,
              multiplier: mult,
              jumlahStokMasuk: i.qty * mult,
              tglExpired: i.tglExpired,
            }
          }),
          total,
          metode,
          jatuhTempo,
          userId,
          waktu: now,
        }

        const hutangBaru = [...get().hutang]
        if (metode === 'kredit') {
          hutangBaru.unshift({
            id: `HTG-${Date.now()}`,
            supplierId,
            nomorFaktur: nomor,
            jumlah: total,
            sisa: total,
            jatuhTempo: jatuhTempo ?? isoDaysAgo(-30),
            status: 'belum_lunas',
            tanggal: now,
          })
        }

        set({
          produk: produksBaru,
          pergerakan: [...pergerakanBaru, ...get().pergerakan],
          penerimaan: [penerimaan, ...get().penerimaan],
          hutang: hutangBaru,
        })
      },

      barangKeluar: ({ produkId, jumlah, jenis, keterangan, userId }) => {
        const produks = get().produk.map((p) => ({ ...p }))
        const p = produks.find((x) => x.id === produkId)
        if (!p) return
        const sebelum = p.stok
        p.stok = Math.max(0, sebelum - jumlah)
        const mov: PergerakanStok = {
          id: `MOV-OUT-${Date.now()}`,
          produkId,
          jenis,
          jumlah: -jumlah,
          stokSebelum: sebelum,
          stokSesudah: p.stok,
          keterangan,
          userId,
          waktu: new Date().toISOString(),
        }
        set({ produk: produks, pergerakan: [mov, ...get().pergerakan] })
        syncService.broadcastStockMutation(
          [{ produkId, namaProduk: p.nama, qty: jumlah, sisaStok: p.stok }],
          'Gudang / Keluar',
        )
      },

      catatBarangKeluarBaru: (input) => {
        const produks = get().produk.map((p) => ({ ...p }))
        const pergerakanBaru: PergerakanStok[] = []
        const now = new Date().toISOString()
        const yyyymm = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`
        const count = (get().daftarBarangKeluar || []).length + 1
        const nomor = `BK-${yyyymm}-${String(count).padStart(4, '0')}`
        const id = `BK-${Date.now()}`

        const detailedItems = []
        const broadcastItems = []

        for (const itemInput of input.items) {
          const p = produks.find((x) => x.id === itemInput.produkId)
          if (!p) continue

          const qty = Number(itemInput.qty) || 0
          const hargaBeli = p.hargaBeli || 0
          const subtotal = hargaBeli * qty
          const stokSebelum = p.stok
          p.stok = Math.max(0, stokSebelum - qty)

          detailedItems.push({
            produkId: p.id,
            namaProduk: p.nama,
            sku: p.sku,
            qty,
            satuan: itemInput.satuan || p.satuan,
            hargaBeli,
            subtotal,
            alasan: itemInput.alasan || '',
          })

          const jenisMov = input.kategori === 'cacat' ? ('keluar_rusak' as const) : ('retur_supplier' as const)
          const ketMov =
            input.kategori === 'cacat'
              ? `Barang cacat/rusak (${nomor}): ${itemInput.alasan || p.nama}`
              : `Retur barang ke supplier (${nomor}): ${itemInput.alasan || p.nama}`

          pergerakanBaru.push({
            id: `MOV-BK-${Date.now()}-${p.id}`,
            produkId: p.id,
            jenis: jenisMov,
            jumlah: -qty,
            stokSebelum,
            stokSesudah: p.stok,
            keterangan: ketMov,
            userId: input.userId,
            waktu: now,
          })

          broadcastItems.push({
            produkId: p.id,
            namaProduk: p.nama,
            qty,
            sisaStok: p.stok,
          })
        }

        const totalNilai = detailedItems.reduce((acc, item) => acc + item.subtotal, 0)
        let pengeluaranId: string | undefined = undefined

        // Kategori CACAT: otomatis catat ke pengeluaran toko
        if (input.kategori === 'cacat' && totalNilai > 0) {
          const ringkasanItem = detailedItems.map((it) => `${it.namaProduk} (${it.qty} ${it.satuan})`).join(', ')
          const savedExp = get().simpanPengeluaran({
            kategori: 'operasional_kasir',
            keterangan: `Barang Cacat/Rusak (${nomor}): ${ringkasanItem}`,
            jumlah: totalNilai,
            tanggal: now,
            userId: input.userId,
            items: detailedItems.map((it) => ({
              nama: it.namaProduk,
              qty: it.qty,
              harga: it.hargaBeli,
              subtotal: it.subtotal,
            })),
          })
          pengeluaranId = savedExp.id
        }

        const record = {
          id,
          nomor,
          kategori: input.kategori,
          supplierId: input.supplierId,
          items: detailedItems,
          totalNilai,
          status: input.kategori === 'cacat' ? ('selesai' as const) : ('proses_retur' as const),
          tanggalKeluar: now,
          pengeluaranId,
          userId: input.userId,
          catatan: input.catatan,
        }

        set({
          produk: produks,
          pergerakan: [...pergerakanBaru, ...get().pergerakan],
          daftarBarangKeluar: [record, ...(get().daftarBarangKeluar || [])],
        })

        if (broadcastItems.length > 0) {
          syncService.broadcastStockMutation(
            broadcastItems,
            input.kategori === 'cacat' ? 'Barang Cacat/Rusak' : 'Retur Supplier',
          )
        }

        return record
      },

      selesaikanReturBarang: (input) => {
        const currentList = get().daftarBarangKeluar || []
        const target = currentList.find((x) => x.id === input.id)
        if (!target || target.status === 'selesai_retur') return

        const now = new Date().toISOString()
        const produks = get().produk.map((p) => ({ ...p }))
        const pergerakanBaru: PergerakanStok[] = []
        const broadcastItems = []

        // Jika resolusi 'ganti_barang', stok produk kembali bertambah ke toko
        if (input.resolusi === 'ganti_barang') {
          for (const item of target.items) {
            const p = produks.find((x) => x.id === item.produkId)
            if (!p) continue

            const stokSebelum = p.stok
            p.stok = stokSebelum + item.qty

            pergerakanBaru.push({
              id: `MOV-RET-IN-${Date.now()}-${p.id}`,
              produkId: p.id,
              jenis: 'masuk',
              jumlah: item.qty,
              stokSebelum,
              stokSesudah: p.stok,
              keterangan: `Penggantian barang retur selesai (${target.nomor}): ${item.namaProduk} (+${item.qty} ${item.satuan})`,
              userId: input.userId,
              waktu: now,
            })

            broadcastItems.push({
              produkId: p.id,
              namaProduk: p.nama,
              qty: -item.qty,
              sisaStok: p.stok,
            })
          }
        } else if (input.resolusi === 'potong_hutang' && target.supplierId) {
          const hutangList = get().hutang.map((h) => ({ ...h }))
          const activeDebt = hutangList.find(
            (h) => h.supplierId === target.supplierId && h.status !== 'lunas' && h.sisa > 0,
          )
          if (activeDebt) {
            const potong = Math.min(activeDebt.sisa, target.totalNilai)
            activeDebt.sisa -= potong
            if (activeDebt.sisa <= 0) {
              activeDebt.status = 'lunas'
            }
            set({ hutang: hutangList })
          }
        }

        const updatedRecord = {
          ...target,
          status: 'selesai_retur' as const,
          resolusiRetur: input.resolusi,
          tanggalSelesai: now,
          catatan: input.catatan ? `${target.catatan || ''} | Selesai: ${input.catatan}` : target.catatan,
        }

        set({
          produk: produks,
          pergerakan: [...pergerakanBaru, ...get().pergerakan],
          daftarBarangKeluar: currentList.map((x) => (x.id === input.id ? updatedRecord : x)),
        })

        if (broadcastItems.length > 0) {
          syncService.broadcastStockMutation(broadcastItems, 'Penggantian Retur Selesai')
        }
      },

      hapusBarangKeluar: (id) => {
        const list = get().daftarBarangKeluar || []
        const target = list.find((x) => x.id === id)
        if (target && target.pengeluaranId) {
          get().hapusPengeluaran(target.pengeluaranId)
        }
        set({ daftarBarangKeluar: list.filter((x) => x.id !== id) })
      },

      stockOpname: ({ produkId, stokFisik, userId }) => {
        const produks = get().produk.map((p) => ({ ...p }))
        const p = produks.find((x) => x.id === produkId)
        if (!p) return
        const sebelum = p.stok
        const selisih = stokFisik - sebelum
        p.stok = stokFisik
        const mov: PergerakanStok = {
          id: `MOV-OPN-${Date.now()}`,
          produkId,
          jenis: 'opname',
          jumlah: selisih,
          stokSebelum: sebelum,
          stokSesudah: stokFisik,
          keterangan: `Stock opname (selisih ${selisih >= 0 ? '+' : ''}${selisih})`,
          userId,
          waktu: new Date().toISOString(),
        }
        set({ produk: produks, pergerakan: [mov, ...get().pergerakan] })
        syncService.broadcastStockMutation(
          [{ produkId, namaProduk: p.nama, qty: -selisih, sisaStok: stokFisik }],
          'Stock Opname',
        )
      },

      importProduk: (rows) => {
        const produks = [...get().produk]
        rows.forEach((row, idx) => {
          if (row.id && produks.some((p) => p.id === row.id)) {
            const i = produks.findIndex((p) => p.id === row.id)
            produks[i] = { ...(row as Produk) }
          } else {
            produks.unshift({
              ...(row as Produk),
              id: `PRD-IMP-${Date.now()}-${idx}`,
            })
          }
        })
        set({ produk: produks })
        return rows.length
      },

      simpanResep: (r) => {
        const list = get().resepKonversi
        if (r.id) {
          set({ resepKonversi: list.map((x) => (x.id === r.id ? (r as ResepKonversi) : x)) })
        } else {
          set({
            resepKonversi: [
              { ...(r as ResepKonversi), id: `RSP-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` },
              ...list,
            ],
          })
        }
      },

      hapusResep: (id) => set({ resepKonversi: get().resepKonversi.filter((r) => r.id !== id) }),

      eksekusiPengemasan: ({ resepId, jumlahUnitCurah, distribusi, waste, userId }) => {
        const resep = get().resepKonversi.find((r) => r.id === resepId)
        if (!resep) return
        const produks = get().produk.map((p) => ({ ...p }))
        const curah = produks.find((p) => p.id === resep.produkCurahId)
        if (!curah) return

        const now = new Date().toISOString()
        const totalBerat = jumlahUnitCurah * resep.beratPerUnit
        const hppPerSatuan = curah.hargaBeli / resep.beratPerUnit
        const pergerakanBaru: PergerakanStok[] = []

        // 1. Kurangi stok curah
        const stokCurahSebelum = curah.stok
        curah.stok = Math.max(0, stokCurahSebelum - jumlahUnitCurah)
        pergerakanBaru.push({
          id: `MOV-RPK-OUT-${Date.now()}`,
          produkId: curah.id,
          jenis: 'repack_keluar',
          jumlah: -jumlahUnitCurah,
          stokSebelum: stokCurahSebelum,
          stokSesudah: curah.stok,
          keterangan: `Pengemasan ${resep.nama}: ${jumlahUnitCurah} ${curah.satuan} (${totalBerat} ${resep.satuanDasar})`,
          userId,
          waktu: now,
        })

        // 2. Tambah stok kemasan & hitung HPP
        const itemsPengemasan = distribusi.map((d, idx) => {
          const resepItem = resep.items.find((it) => it.produkKemasanId === d.produkKemasanId)
          const pk = produks.find((p) => p.id === d.produkKemasanId)
          if (!pk || !resepItem) return null

          const hppKemasan = Math.round(hppPerSatuan * resepItem.beratPerKemasan)
          const stokSebelum = pk.stok
          pk.stok = stokSebelum + d.qty
          // Update hargaBeli produk kemasan ke HPP terbaru
          pk.hargaBeli = hppKemasan

          pergerakanBaru.push({
            id: `MOV-RPK-IN-${Date.now()}-${idx}`,
            produkId: pk.id,
            jenis: 'repack_masuk',
            jumlah: d.qty,
            stokSebelum,
            stokSesudah: pk.stok,
            keterangan: `Pengemasan ${resep.nama}: +${d.qty} kemasan @${resepItem.beratPerKemasan}${resep.satuanDasar}`,
            userId,
            waktu: now,
          })

          return {
            produkKemasanId: d.produkKemasanId,
            namaProduk: pk.nama,
            qty: d.qty,
            beratPerKemasan: resepItem.beratPerKemasan,
            hppPerKemasan: hppKemasan,
          }
        }).filter(Boolean) as Pengemasan['items']

        // 3. Catat waste
        if (waste > 0) {
          pergerakanBaru.push({
            id: `MOV-RPK-WST-${Date.now()}`,
            produkId: curah.id,
            jenis: 'waste',
            jumlah: 0,
            stokSebelum: curah.stok,
            stokSesudah: curah.stok,
            keterangan: `Waste pengemasan ${resep.nama}: ${waste} ${resep.satuanDasar}`,
            userId,
            waktu: now,
          })
        }

        // 4. Simpan record pengemasan
        const totalBeratKemasan = itemsPengemasan.reduce((a, it) => a + it.qty * it.beratPerKemasan, 0)
        const record: Pengemasan = {
          id: `PKM-${Date.now()}`,
          resepId: resep.id,
          resepNama: resep.nama,
          produkCurahId: curah.id,
          namaProdukCurah: curah.nama,
          jumlahUnitCurah,
          totalBerat,
          items: itemsPengemasan,
          totalBeratKemasan,
          waste,
          hppCurahPerSatuan: hppPerSatuan,
          biayaKemasan: resep.biayaKemasanPerUnit * jumlahUnitCurah,
          userId,
          waktu: now,
        }

        set({
          produk: produks,
          pergerakan: [...pergerakanBaru, ...get().pergerakan],
          pengemasan: [record, ...get().pengemasan],
        })
      },

      bukaShift: (kasirId, saldoAwal, shiftNomor) => {
        const shift: Shift = {
          id: `SHF-${Date.now()}`,
          kasirId,
          shiftNomor: shiftNomor || 1,
          waktuBuka: new Date().toISOString(),
          saldoAwal,
          totalPenjualan: 0,
          totalTunai: 0,
          totalNonTunai: 0,
          totalPengeluaran: 0,
          jumlahTransaksi: 0,
          status: 'buka',
        }
        set({ shifts: [shift, ...get().shifts] })
        return shift
      },

      tutupShift: (shiftId, saldoAkhir) => {
        set({
          shifts: get().shifts.map((s) =>
            s.id === shiftId
              ? { ...s, waktuTutup: new Date().toISOString(), saldoAkhir, status: 'tutup' as const }
              : s,
          ),
        })
      },

      buatTransaksi: ({ shiftId, kasirId, detail, diskonNota, metode, dibayar, status = 'selesai' }) => {
        const produks = get().produk.map((p) => ({ ...p }))
        const now = new Date().toISOString()
        const subtotal = detail.reduce((a, d) => a + d.subtotal, 0)
        const diskonNominal = Math.min(subtotal, Math.max(0, diskonNota))
        const total = Math.max(0, subtotal - diskonNominal)
        const hpp = detail.reduce((a, d) => a + d.hargaBeli * d.qty, 0)
        const seq = get().transaksi.length + 1
        const trx: Transaksi = {
          id: `TRX-${Date.now()}`,
          nomor: `INV/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${String(seq).padStart(4, '0')}`,
          shiftId,
          kasirId,
          detail,
          subtotal,
          diskonNota,
          diskonNominal,
          total,
          hpp,
          metode,
          dibayar,
          kembalian: dibayar - total,
          status,
          waktu: now,
        }

        const pergerakanBaru: PergerakanStok[] = []
        detail.forEach((d, idx) => {
          const p = produks.find((x) => x.id === d.produkId)
          if (!p) return
          const sebelum = p.stok
          const potongStok = d.bobot ? d.bobot * d.qty : d.qty
          p.stok = Math.max(0, sebelum - potongStok)
          pergerakanBaru.push({
            id: `MOV-SALE-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'penjualan',
            jumlah: -potongStok,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: `Penjualan ${trx.nomor}${d.namaVarian ? ` (${d.namaVarian} x${d.qty})` : ''}`,
            referensiId: trx.id,
            userId: kasirId,
            waktu: now,
          })
        })

        set({
          produk: produks,
          transaksi: [trx, ...get().transaksi],
          pergerakan: [...pergerakanBaru, ...get().pergerakan],
          shifts: get().shifts.map((s) =>
            s.id === shiftId
              ? {
                  ...s,
                  totalPenjualan: s.totalPenjualan + total,
                  totalTunai: s.totalTunai + (metode === 'tunai' ? total : 0),
                  totalNonTunai: s.totalNonTunai + (metode !== 'tunai' ? total : 0),
                  jumlahTransaksi: s.jumlahTransaksi + 1,
                }
              : s,
          ),
        })

        // Broadcast mutasi stok realtime ke seluruh perangkat lain (HP kasir lain / owner)
        const mutasiItems = detail.map((d) => {
          const p = produks.find((x) => x.id === d.produkId)
          const potongStok = d.bobot ? d.bobot * d.qty : d.qty
          return {
            produkId: d.produkId,
            namaProduk: d.namaProduk || p?.nama || 'Produk',
            qty: potongStok,
            sisaStok: p ? p.stok : 0,
          }
        })
        const namaKasir = get().users.find((u) => u.id === kasirId)?.nama || 'Kasir'
        syncService.broadcastStockMutation(mutasiItems, namaKasir)

        return trx
      },

      voidTransaksi: (id, adminId, alasan) => {
        const trx = get().transaksi.find((t) => t.id === id)
        if (!trx || trx.status === 'void') return
        // kembalikan stok
        const produks = get().produk.map((p) => ({ ...p }))
        const pergerakanBaru: PergerakanStok[] = []
        trx.detail.forEach((d, idx) => {
          const p = produks.find((x) => x.id === d.produkId)
          if (!p) return
          const sebelum = p.stok
          const balikStok = d.bobot ? d.bobot * d.qty : d.qty
          p.stok = sebelum + balikStok
          pergerakanBaru.push({
            id: `MOV-VOID-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'void',
            jumlah: balikStok,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: `Void transaksi ${trx.nomor}${d.namaVarian ? ` (${d.namaVarian} x${d.qty})` : ''}`,
            referensiId: trx.id,
            userId: adminId,
            waktu: new Date().toISOString(),
          })
        })
        set({
          produk: produks,
          pergerakan: [...pergerakanBaru, ...get().pergerakan],
          transaksi: get().transaksi.map((t) =>
            t.id === id ? { ...t, status: 'void' as const, voidBy: adminId, voidAlasan: alasan } : t,
          ),
          shifts: get().shifts.map((s) =>
            s.id === trx.shiftId
              ? {
                  ...s,
                  totalPenjualan: s.totalPenjualan - trx.total,
                  totalTunai: s.totalTunai - (trx.metode === 'tunai' ? trx.total : 0),
                  totalNonTunai: s.totalNonTunai - (trx.metode !== 'tunai' ? trx.total : 0),
                  jumlahTransaksi: Math.max(0, s.jumlahTransaksi - 1),
                }
              : s,
          ),
        })
      },

      returPelanggan: ({ transaksiId, items, userId }) => {
        const trx = get().transaksi.find((t) => t.id === transaksiId)
        if (!trx) return
        const produks = get().produk.map((p) => ({ ...p }))
        const pergerakanBaru: PergerakanStok[] = []
        items.forEach((it, idx) => {
          const p = produks.find((x) => x.id === it.produkId)
          if (!p) return
          const sebelum = p.stok
          const dtl = trx.detail.find((d) => d.produkId === it.produkId)
          const balikStok = dtl?.bobot ? dtl.bobot * it.qty : it.qty
          p.stok = sebelum + balikStok
          pergerakanBaru.push({
            id: `MOV-RET-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'retur_pelanggan',
            jumlah: balikStok,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: `Retur pelanggan atas ${trx.nomor}`,
            referensiId: trx.id,
            userId,
            waktu: new Date().toISOString(),
          })
        })
        set({ produk: produks, pergerakan: [...pergerakanBaru, ...get().pergerakan] })
      },

      simpanPengeluaran: (p) => {
        const list = get().pengeluaran
        let saved: Pengeluaran
        let nextList: Pengeluaran[]
        if (p.id) {
          saved = p as Pengeluaran
          nextList = list.map((x) => (x.id === p.id ? saved : x))
        } else {
          saved = { ...(p as Pengeluaran), id: `EXP-${Date.now()}` }
          nextList = [saved, ...list]
        }
        set({ pengeluaran: nextList })

        if (saved.shiftId) {
          const sId = saved.shiftId
          const totalExp = nextList
            .filter((x) => x.shiftId === sId)
            .reduce((sum, item) => sum + item.jumlah, 0)
          set({
            shifts: get().shifts.map((s) =>
              s.id === sId ? { ...s, totalPengeluaran: totalExp } : s,
            ),
          })
        }
        return saved
      },
      hapusPengeluaran: (id) => {
        const target = get().pengeluaran.find((p) => p.id === id)
        const nextList = get().pengeluaran.filter((p) => p.id !== id)
        set({ pengeluaran: nextList })

        if (target?.shiftId) {
          const sId = target.shiftId
          const totalExp = nextList
            .filter((x) => x.shiftId === sId)
            .reduce((sum, item) => sum + item.jumlah, 0)
          set({
            shifts: get().shifts.map((s) =>
              s.id === sId ? { ...s, totalPengeluaran: totalExp } : s,
            ),
          })
        }
      },

      lunasiHutang: (id) => {
        set({
          hutang: get().hutang.map((h) => (h.id === id ? { ...h, sisa: 0, status: 'lunas' as const } : h)),
        })
      },

      tambahLogSinkron: (log) =>
        set({ logSinkron: [{ ...log, id: `SYNC-${Date.now()}` }, ...get().logSinkron].slice(0, 50) }),

      resetData: () => set(freshData()),
    }),
    {
      name: 'ipos-data-v1',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.daftarBarangKeluar || state.daftarBarangKeluar.length === 0) {
            state.daftarBarangKeluar = buildBarangKeluar(state.produk || initialProduk, state.supplier || SUPPLIER_SEED)
          }
          if (!state.daftarSatuan || state.daftarSatuan.length === 0) {
            state.daftarSatuan = [...DEFAULT_SATUAN]
          } else {
            // Gabungkan jika ada default yang belum masuk
            const setS = new Set([...DEFAULT_SATUAN, ...state.daftarSatuan])
            state.daftarSatuan = Array.from(setS)
          }

          const beras = state.produk.find((p) => p.nama === 'Beras Rojolele Curah')
          if (beras && (!beras.varian || beras.varian.length === 0)) {
            beras.satuan = 'kg'
            beras.varian = [
              { id: 'VRN-BRC-5', nama: '5 kg', bobot: 5, hargaJual: 70000 },
              { id: 'VRN-BRC-2', nama: '2 kg', bobot: 2, hargaJual: 30000 },
              { id: 'VRN-BRC-1', nama: '1 kg', bobot: 1, hargaJual: 15000 },
            ]
            if (beras.stok <= 0) beras.stok = 50
          }

          const kopi = state.produk.find((p) => p.nama === 'Kopi Sachet')
          if (kopi && (!kopi.satuanBertingkat || kopi.satuanBertingkat.length === 0)) {
            kopi.satuan = 'pcs'
            kopi.hargaBeli = 1000
            kopi.hargaJual = 1500
            kopi.stok = 600
            kopi.satuanBertingkat = [
              {
                id: 'STB-KP-1',
                namaSatuan: 'renceng',
                satuanTurunan: 'pcs',
                isi: 12,
                multiplierToBase: 12,
                hargaBeli: 12000,
                marginPersen: 25,
                hargaJual: 15000,
              },
              {
                id: 'STB-KP-2',
                namaSatuan: 'pax',
                satuanTurunan: 'renceng',
                isi: 6,
                multiplierToBase: 72,
                hargaBeli: 72000,
                marginPersen: 20,
                hargaJual: 86400,
              },
              {
                id: 'STB-KP-3',
                namaSatuan: 'karton',
                satuanTurunan: 'pax',
                isi: 8,
                multiplierToBase: 576,
                hargaBeli: 576000,
                marginPersen: 15,
                hargaJual: 662400,
              },
            ]
          }
        }
      },
      partialize: (s) => {
        const {
          users, kategori, supplier, produk, pergerakan, transaksi, shifts,
          pengeluaran, hutang, penerimaan, logSinkron, resepKonversi, pengemasan,
          daftarSatuan, daftarBarangKeluar,
        } = s
        return {
          users, kategori, supplier, produk, pergerakan, transaksi, shifts,
          pengeluaran, hutang, penerimaan, logSinkron, resepKonversi, pengemasan,
          daftarSatuan, daftarBarangKeluar,
        } as DataState
      },
    },
  ),
)

// ---------------------------------------------------------------------------
// Sinkronisasi Multi-Perangkat (WLAN WebSocket + Shared Hosting Polling)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  syncService.init()

  // Listener event mutasi stok dari perangkat lain
  syncService.onStockMutation((ev) => {
    const state = useDataStore.getState()
    const produksBaru = state.produk.map((p) => {
      const item = ev.items.find((it) => it.produkId === p.id)
      if (item) {
        return { ...p, stok: item.sisaStok }
      }
      return p
    })

    // Update store secara reaktif
    useDataStore.setState({ produk: produksBaru })

    // Toast feedback visual instan di layar
    const ringkasan = ev.items
      .map((it) => `${it.namaProduk}: sisa ${it.sisaStok}`)
      .join(', ')

    useToast.getState().push({
      tipe: 'info',
      judul: `Stok Berkurang (${ev.kasirNama || 'Kasir Lain'})`,
      pesan: ringkasan,
    })
  })
}
