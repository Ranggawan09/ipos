import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Produk, SatuanBertingkat, User, VarianBobot } from '@/types'
import { useDataStore } from './useDataStore'

export type CartItem = {
  cartItemId: string
  produkId: string
  nama: string
  sku: string
  hargaJual: number
  hargaBeli: number
  qty: number
  satuan?: string
  satuanId?: string
  multiplier?: number
  diskonItem: number
  stokTersedia: number
  varianId?: string
  namaVarian?: string
  bobot?: number
}

export type PendingTrx = {
  id: string
  shiftId: string
  kasirId: string
  detail: CartItem[]
  diskonNota: number
  metode: 'tunai' | 'qris' | 'debit'
  dibayar: number
  waktu: string
}

type SessionState = {
  currentUser: User | null
  logoutReason: string | null
  cart: CartItem[]
  diskonNota: number
  shiftId: string | null
  selectedShiftNomor: 1 | 2
  offlineMode: boolean
  pendingQueue: PendingTrx[]
  lastSyncAt: string | null

  login: (user: User) => void
  logout: () => void
  setCurrentUser: (user: User | null) => void

  setShiftId: (id: string | null) => void
  setSelectedShiftNomor: (nomor: 1 | 2) => void
  setOffline: (v: boolean) => void

  addToCart: (p: Produk, qty?: number, varian?: VarianBobot, satuanBertingkat?: SatuanBertingkat) => void
  setQty: (itemKey: string, qty: number) => void
  setDiskonItem: (itemKey: string, diskon: number) => void
  removeFromCart: (itemKey: string) => void
  clearCart: () => void
  setDiskonNota: (v: number) => void

  queuePending: (trx: PendingTrx) => void
  flushPending: () => number
  setLastSync: (iso: string) => void
}

const matchItem = (c: CartItem, key: string) => (c.cartItemId ? c.cartItemId === key : c.produkId === key)

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      logoutReason: null,
      cart: [],
      diskonNota: 0,
      shiftId: null,
      selectedShiftNomor: 1,
      offlineMode: false,
      pendingQueue: [],
      lastSyncAt: null,

      login: (user) => set({ currentUser: user, logoutReason: null }),
      logout: () => set({ currentUser: null, cart: [], shiftId: null, diskonNota: 0, selectedShiftNomor: 1 }),
      setCurrentUser: (user) => set({ currentUser: user }),

      setShiftId: (id) => set({ shiftId: id }),
      setSelectedShiftNomor: (nomor) => set({ selectedShiftNomor: nomor }),
      setOffline: (v) => set({ offlineMode: v }),

      addToCart: (p, qty = 1, varian, satuanBertingkat) => {
        const cart = [...get().cart]
        const cartItemId = satuanBertingkat
          ? `${p.id}-satuan-${satuanBertingkat.id}`
          : varian
          ? `${p.id}-${varian.id}`
          : p.id
        const ada = cart.find((c) => matchItem(c, cartItemId))

        const stokTersedia = satuanBertingkat
          ? Math.floor(p.stok / satuanBertingkat.multiplierToBase)
          : varian
          ? Math.floor(p.stok / varian.bobot)
          : p.stok

        const hargaJual = satuanBertingkat
          ? satuanBertingkat.hargaJual
          : varian
          ? varian.hargaJual
          : p.hargaJual

        const hargaBeli = satuanBertingkat
          ? satuanBertingkat.hargaBeli
          : varian
          ? Math.round(p.hargaBeli * varian.bobot)
          : p.hargaBeli

        const nama = satuanBertingkat
          ? `${p.nama} (${satuanBertingkat.namaSatuan})`
          : varian
          ? `${p.nama} (${varian.nama})`
          : p.nama

        const satuan = satuanBertingkat
          ? satuanBertingkat.namaSatuan
          : varian
          ? 'pcs'
          : p.satuan || 'pcs'

        const bobot = satuanBertingkat
          ? satuanBertingkat.multiplierToBase
          : varian
          ? varian.bobot
          : undefined

        if (ada) {
          ada.qty = Math.min(ada.stokTersedia, ada.qty + qty)
        } else {
          cart.push({
            cartItemId,
            produkId: p.id,
            nama,
            sku: p.sku,
            hargaJual,
            hargaBeli,
            qty: Math.min(stokTersedia, qty),
            satuan,
            satuanId: satuanBertingkat?.id,
            multiplier: satuanBertingkat?.multiplierToBase,
            diskonItem: 0,
            stokTersedia,
            varianId: varian?.id,
            namaVarian: varian?.nama,
            bobot,
          })
        }
        set({ cart })
      },
      setQty: (itemKey, qty) => {
        if (qty <= 0) {
          set({ cart: get().cart.filter((c) => !matchItem(c, itemKey)) })
          return
        }
        set({
          cart: get().cart.map((c) =>
            matchItem(c, itemKey)
              ? {
                  ...c,
                  qty: Math.min(c.stokTersedia, qty),
                  diskonItem: Math.min(c.diskonItem, c.hargaJual * Math.min(c.stokTersedia, qty)),
                }
              : c,
          ),
        })
      },
      setDiskonItem: (itemKey, diskon) =>
        set({
          cart: get().cart.map((c) =>
            matchItem(c, itemKey)
              ? { ...c, diskonItem: Math.max(0, Math.min(c.hargaJual * c.qty, diskon)) }
              : c,
          ),
        }),
      removeFromCart: (itemKey) => set({ cart: get().cart.filter((c) => !matchItem(c, itemKey)) }),
      clearCart: () => set({ cart: [], diskonNota: 0 }),
      setDiskonNota: (v) => set({ diskonNota: Math.max(0, v) }),

      queuePending: (trx) => set({ pendingQueue: [...get().pendingQueue, trx] }),

      flushPending: () => {
        const queue = get().pendingQueue
        if (queue.length === 0) return 0
        const data = useDataStore.getState()
        queue.forEach((p) => {
          data.buatTransaksi({
            shiftId: p.shiftId,
            kasirId: p.kasirId,
            detail: p.detail.map((c, i) => {
              const subtotal = Math.max(0, c.hargaJual * c.qty - (c.diskonItem || 0))
              return {
                id: `DTL-${p.id}-${i}`,
                produkId: c.produkId,
                namaProduk: c.nama,
                sku: c.sku,
                hargaSatuan: c.hargaJual,
                hargaBeli: c.hargaBeli,
                qty: c.qty,
                satuan: c.satuan || 'pcs',
                diskonItem: c.diskonItem,
                subtotal,
                varianId: c.varianId,
                namaVarian: c.namaVarian,
                bobot: c.bobot,
              }
            }),
            diskonNota: p.diskonNota,
            metode: p.metode,
            dibayar: p.dibayar,
          })
        })
        set({ pendingQueue: [], lastSyncAt: new Date().toISOString() })
        useDataStore.getState().tambahLogSinkron({
          waktu: new Date().toISOString(),
          jenis: 'lokal',
          jumlahData: queue.length,
          keterangan: `Sinkronisasi ${queue.length} transaksi offline ke server lokal`,
          status: 'sukses',
        })
        return queue.length
      },

      setLastSync: (iso) => set({ lastSyncAt: iso }),
    }),
    {
      name: 'ipos-session-v1',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
