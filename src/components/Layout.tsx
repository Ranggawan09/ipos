import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/store/useSessionStore'
import { Topbar, SyncFooter } from './Topbar'

const ICONS: Record<string, string> = {
  dashboard: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  tag: 'M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7 7h.01',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  outbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  clip: 'M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1zM6 4h12v18H6zM9 11h6M9 15h4',
  history: 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  cart: 'M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM20 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6',
  receipt: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 7h8M8 11h8M8 15h5',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  report: 'M3 3v18h18M7 15l3-4 3 2 4-6',
  chart: 'M3 3v18h18M7 16v-5M12 16V8M17 16v-8',
  wallet: 'M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z',
  scale: 'M12 3v18M5 7l7-4 7 4M5 7l-3 6h6zM19 7l-3 6h6zM8 21h8',
  debt: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12',
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name] ?? ICONS.box} />
    </svg>
  )
}


type NavItem = { to: string; label: string; icon: string }
type NavGroup = { judul: string; items: NavItem[] }

const ADMIN_NAV: NavGroup[] = [
  { judul: '', items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard' }] },
  {
    judul: 'Inventory',
    items: [
      { to: '/admin/produk', label: 'Produk', icon: 'box' },
      { to: '/admin/kategori', label: 'Kategori', icon: 'tag' },
      { to: '/admin/supplier', label: 'Supplier', icon: 'truck' },
      { to: '/admin/barang-masuk', label: 'Barang Masuk', icon: 'inbox' },
      { to: '/admin/stock-opname', label: 'Stock Opname', icon: 'clip' },
      { to: '/admin/riwayat-stok', label: 'Riwayat Stok', icon: 'history' },
      { to: '/admin/import', label: 'Import Produk', icon: 'upload' },
    ],
  },
  {
    judul: 'POS',
    items: [
      { to: '/kasir', label: 'Buka Layar Kasir', icon: 'cart' },
      { to: '/admin/transaksi', label: 'Transaksi', icon: 'receipt' },
      { to: '/admin/shift', label: 'Shift Kasir', icon: 'clock' },
    ],
  },
  {
    judul: 'Keuangan',
    items: [
      { to: '/admin/laporan', label: 'Laporan Penjualan', icon: 'report' },
      { to: '/admin/laba-rugi', label: 'Laba Rugi', icon: 'chart' },
      { to: '/admin/pengeluaran', label: 'Pengeluaran', icon: 'wallet' },
      { to: '/admin/rekonsiliasi', label: 'Rekonsiliasi Kas', icon: 'scale' },
      { to: '/admin/hutang', label: 'Hutang Supplier', icon: 'debt' },
    ],
  },
  {
    judul: 'Pengaturan',
    items: [
      { to: '/admin/pengguna', label: 'Pengguna', icon: 'users' },
      { to: '/admin/sinkronisasi', label: 'Sinkronisasi', icon: 'settings' },
    ],
  },
]

export function AdminLayout() {
  const [buka, setBuka] = useState(false)
  const loc = useLocation()
  const semua = ADMIN_NAV.flatMap((g) => g.items)
  const aktif = [...semua].sort((a, b) => b.to.length - a.to.length).find((i) =>
    loc.pathname === i.to || loc.pathname.startsWith(i.to + '/'),
  )
  const judul = loc.pathname === '/admin' ? 'Dashboard' : aktif?.label ?? 'Admin'

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900 transition-transform lg:static lg:translate-x-0 ${
          buka ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            iPOS
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Toko Pasar Jaya</p>
            <p className="text-[10px] text-slate-400">Panel Admin</p>
          </div>
        </div>
        <nav className="p-3">
          {ADMIN_NAV.map((g, gi) => (
            <div key={gi} className="mb-3">
              {g.judul && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {g.judul}
                </p>
              )}
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/admin'}
                  onClick={() => setBuka(false)}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon name={it.icon} size={16} />
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {buka && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setBuka(false)} />}

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setBuka(true)}
          className="flex items-center gap-2 border-b border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          Menu
        </button>
        <Topbar judul={judul} />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 lg:p-6">
          <Outlet />
        </main>
        <SyncFooter />
      </div>
    </div>
  )
}

const KASIR_NAV: NavItem[] = [
  { to: '/kasir', label: 'Kasir', icon: 'cart' },
  { to: '/kasir/riwayat', label: 'Riwayat', icon: 'receipt' },
  { to: '/kasir/shift', label: 'Shift', icon: 'clock' },
]

export function KasirLayout() {
  const loc = useLocation()
  const aktif = [...KASIR_NAV].sort((a, b) => b.to.length - a.to.length).find((i) =>
    loc.pathname === i.to || loc.pathname.startsWith(i.to + '/'),
  )
  const isPos = loc.pathname === '/kasir'

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-100">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
            POS
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Toko Pasar Jaya</p>
            <p className="text-[10px] text-slate-400">Aplikasi Kasir</p>
          </div>
        </div>
        <nav className="flex gap-1">
          {KASIR_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/kasir'}
              className={({ isActive }) =>
                `flex flex-col items-center rounded-lg px-3 py-1 text-[11px] font-medium transition sm:px-4 sm:py-1.5 ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <Icon name={n.icon} size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <span className="hidden text-[11px] font-medium text-slate-400 md:block">{aktif?.label ?? 'Kasir'}</span>
      </div>
      <Topbar judul={aktif?.label ?? 'Kasir'} />
      <main className={`flex-1 ${isPos ? 'overflow-hidden' : 'overflow-y-auto p-4 lg:p-6'}`}>
        <Outlet />
      </main>
      <SyncFooter />
    </div>
  )
}

const OWNER_NAV: NavItem[] = [
  { to: '/owner', label: 'Dashboard', icon: 'dashboard' },
  { to: '/owner/laporan', label: 'Laporan Penjualan', icon: 'report' },
  { to: '/owner/laba-rugi', label: 'Laba Rugi', icon: 'chart' },
  { to: '/owner/transaksi', label: 'Transaksi', icon: 'receipt' },
  { to: '/owner/produk', label: 'Stok Produk', icon: 'box' },
  { to: '/owner/pengeluaran', label: 'Pengeluaran', icon: 'wallet' },
]

export function OwnerLayout() {
  const [bukaMobile, setBukaMobile] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout, lastSyncAt } = useSessionStore()

  const aktif = [...OWNER_NAV].sort((a, b) => b.to.length - a.to.length).find((i) =>
    loc.pathname === i.to || (i.to !== '/owner' && loc.pathname.startsWith(i.to + '/')),
  )
  const judul = aktif?.label ?? 'Dashboard Owner'

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-100">
      {/* Top Navbar Sticky */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-xs">
              iPOS
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">Toko Pasar Jaya</p>
                <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/30">
                  OWNER
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pantauan Kinerja Toko / <span className="text-slate-300 font-medium">{judul}</span>
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {OWNER_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/owner'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon name={n.icon} size={15} />
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right lg:block">
              <p className="text-xs font-semibold text-white">{currentUser?.nama}</p>
              <p className="text-[10px] text-slate-400">
                {lastSyncAt ? `Sinkron ${new Date(lastSyncAt).toLocaleTimeString('id-ID')}` : 'Online'}
              </p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              Keluar
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setBukaMobile(!bukaMobile)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 md:hidden"
              aria-label="Buka navigasi"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {bukaMobile && (
          <div className="border-t border-slate-800 bg-slate-900 px-4 py-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {OWNER_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/owner'}
                  onClick={() => setBukaMobile(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon name={n.icon} size={16} />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <SyncFooter />
    </div>
  )
}

