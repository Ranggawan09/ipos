# Satuan Bertingkat Dinamis (Multi-Level UOM) & Penetapan Harga Berjenjang

## 1. Problem Statement
Bagaimana pemilik toko retail/pasar dapat mengelola satu SKU produk yang dijual dalam berbagai tingkatan satuan grosir & eceran (misal: Karton → Pax → Renceng → Pcs), dengan penetapan harga beli, margin, dan harga jual independen per satuan, sementara stok fisik tetap terpusat dan dipotong otomatis dari ukuran satuan terkecil (shared base pool)?

## 2. Recommended Direction
Menerapkan arsitektur **Hierarchical Multi-Level UOM with Base-Unit Shared Pool**:

1. **Satuan Terkecil sebagai Satuan Dasar (Base Unit):**
   - Master produk mencatat `satuan` sebagai unit terkecil (misal: `pcs`, `gram`, atau `ml`).
   - Angka `stok` dan `stokMinimum` selalu mengacu pada kuantitas satuan terkecil ini.

2. **Daftar Satuan Bertingkat Dinamis (UOM Ladder):**
   - Di atas satuan dasar, pengguna dapat menambahkan rantai satuan bertingkat (Level 1, Level 2, dst.).
   - Setiap tingkat menentukan:
     - **Nama Satuan**: Dipilih dari dropdown master satuan toko atau ketik langsung satuan baru (misal: `renceng`, `pax`, `karton`, `sak`, `lembar`, `dus`, dll.).
     - **Satuan di Bawahnya (Sub-Unit)**: Satuan yang diwadahi (misal: `karton` mewadahi `pax`, `pax` mewadahi `renceng`, `renceng` mewadahi `pcs`).
     - **Kapasitas / Isi**: Jumlah kuantitas satuan di bawahnya (misal: 1 karton isi 8 pax, 1 pax isi 6 renceng, 1 renceng isi 12 pcs).
     - **Total Multiplier ke Satuan Dasar**: Dihitung otomatis secara cascading (misal: Renceng = 12 pcs, Pax = 72 pcs, Karton = 576 pcs).

3. **Penetapan Harga & Margin Independen per Satuan:**
   - **Harga Beli (Modal)**: Default dihitung otomatis proporsional (`modalDasar × multiplier`), namun admin memiliki opsi **override** jika modal pembelian per karton/grosir lebih murah dari eceran.
   - **Margin (% / Rp)**: Memiliki toggle `%` dan `Rp` untuk masing-masing tingkatan satuan.
   - **Harga Jual**: Dihitung otomatis dari modal + margin satuan tersebut, dan admin dapat meng-override harga bulat pasar (misal eceran 12 pcs = Rp 7.200, tapi jual per renceng = Rp 7.000).

4. **Dropdown Satuan Dinamis (Global Dictionary):**
   - Sistem menyediakan kamus satuan standar: `['pcs', 'kg', 'liter', 'gram', 'ml', 'karton', 'dus', 'pax', 'renceng', 'sak', 'pack', 'lembar', 'bungkus', 'botol', 'kaleng', 'sachet', 'lusin', 'kodi']`.
   - Di input satuan, user dapat memilih yang ada atau mengetikkan nama satuan baru. Satuan baru otomatis disimpan ke kamus toko dan dapat digunakan untuk produk-produk lain.

5. **Interaksi Kasir (POS) & Shared Pool:**
   - Di layar kasir, saat produk multi-satuan/multi-varian diklik, muncul modal seleksi cepat yang menyajikan:
     - Semua opsi satuan bertingkat yang tersedia (Pcs, Renceng, Pax, Karton).
     - Kuota sisa yang dapat dijual untuk masing-masing satuan berdasarkan sisa stok satuan terkecil.
     - Harga per satuan.
   - Saat kasir memilih satuan (misal 1 Karton):
     - Masuk ke keranjang kasir dengan label satuan dan harga yang sesuai.
     - Mengurangi stok satuan dasar sejumlah `qty × multiplier` (misal 1 × 576 pcs).
     - Di invoice/struk tercetak: `1 karton x 310.000`.

6. **Koeksistensi dengan Varian Bobot:**
   - Fitur varian bobot (misal beras 5kg, 2kg, 1kg) tetap dipertahankan dan terintegrasi di modal pemilihan kasir, mendukung harga berbeda per varian di mana kuantitas lebih besar dapat memiliki harga per kg yang lebih ekonomis.

## 3. Key Assumptions & Decisions
- **Stok Tunggal:** Tidak ada stok terpisah per karton atau per renceng di sistem; stok fisik diasumsikan fleksibel dapat dipecah (atau kardus dibuka) sesuai kebutuhan transaksi.
- **Konversi Otomatis:** Perhitungan rantai konversi dilakukan otomatis berdasarkan perkalian hierarki berurutan.
- **Pecahan Satuan (Half-pack / Partial):** Jika pembeli ingin membeli setengah renceng (6 pcs), kasir dapat memilih opsi varian setengah renceng atau memilih kuantitas pcs (6 pcs).

## 4. MVP Scope
### IN (Tercakup):
- Tipe data `SatuanBertingkat` dan penambahan `satuanBertingkat?: SatuanBertingkat[]` pada model `Produk`.
- State master `daftarSatuan: string[]` di `useDataStore` dengan fungsi `tambahSatuanKamus(satuan: string)`.
- Komponen selector satuan dinamis: searchable dropdown dengan tombol `+ Tambah "[input]"` untuk membuat satuan baru secara langsung.
- Bagian form *Satuan Bertingkat* di modal `Produk.tsx`:
  - Input satuan dasar (satuan terkecil) beserta modal, margin, harga jualnya.
  - Tabel/daftar dinamis tingkatan satuan bertingkat (+ Tambah Satuan Bertingkat, Hapus).
  - Kolom nama satuan, isi terhadap satuan di bawahnya, perhitungan total multiplier ke base unit.
  - Kolom modal (proporsional + override), toggle margin %/Rp, harga jual, dan estimasi laba kotor per satuan.
- Pembaruan modal seleksi di POS `Kasir.tsx`:
  - Menampilkan pilihan seluruh satuan bertingkat & varian bobot beserta harga dan kuota maksimal yang tersedia.
  - Masuk ke keranjang dengan satuan dan pengali stok yang tepat.
- Pemotongan stok proporsional di `buatTransaksi` dan pelacakan pergerakan stok.
- Dukungan tampilan di struk belanja dan modal detail transaksi.

### OUT (Fase Berikutnya):
- Barcode scanner terpisah per masing-masing kardus kemasan (bisa ditambahkan nanti pada field opsional `barcodeSatuan`).
- Multi-gudang (lokasi fisik terpisah antara gudang karton dan rak toko).

## 5. Open Questions
Semua pertanyaan awal telah terjawab:
- Rantai bertingkat (Opsi A) dipilih untuk konversi.
- Varian bobot tetap dipisah dan dapat dikombinasikan.
- Modal popup digunakan untuk pemilihan satuan di kasir.
- Default modal proporsional dengan kemampuan override penuh pada modal, margin, dan harga jual.
