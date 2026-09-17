import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Produk, User } from '@/types'
import { useDataStore } from './useDataStore'

export type CartItem = {
  produkId: string
  nama: string
  sku: string
  hargaJual: number
  hargaBeli: number
  qty: number
  diskonItem: number
  stokTersedia: number
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

  addToCart: (p: Produk, qty?: number) => void
  setQty: (produkId: string, qty: number) => void
  setDiskonItem: (produkId: string, diskon: number) => void
  removeFromCart: (produkId: string) => void
  clearCart: () => void
  setDiskonNota: (v: number) => void

  queuePending: (trx: PendingTrx) => void
  flushPending: () => number
  setLastSync: (iso: string) => void
}

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

      addToCart: (p, qty = 1) => {
        const cart = [...get().cart]
        const ada = cart.find((c) => c.produkId === p.id)
        if (ada) {
          ada.qty = Math.min(ada.stokTersedia, ada.qty + qty)
        } else {
          cart.push({
            produkId: p.id,
            nama: p.nama,
            sku: p.sku,
            hargaJual: p.hargaJual,
            hargaBeli: p.hargaBeli,
            qty: Math.min(p.stok, qty),
            diskonItem: 0,
            stokTersedia: p.stok,
          })
        }
        set({ cart })
      },
      setQty: (produkId, qty) => {
        if (qty <= 0) {
          set({ cart: get().cart.filter((c) => c.produkId !== produkId) })
          return
        }
        set({
          cart: get().cart.map((c) =>
            c.produkId === produkId
              ? {
                  ...c,
                  qty: Math.min(c.stokTersedia, qty),
                  diskonItem: Math.min(c.diskonItem, c.hargaJual * Math.min(c.stokTersedia, qty)),
                }
              : c,
          ),
        })
      },
      setDiskonItem: (produkId, diskon) =>
        set({
          cart: get().cart.map((c) =>
            c.produkId === produkId
              ? { ...c, diskonItem: Math.max(0, Math.min(c.hargaJual * c.qty, diskon)) }
              : c,
          ),
        }),
      removeFromCart: (produkId) => set({ cart: get().cart.filter((c) => c.produkId !== produkId) }),
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
                diskonItem: c.diskonItem,
                subtotal,
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
