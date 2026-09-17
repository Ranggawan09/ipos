import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  HutangSupplier,
  Kategori,
  LogSinkron,
  PenerimaanBarang,
  Pengemasan,
  PergerakanStok,
  Pengeluaran,
  Produk,
  ResepKonversi,
  Shift,
  Supplier,
  Transaksi,
  User,
} from '@/types'
import {
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

  // Inventory
  simpanProduk: (p: Omit<Produk, 'id'> & { id?: string }) => Produk
  hapusProduk: (id: string) => void
  simpanKategori: (k: Omit<Kategori, 'id'> & { id?: string }) => void
  hapusKategori: (id: string) => void
  simpanSupplier: (s: Omit<Supplier, 'id'> & { id?: string }) => void
  hapusSupplier: (id: string) => void
  terimaBarang: (input: {
    supplierId: string
    items: { produkId: string; qty: number; hargaBeli: number }[]
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
  simpanPengeluaran: (p: Omit<Pengeluaran, 'id'> & { id?: string }) => void
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
  }
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      ...freshData(),

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
          const sebelum = p.stok
          p.stok = sebelum + item.qty
          pergerakanBaru.push({
            id: `MOV-IN-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'masuk',
            jumlah: item.qty,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: 'Penerimaan barang dari supplier',
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
            return { produkId: i.produkId, namaProduk: p?.nama ?? '-', qty: i.qty, hargaBeli: i.hargaBeli }
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
          p.stok = Math.max(0, sebelum - d.qty)
          pergerakanBaru.push({
            id: `MOV-SALE-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'penjualan',
            jumlah: -d.qty,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: `Penjualan ${trx.nomor}`,
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
          return {
            produkId: d.produkId,
            namaProduk: d.namaProduk || p?.nama || 'Produk',
            qty: d.qty,
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
          p.stok = sebelum + d.qty
          pergerakanBaru.push({
            id: `MOV-VOID-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'void',
            jumlah: d.qty,
            stokSebelum: sebelum,
            stokSesudah: p.stok,
            keterangan: `Void transaksi ${trx.nomor}`,
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
          p.stok = sebelum + it.qty
          pergerakanBaru.push({
            id: `MOV-RET-${Date.now()}-${idx}`,
            produkId: p.id,
            jenis: 'retur_pelanggan',
            jumlah: it.qty,
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
        if (p.id) set({ pengeluaran: list.map((x) => (x.id === p.id ? (p as Pengeluaran) : x)) })
        else
          set({
            pengeluaran: [
              { ...(p as Pengeluaran), id: `EXP-${Date.now()}` },
              ...list,
            ],
          })
      },
      hapusPengeluaran: (id) => set({ pengeluaran: get().pengeluaran.filter((p) => p.id !== id) }),

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
      partialize: (s) => {
        const {
          users, kategori, supplier, produk, pergerakan, transaksi, shifts,
          pengeluaran, hutang, penerimaan, logSinkron, resepKonversi, pengemasan,
        } = s
        return {
          users, kategori, supplier, produk, pergerakan, transaksi, shifts,
          pengeluaran, hutang, penerimaan, logSinkron, resepKonversi, pengemasan,
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
