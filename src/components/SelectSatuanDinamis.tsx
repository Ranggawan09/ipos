import React, { useState, useRef, useEffect } from 'react'
import { useDataStore, DEFAULT_SATUAN } from '@/store/useDataStore'

function ChevronDownIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function PlusIcon({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M12 5v14" />
    </svg>
  )
}

function CheckIcon({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export interface SelectSatuanDinamisProps {
  value: string
  onChange: (satuan: string) => void
  placeholder?: string
  className?: string
  sizeVariant?: 'sm' | 'md'
  disabled?: boolean
}

export function SelectSatuanDinamis({
  value,
  onChange,
  placeholder = 'Pilih/ketik satuan...',
  className = '',
  sizeVariant = 'md',
  disabled = false,
}: SelectSatuanDinamisProps) {
  const storeDaftar = useDataStore((s) => s.daftarSatuan)
  const tambahSatuanKamus = useDataStore((s) => s.tambahSatuanKamus)

  const daftarSatuan = storeDaftar && storeDaftar.length > 0 ? storeDaftar : DEFAULT_SATUAN

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Sync internal query when value prop changes externally
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery(value || '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [value])

  const cleanQuery = query.trim().toLowerCase()

  const filteredOptions = daftarSatuan.filter((s) =>
    s.toLowerCase().includes(cleanQuery),
  )

  const isExactMatch = daftarSatuan.some(
    (s) => s.toLowerCase() === cleanQuery,
  )

  const handleSelect = (satuan: string) => {
    onChange(satuan)
    setQuery(satuan)
    setIsOpen(false)
  }

  const handleAddNew = (satuanBaru: string) => {
    const s = satuanBaru.trim().toLowerCase()
    if (!s) return
    tambahSatuanKamus(s)
    onChange(s)
    setQuery(s)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions.length > 0 && !isExactMatch) {
        handleSelect(filteredOptions[0])
      } else if (cleanQuery && !isExactMatch) {
        handleAddNew(cleanQuery)
      } else if (cleanQuery) {
        handleSelect(cleanQuery)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery(value || '')
    }
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
  }[sizeVariant]

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-300 bg-white pr-8 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:cursor-not-allowed ${sizeClasses}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false)
            } else {
              setIsOpen(true)
              inputRef.current?.focus()
            }
          }}
          className="absolute right-2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
        >
          <ChevronDownIcon
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-600' : ''}`}
            size={sizeVariant === 'sm' ? 14 : 16}
          />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[140px] overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {cleanQuery && !isExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleAddNew(cleanQuery)
              }}
              className="flex w-full items-center gap-2 rounded-md bg-brand-50 px-2.5 py-1.5 text-left text-xs font-semibold text-brand-700 hover:bg-brand-100 transition mb-1"
            >
              <PlusIcon size={14} className="shrink-0" />
              <span>
                Tambah &quot;<strong>{cleanQuery}</strong>&quot;
              </span>
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => {
              const isSelected = item.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item)
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs capitalize transition ${
                    isSelected
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{item}</span>
                  {isSelected && <CheckIcon size={14} className="text-brand-600" />}
                </button>
              )
            })
          ) : !cleanQuery ? (
            <div className="px-2.5 py-2 text-center text-xs text-slate-400">
              Belum ada satuan
            </div>
          ) : isExactMatch ? null : (
            <div className="px-2.5 py-1 text-center text-xs text-slate-400">
              Tekan tombol tambah di atas
            </div>
          )}
        </div>
      )}
    </div>
  )
}
