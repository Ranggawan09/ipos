# Filter Kalender 1 Hari & Expandable Transaksi pada Laporan Penjualan

## 1. Problem Statement
**How Might We:** Bagaimana pemilik toko atau admin keuangan dapat meninjau kinerja penjualan pada satu hari tertentu secara spesifik melalui pemilih tanggal (kalender), serta membedah (*drill-down*) setiap transaksi langsung di tempat (*inline expandable accordion*) untuk melihat rincian barang belanjaan, satuan kemasan yang terjual, dan kontribusi labanya tanpa harus berpindah ke modul transaksi kasir?

---

## 2. Recommended Direction
Menerapkan arsitektur **Single-Day Deep-Dive with Inline Accordion Items**:

1. **Opsi Periode Kalender 1 Hari Spesifik:**
   - Menambahkan opsi `"1 Hari Spesifik (Kalender)"` pada dropdown **Grup Periode** (bersanding dengan *Rekap Harian (Semua Tanggal)*, *Per Shift*, *Mingguan*, dan *Bulanan*).
   - Ketika opsi ini dipilih, muncul input kalender interaktif (`<input type="date" />`) yang default-nya adalah tanggal hari ini (atau tanggal transaksi terakhir).
   - Pengguna dapat memilih tanggal manapun di masa lalu dengan 1 klik untuk mengisolasi pembukuan hari tersebut.

2. **Sinkronisasi StatCard Finansial Harian:**
   - StatCard di atas tabel (*Total Omzet, Total HPP, Laba Kotor, Jumlah Transaksi*) otomatis menghitung metrik finansial murni untuk tanggal yang dipilih pada kalender.
   - Tetap terintegrasi penuh dengan **Filter Shift (Shift 1 / Shift 2)** dan **Filter Kategori Produk** yang sudah ada.

3. **Tabel Transaksi dengan Inline Expandable Accordion:**
   - Menampilkan seluruh transaksi yang terjadi pada tanggal terpilih (terurut dari transaksi terbaru ke terlama).
   - Setiap baris transaksi memiliki tombol chevron expand/collapse (`▼` / `▶`).
   - Ketika baris transaksi di-expand, terbuka sub-panel (*accordion row*) tepat di bawahnya secara mulus (*inline*), menampilkan tabel rincian item belanja:
     - Nomor urut
     - Nama Produk & SKU
     - Satuan yang dibeli (misal: `1 karton`, `2 renceng`, `500 gram`, `1 pcs`)
     - Kuantitas (Qty)
     - Harga Satuan
     - Subtotal
     - Ringkasan Diskon Nota, Metode Pembayaran, Kasir yang bertugas, dan Jam transaksi.
   - Dilengkapi tombol **"Buka Semua"** / **"Tutup Semua"** untuk kemudahan audit cepat semua transaksi sekaligus.

4. **Ekspor & Cetak Terpadu Harian:**
   - Tombol **Export XLS** dan **Cetak PDF** otomatis menyesuaikan: menghasilkan rekapan transaksi dan rincian item untuk tanggal yang sedang dibuka.

---

## 3. Key Assumptions & Decisions
- **Fokus Audit Cepat:** Pengguna membutuhkan Laporan Penjualan bukan hanya untuk angka rekap makro, tapi juga verifikasi mikroskopis: "Barang apa saja yang laku di transaksi jam 10 pagi saat Shift 1?".
- **Inline vs Modal:** Menggunakan ekspansi baris (*inline accordion*) jauh lebih cepat dan tidak melelahkan dibanding membuka-tutup modal pop-up berulang kali ketika menelusuri puluhan transaksi.
- **Konsistensi Satuan Multi-Level:** Rincian belanjaan harus menampilkan nama satuan kemasan riil yang dibeli pelanggan (misal `karton` atau `renceng`), bukan hanya konversi pcs.

---

## 4. MVP Scope

### IN (Tercakup):
- Tambahan opsi periode `kalender` ("1 Hari Spesifik (Kalender)") pada [Laporan.tsx](file:///d:/PROYEK/ipos/src/pages/keuangan/Laporan.tsx).
- Kontrol input tanggal (`<input type="date" />`) dengan shortcut cepat tombol "Hari Ini", "Kemarin", dan navigasi tanggal `[<]` `[>]`.
- State `expandedTrxIds: Set<string>` untuk mengontrol baris mana saja yang sedang terbuka accordion-nya.
- Sub-tabel inline untuk baris transaksi yang di-expand:
  - Rincian item (`nama`, `satuan`, `qty`, `harga`, `subtotal`).
  - Total transaksi, diskon, bayar, kembalian.
  - Nama kasir dan jam transaksi.
- Tombol *Toggle Expand All* (`Buka Semua Rincian` / `Tutup Semua Rincian`).
- Sinkronisasi filter Shift (Shift 1 / Shift 2) dan Kategori pada transaksi harian.
- Penyesuaian ringkasan StatCard dan fungsi Cetak/Export untuk mode 1 hari spesifik.

### OUT / NOT DOING (Dikeluarkan demi Fokus):
- *Mengedit/Void transaksi dari halaman Laporan*: Pembatalan transaksi tetap merupakan wewenang halaman khusus [Transaksi.tsx](file:///d:/PROYEK/ipos/src/pages/admin/Transaksi.tsx) dengan otorisasi PIN Admin demi keamanan kas.
- *Date range picker kompleks (pilih dari tanggal X ke Y)*: Permintaan pengguna spesifik adalah kalender untuk **1 hari**. Date range sudah terfasilitasi di menu Transaksi Kasir, sehingga Laporan tetap fokus pada penutupan buku harian yang tajam.
- *Grafik hourly breakdown (per jam)*: Disimpan untuk iterasi berikutnya agar halaman tetap ringan dan cepat dimuat.

---

## 5. Verification Plan
1. Pilih periode "1 Hari Spesifik (Kalender)".
2. Pilih tanggal yang memiliki beberapa transaksi.
3. Pastikan StatCard mencerminkan total omzet, HPP, laba, dan jumlah transaksi pada tanggal tersebut.
4. Klik tombol expand pada salah satu transaksi; pastikan daftar barang (beserta nama satuan, qty, harga, subtotal) muncul rapi di bawah baris transaksi.
5. Uji tombol "Buka Semua" dan "Tutup Semua".
6. Uji filter Shift (Shift 1 vs Shift 2) untuk memastikan transaksi hari tersebut terfilter dengan akurat.
7. Jalankan typecheck TypeScript (`rtk npm run typecheck`) untuk memastikan integritas kode.
