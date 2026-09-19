# Implementasi Komponen CurrencyInput Rupiah pada Kolom Nominal

Menambahkan komponen input mata uang Rupiah (`CurrencyInput`) yang reusable ke dalam design system UI (`src/components/ui.tsx`), serta mengganti seluruh kolom input nominal uang di proyek iPOS dengan komponen baru ini. Input ini memiliki fitur formatting ribuan live (titik pemisah), prefix "Rp" permanen, penanganan nilai internal murni angka (`number`), dan dukungan responsif/varian ukuran.

## Hasil Grill-Me & Keputusan Desain

Berdasarkan kesepakatan interview `/grill-me` sebelumnya:
1. **Perilaku Formatting:** Live formatting dengan separator ribuan titik (`.`) saat pengguna mengetik, dengan nilai internal tetap berupa `number` murni.
2. **Tampilan Visual:** Prefix label "Rp" permanen di sebelah kiri input, teks rapi dengan placeholder default "0".
3. **Cakupan Penggantian:** Khusus kolom nominal Rupiah (harga beli, harga jual, diskon per item, diskon nota, saldo kas, pengeluaran, biaya kemasan, jumlah bayar tunai). Kolom kuantitas, stok, bobot kg/satuan, dan stok minimum **tetap** menggunakan input numerik biasa.
4. **Arsitektur Komponen:** Dibuat sebagai komponen reusable `CurrencyInput` di [src/components/ui.tsx](file:///d:/PROYEK/ipos/src/components/ui.tsx).
5. **Handling Nilai & Edge Cases:** Nilai non-negatif (min 0). Input kosong otomatis merepresentasikan `0`. Saat fokus dengan nilai `0`, input otomatis bersih sehingga kasir/pengguna dapat langsung mengetik nominal tanpa harus menghapus angka `0` terlebih dahulu.

---

## Proposed Changes

### 1. Komponen UI Reusable (`src/components/ui.tsx`)

#### [MODIFY] [ui.tsx](file:///d:/PROYEK/ipos/src/components/ui.tsx)
- Menambahkan komponen `CurrencyInput` dengan spesifikasi:
  - Props:
    - `value?: number`
    - `onChange?: (value: number) => void`
    - `prefix?: string` (default: `"Rp"`)
    - `sizeVariant?: 'sm' | 'md' | 'lg'` (default: `'md'`)
    - `placeholder?: string` (default: `"0"`)
    - `disabled?: boolean`
    - `className?: string`
    - `wrapperClassName?: string`
    - Props HTML input lainnya (`id`, `autoFocus`, `ref`, dll).
  - Mekanisme formatting:
    - Sanitasi input: hanya angka (karakter non-digit dibuang).
    - Menghitung pemisah ribuan otomatis sesuai standar format Indonesia (`10.000`, `1.500.000`).
    - Menjaga posisi kursor saat mengetik agar tidak meloncat ke ujung akhir saat pemisah ribuan disisipkan.
    - Menampilkan prefix "Rp" terintegrasi di sisi kiri tanpa mengganggu padding input.

---

### 2. Modul POS Kasir & Shift (`src/pages/pos/`)

#### [MODIFY] [Kasir.tsx](file:///d:/PROYEK/ipos/src/pages/pos/Kasir.tsx)
Mengganti seluruh input nominal di antarmuka Kasir:
1. **Modal Buka Shift Kasir:**
   - Input `saldo` (Saldo kas awal / modal laci) diganti dengan `CurrencyInput`.
2. **Daftar Keranjang Belanja (Cart Items):**
   - Input potongan diskon per item (`c.diskonItem`) diganti dengan `CurrencyInput` (`sizeVariant="sm"`).
3. **Ringkasan Keranjang Belanja (Cart Footer):**
   - Input diskon nota (`diskonNota`) diganti dengan `CurrencyInput` (`sizeVariant="sm"`).
4. **Modal Pembayaran Kasir (Bayar Tunai):**
   - Input `dibayar` (Jumlah uang tunai yang diterima) diganti dengan `CurrencyInput` (`sizeVariant="lg"`, font tegas). Tombol nominal cepat (pecahan uang) tetap sinkron dan langsung terformat rapi.

#### [MODIFY] [Shift.tsx](file:///d:/PROYEK/ipos/src/pages/pos/Shift.tsx)
1. **Modal Tutup Shift:**
   - Input `saldoAkhir` (Hasil hitung fisik laci kas) diganti dengan `CurrencyInput`. Perhitungan otomatis selisih kas tetap bekerja akurat.

---

### 3. Modul Inventori & Produk (`src/pages/inventory/`)

#### [MODIFY] [Produk.tsx](file:///d:/PROYEK/ipos/src/pages/inventory/Produk.tsx)
1. **Form Modal Master Produk:**
   - Input `form.hargaBeli` (Harga Beli / Modal) diganti dengan `CurrencyInput`.
   - Input `form.hargaJual` (Harga Jual) diganti dengan `CurrencyInput`.
   - Perhitungan margin otomatis antara harga beli dan harga jual tetap berjalan normal.
2. **Tabel Varian Bobot (Shared Pool):**
   - Input `v.hargaJual` per varian bobot (misal 5kg, 2kg, 1kg) diganti dengan `CurrencyInput` (`sizeVariant="sm"`).
   - Input `v.bobot` tetap number biasa karena merepresentasikan berat dalam satuan kg.

#### [MODIFY] [BarangMasuk.tsx](file:///d:/PROYEK/ipos/src/pages/inventory/BarangMasuk.tsx)
1. **Form Penerimaan Barang Masuk:**
   - Input `b.hargaBeli` per baris penerimaan barang diganti dengan `CurrencyInput`.
   - Input `b.qty` tetap input number biasa.
   - Total penerimaan terhitung otomatis secara konsisten.

#### [MODIFY] [ResepKonversi.tsx](file:///d:/PROYEK/ipos/src/pages/inventory/ResepKonversi.tsx)
1. **Form Resep Konversi Curah:**
   - Input `form.biayaKemasanPerUnit` (Biaya kemasan per eksekusi) diganti dengan `CurrencyInput`.
   - Input berat curah dan varian kemasan tetap menggunakan input number biasa.

---

### 4. Modul Keuangan (`src/pages/keuangan/`)

#### [MODIFY] [Pengeluaran.tsx](file:///d:/PROYEK/ipos/src/pages/keuangan/Pengeluaran.tsx)
1. **Modal Tambah / Ubah Pengeluaran Operasional:**
   - Input `form.jumlah` (Nominal pengeluaran dalam Rp) diganti dengan `CurrencyInput`.

---

## Verification Plan

### Automated / Build Verification
- Jalankan typecheck TypeScript dan build Vite:
  ```powershell
  rtk npm run build
  ```

### Manual Verification Flow
1. **Verifikasi Komponen `CurrencyInput` di Master Produk:**
   - Buka menu `Inventori > Data Produk`.
   - Klik `+ Tambah Produk`.
   - Ketik angka pada `Harga Beli` (misal ketik `50000`) -> pastikan otomatis tertulis `Rp 50.000`.
   - Masukkan Margin `20%` -> pastikan `Harga Jual` otomatis terisi dan terformat `Rp 60.000`.
   - Tambah Varian Bobot -> isi `Harga Jual` varian dengan `CurrencyInput` dan pastikan tersimpan dengan benar.
2. **Verifikasi POS Kasir & Pembayaran:**
   - Buka `POS > Kasir`.
   - Masukkan produk ke keranjang belanja.
   - Ubah `Diskon per Item` dan `Diskon Nota` dengan mengetik angka -> pastikan separator ribuan muncul secara live.
   - Klik `Bayar` (metode Tunai) -> ketik nominal bayar atau klik pecahan uang cepat -> pastikan nominal terformat rapi dan perhitungan kembalian akurat.
3. **Verifikasi Tutup Shift & Pengeluaran:**
   - Buka `POS > Shift` -> Tutup Shift -> isi saldo fisik dengan `CurrencyInput`.
   - Buka `Keuangan > Pengeluaran` -> Catat pengeluaran baru dengan `CurrencyInput`.
