import { useToast } from '@/store/useToast'

const tone: Record<string, string> = {
  sukses: 'border-l-emerald-500 bg-white',
  error: 'border-l-rose-500 bg-white',
  info: 'border-l-brand-500 bg-white',
  peringatan: 'border-l-amber-500 bg-white',
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
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{t.judul}</p>
            {t.pesan && <p className="mt-0.5 text-xs text-slate-500">{t.pesan}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="text-sm font-bold text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
