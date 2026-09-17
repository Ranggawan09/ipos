import React from 'react'

// ---- Tombol --------------------------------------------------------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const variantCls: Record<string, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
}

const sizeCls: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      {...rest}
    />
  )
}

// ---- Kartu ---------------------------------------------------------------
export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

// ---- Label ---------------------------------------------------------------
export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-600">
      {children}
    </label>
  )
}

const fieldCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} className={`${fieldCls} ${className}`} {...rest} />,
)
Input.displayName = 'Input'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...rest }, ref) => (
    <select ref={ref} className={`${fieldCls} ${className}`} {...rest} />
  ),
)
Select.displayName = 'Select'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', ...rest }, ref) => (
  <textarea ref={ref} className={`${fieldCls} ${className}`} {...rest} />
))
Textarea.displayName = 'Textarea'

// ---- Badge ---------------------------------------------------------------
export function Badge({
  children,
  warna = 'slate',
  className = '',
}: {
  children: React.ReactNode
  warna?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'purple'
  className?: string
}) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-brand-100 text-brand-700',
    violet: 'bg-violet-100 text-violet-700',
    purple: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[warna]} ${className}`}>
      {children}
    </span>
  )
}

// ---- Modal ---------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  lebar = 'max-w-lg',
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  lebar?: string
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 animate-fade-in">
      <div className={`mt-12 w-full ${lebar} rounded-xl bg-white shadow-xl animate-fade-in`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            Tutup
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

// ---- Stat card -----------------------------------------------------------
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'brand' | 'green' | 'amber' | 'rose' | 'violet'
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// ---- Empty state ---------------------------------------------------------
export function EmptyState({ judul, pesan }: { judul: string; pesan?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{judul}</p>
      {pesan && <p className="max-w-sm text-xs text-slate-400">{pesan}</p>}
    </div>
  )
}

// ---- Tabel ---------------------------------------------------------------
export type Kolom<T> = {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T extends { id: string }>({
  kolom,
  data,
  kosong = 'Tidak ada data',
}: {
  kolom: Kolom<T>[]
  data: T[]
  kosong?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {kolom.map((k) => (
              <th
                key={k.key}
                className={`whitespace-nowrap px-3 py-2.5 font-medium ${
                  k.align === 'right' ? 'text-right' : k.align === 'center' ? 'text-center' : ''
                }`}
              >
                {k.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={kolom.length} className="px-3 py-10 text-center text-sm text-slate-400">
                {kosong}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                {kolom.map((k) => (
                  <td
                    key={k.key}
                    className={`px-3 py-2.5 ${
                      k.align === 'right' ? 'text-right' : k.align === 'center' ? 'text-center' : ''
                    } ${k.className ?? ''}`}
                  >
                    {k.render ? k.render(row) : (row as Record<string, unknown>)[k.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---- Label kebutuhan fungsional (dinonaktifkan untuk kebersihan antarmuka) ----
export function FR({ kode: _kode }: { kode: string }) {
  return null
}

export function PageHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string
  deskripsi?: string
  aksi?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{judul}</h1>
        {deskripsi && <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>}
      </div>
      {aksi && <div className="flex flex-wrap gap-2">{aksi}</div>}
    </div>
  )
}
