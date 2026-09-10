import { useToast } from '@/store/useToast'

const tone: Record<string, string> = {
  sukses: 'border-l-emerald-500 bg-white',
  error: 'border-l-rose-500 bg-white',
  info: 'border-l-brand-500 bg-white',
  peringatan: 'border-l-amber-500 bg-white',
}

const icon: Record<string, string> = {
  sukses: '✓',
  error: '!',
  info: 'i',
  peringatan: '!',
}

export function ToastHost() {
  const { toasts, remove } = useToast()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 border-l-4 p-3 shadow-lg animate-slide-in ${tone[t.tipe]}`}
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {icon[t.tipe]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{t.judul}</p>
            {t.pesan && <p className="mt-0.5 text-xs text-slate-500">{t.pesan}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-slate-500">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
