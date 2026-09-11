# Realtime Multi-Device Stock Demo (Zero-Config DB)

## Problem Statement
Bagaimana kita mendemonstrasikan fitur multi-kasir secara realtime di mana transaksi di HP Kasir 1 langsung mengurangi stok di HP Kasir 2 secara instan di jaringan WLAN yang sama tanpa perlu konfigurasi database MySQL di shared hosting?

## Recommended Direction
**Local WLAN Relay Hub (dengan Fallback Mode)**
- Menjalankan relay lokal ringan di laptop yang terhubung ke WLAN/Hotspot yang sama.
- HP Kasir 1 dan HP Kasir 2 membuka sistem secara bersamaan di browser masing-masing.
- Ketika salah satu kasir menyelesaikan transaksi, event mutasi stok disiarkan via WebSocket lokal instan (<10ms).
- Store state lokal (Zustand `useDataStore`) langsung memperbarui kuantitas produk dan memberikan feedback visual (animasi badge stok berkurang & toast notifikasi).
- Tidak memerlukan konfigurasi database MySQL ataupun pengaturan cPanel hosting yang rumit.

## Key Assumptions to Validate
- [ ] Kedua HP dapat mengakses IP lokal laptop melalui port 5173 di jaringan WLAN yang sama.
- [ ] Transaksi di Kasir 1 memicu event broadcast `STOCK_MUTATION` dengan payload `{ produkId, qty, sisaStok, kasirNama }`.
- [ ] Layar Kasir dan Inventori di HP 2 langsung memperbarui angka stok tanpa perlu refresh halaman.
- [ ] Validasi stok habis berjalan di kedua kasir sehingga tidak bisa menjual barang melebihi stok yang ada.

## MVP Scope
1. **Local Sync Server (`server/sync-server.js`):**
   - Server WebSocket mini menggunakan modul bawaan Node.js / `ws` ringan tanpa database.
   - Siap dijalankan bersamaan dengan Vite dev server (`npm run dev:lan`).
2. **Client Sync Hook (`src/lib/syncClient.ts` & `src/store/useDataStore.ts`):**
   - Mendeteksi koneksi ke host WebSocket (otomatis terhubung ke `window.location.hostname`).
   - Menerima mutasi stok dan menyinkronkan array `produk` di Zustand store.
   - Mengirim event pengurangan stok setiap kali fungsi transaksi `buatTransaksi` dieksekusi di Kasir.
3. **UI Visual Feedback:**
   - Indikator status koneksi di Header/Nav (hijau "LAN Sync Aktif").
   - Toast interaktif: *"Stok [Nama Produk] berkurang X oleh [Nama Kasir]"*.
   - Badge kuantitas stok di katalog kasir terupdate realtime.

## Not Doing (Untuk Demo)
- Tidak membuat tabel database MySQL di cPanel hosting (menghindari kerumitan kredensial & latensi query).
- Tidak menyinkronkan seluruh riwayat log hutang/pengeluaran/laporan laba rugi massal antar perangkat (fokus 100% pada pergerakan stok realtime).
- Tidak menggunakan sistem auth/session multi-tenant yang berat.

## Open Questions
- Apakah ingin disiapkan juga script helper untuk menampilkan QR Code di terminal/layar laptop agar HP kasir tinggal scan untuk membuka URL LAN?
