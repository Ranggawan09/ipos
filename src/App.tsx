import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout, KasirLayout, OwnerLayout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ToastHost } from '@/components/ToastHost'
import { Login } from '@/pages/Login'

import { AdminDashboard } from '@/pages/admin/Dashboard'
import { TransaksiAdmin } from '@/pages/admin/Transaksi'
import { Pengguna } from '@/pages/admin/Pengguna'
import { Sinkronisasi } from '@/pages/admin/Sinkronisasi'

import { Produk } from '@/pages/inventory/Produk'
import { Kategori } from '@/pages/inventory/Kategori'
import { Supplier } from '@/pages/inventory/Supplier'
import { BarangMasuk } from '@/pages/inventory/BarangMasuk'
import { StockOpname } from '@/pages/inventory/StockOpname'
import { RiwayatStok } from '@/pages/inventory/RiwayatStok'
import { ImportProduk } from '@/pages/inventory/ImportProduk'

import { KasirPOS } from '@/pages/pos/Kasir'
import { RiwayatKasir } from '@/pages/pos/RiwayatKasir'
import { ShiftPage } from '@/pages/pos/Shift'

import { LaporanPenjualan } from '@/pages/keuangan/Laporan'
import { LabaRugi } from '@/pages/keuangan/LabaRugi'
import { Pengeluaran } from '@/pages/keuangan/Pengeluaran'
import { Rekonsiliasi } from '@/pages/keuangan/Rekonsiliasi'
import { HutangSupplier } from '@/pages/keuangan/Hutang'

import { DashboardOwner } from '@/pages/owner/DashboardOwner'

export default function App() {
  return (
    <HashRouter>
      <ToastHost />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Panel Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="produk" element={<Produk />} />
          <Route path="kategori" element={<Kategori />} />
          <Route path="supplier" element={<Supplier />} />
          <Route path="barang-masuk" element={<BarangMasuk />} />
          <Route path="barang-keluar" element={<Navigate to="/admin/riwayat-stok" replace />} />
          <Route path="stock-opname" element={<StockOpname />} />
          <Route path="riwayat-stok" element={<RiwayatStok />} />
          <Route path="import" element={<ImportProduk />} />
          <Route path="resep-konversi" element={<Navigate to="/admin/produk" replace />} />
          <Route path="pengemasan" element={<Navigate to="/admin/produk" replace />} />
          <Route path="transaksi" element={<TransaksiAdmin />} />
          <Route path="shift" element={<ShiftPage />} />
          <Route path="laporan" element={<LaporanPenjualan />} />
          <Route path="laba-rugi" element={<LabaRugi />} />
          <Route path="pengeluaran" element={<Pengeluaran />} />
          <Route path="rekonsiliasi" element={<Rekonsiliasi />} />
          <Route path="hutang" element={<HutangSupplier />} />
          <Route path="pengguna" element={<Pengguna />} />
          <Route path="sinkronisasi" element={<Sinkronisasi />} />
        </Route>

        {/* Aplikasi Kasir */}
        <Route
          path="/kasir"
          element={
            <ProtectedRoute roles={['kasir', 'admin']}>
              <KasirLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<KasirPOS />} />
          <Route path="riwayat" element={<RiwayatKasir />} />
          <Route path="shift" element={<ShiftPage />} />
        </Route>

        {/* Panel Owner (read-only) */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute roles={['owner']}>
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOwner />} />
          <Route path="laporan" element={<LaporanPenjualan />} />
          <Route path="laba-rugi" element={<LabaRugi />} />
          <Route path="transaksi" element={<TransaksiAdmin />} />
          <Route path="produk" element={<Produk />} />
          <Route path="pengeluaran" element={<Pengeluaran />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}
