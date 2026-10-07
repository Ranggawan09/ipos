import { useEffect, useMemo, useRef, useState } from 'react'
import type { Produk } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { angka, rupiah } from '@/lib/format'

export type SelectProdukProps = {
  value: string
  onChange: (produkId: string, produk?: Produk) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  filterProduk?: (p: Produk) => boolean
  daftarProdukCustom?: Produk[]
  labelSubtext?: (p: Produk) => string
}

export function SelectProduk({
  value,
  onChange,
  placeholder = '-- Pilih Produk --',
  disabled = false,
  className = '',
  filterProduk,
  daftarProdukCustom,
  labelSubtext,
}: SelectProdukProps) {
  const { produk: produkStore, kategori } = useDataStore()
  const [buka, setBuka] = useState(false)
  const [cari, setCari] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputSearchRef = useRef<HTMLInputElement>(null)

  const poolProduk = daftarProdukCustom || produkStore

  // Daftar produk setelah difilter (misal hanya curah dsb)
  const availableProduk = useMemo(() => {
    if (filterProduk) {
      return poolProduk.filter(filterProduk)
    }
    return poolProduk
  }, [poolProduk, filterProduk])

  // Produk yang saat ini terpilih
  const terpilih = useMemo(() => {
    return poolProduk.find((p) => p.id === value)
  }, [poolProduk, value])

  // Kategori map untuk menampilkan nama kategori di opsi
  const kategoriMap = useMemo(() => {
    return new Map(kategori.map((k) => [k.id, k.nama]))
  }, [kategori])

  // Hasil pencarian berdasarkan nama, SKU, barcode, dan nama kategori
  const hasilCari = useMemo(() => {
    const q = cari.toLowerCase().trim()
    if (!q) return availableProduk
    return availableProduk.filter((p) => {
      const katNama = kategoriMap.get(p.kategoriId)?.toLowerCase() || ''
      return (
        p.nama.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        katNama.includes(q)
      )
    })
  }, [availableProduk, cari, kategoriMap])

  // Auto-focus ke input search saat popover terbuka
  useEffect(() => {
    if (buka) {
      setCari('')
      setTimeout(() => {
        inputSearchRef.current?.focus()
      }, 50)
    }
  }, [buka])

  // Tutup dropdown saat klik di luar elemen
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setBuka(false)
      }
    }
    if (buka) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [buka])

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && buka) {
        setBuka(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [buka])

  const pilihItem = (p: Produk) => {
    onChange(p.id, p)
    setBuka(false)
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      {/* Tombol Pemicu Dropdown */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setBuka(!buka)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-xs transition focus:outline-hidden ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
            : buka
            ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
            : 'border-slate-300 text-slate-700 hover:border-slate-400 shadow-2xs'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {terpilih ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="min-w-0 truncate">
                <span className="font-semibold text-slate-800">{terpilih.nama}</span>
                <span className="ml-1.5 font-mono text-[10px] text-slate-400">({terpilih.sku})</span>
                {labelSubtext && (
                  <span className="ml-1.5 text-[10px] text-amber-600 font-medium">
                    {labelSubtext(terpilih)}
                  </span>
                )}
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                terpilih.stok <= 0 ? 'bg-rose-100 text-rose-700 font-semibold' : 'bg-slate-100 text-slate-600'
              }`}>
                Stok: {angka(terpilih.stok)} {terpilih.satuan}
              </span>
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        {/* Chevron Icon */}
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${buka ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover Dropdown dengan Pencarian */}
      {buka && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-[280px] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Kolom Pencarian Real-time */}
          <div className="border-b border-slate-100 bg-slate-50/80 p-2">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputSearchRef}
                type="text"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Ketik nama produk, SKU, barcode..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
              {cari && (
                <button
                  type="button"
                  onClick={() => setCari('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>Menampilkan {hasilCari.length} produk</span>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setBuka(false) }}
                  className="text-rose-500 hover:underline"
                >
                  Kosongkan pilihan
                </button>
              )}
            </div>
          </div>

          {/* Daftar Opsi Produk */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {hasilCari.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <p>Tidak ada produk ditemukan</p>
                {cari && <p className="mt-1 text-[10px] text-slate-300">Coba kata kunci lain</p>}
              </div>
            ) : (
              hasilCari.map((p) => {
                const aktif = p.id === value
                const katNama = kategoriMap.get(p.kategoriId)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pilihItem(p)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left text-xs transition ${
                      aktif
                        ? 'bg-brand-50 text-brand-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">{p.nama}</span>
                        {katNama && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] text-slate-500 shrink-0">
                            {katNama}
                          </span>
                        )}
                        {labelSubtext && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] text-amber-700 font-medium shrink-0 border border-amber-200">
                            {labelSubtext(p)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>SKU: {p.sku}</span>
                        {p.barcode && <span>Barcode: {p.barcode}</span>}
                        <span className="font-sans font-medium text-slate-600">{rupiah(p.hargaJual)}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        p.stok <= 0
                          ? 'bg-rose-100 text-rose-700'
                          : p.stok <= 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {angka(p.stok)} {p.satuan}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
