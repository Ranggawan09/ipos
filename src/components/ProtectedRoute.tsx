import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/types'
import { useSessionStore } from '@/store/useSessionStore'

export function ProtectedRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { currentUser } = useSessionStore()
  const loc = useLocation()

  if (!currentUser) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!roles.includes(currentUser.role))
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-500">
            !
          </div>
          <h1 className="text-lg font-bold text-slate-800">Akses ditolak</h1>
          <p className="mt-1 text-sm text-slate-500">
            Akun <span className="font-medium">{currentUser.nama}</span> ({currentUser.role}) tidak memiliki
            hak akses ke halaman ini. Sistem menerapkan pembatasan akses berbasis peran.
          </p>
        </div>
      </div>
    )
  return <>{children}</>
}
