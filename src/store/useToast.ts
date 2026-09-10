import { create } from 'zustand'

export type Toast = {
  id: string
  tipe: 'sukses' | 'error' | 'info' | 'peringatan'
  judul: string
  pesan?: string
}

type ToastState = {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2)
    set({ toasts: [...get().toasts, { ...t, id }] })
    setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== id) }), 4200)
  },
  remove: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}))
