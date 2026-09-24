# Modul Barang Keluar (Cacat & Retur Supplier)

## 1. Problem Statement
Bagaimana pemilik toko retail dapat mencatat dan mengontrol arus barang keluar non-penjualan secara terstruktur di sidebar Admin (khususnya barang cacat/rusak dan barang retur ke supplier), di mana barang cacat secara otomatis dibukukan sebagai kerugian modal (beban pengeluaran operasional toko), sedangkan barang retur memiliki alur pemantauan status klaim bertahap hingga diselesaikan (baik melalui penggantian barang baru yang mengembalikan stok atau kompensasi dana/potong hutang supplier)?

---

## 2. Recommended Direction: Dual-Workflow Inventory Outflow Architecture

Menghadirkan halaman baru **Barang Keluar** pada sidebar Admin tepat di bawah menu **Barang Masuk** (`/admin/barang-keluar`), dengan dua alur kerja spesifik:

```
[ Menu Admin: Inventory ]
  ├── Produk
  ├── Kategori
  ├── Supplier
  ├── Barang Masuk (BM)
  └── Barang Keluar (BK)  <-- [Menu Baru]
```

### A. Alur Barang Cacat (Damage / Waste / Shrinkage)
1. **Pencatatan Cacat**:
   - Admin memilih satu atau beberapa produk yang rusak/kedaluwarsa, memasukkan jumlah kuantitas, dan memilih alasan (misal: *Kedaluwarsa/Basi*, *Kemasan Rusak/Pecah/Bocor*, *Cacat Pabrik*, *Lainnya*).
   - Supplier asal bersifat opsional.
2. **Dampak Otomatis**:
   - **Pemotongan Stok**: Stok produk langsung berkurang secara permanen dengan riwayat mutasi stok `jenis: 'keluar_rusak'`.
   - **Pembukuan Beban Pengeluaran**: Sistem secara otomatis membuat entri transaksi pada modul **Pengeluaran** toko sebesar total modal barang (`qty × hargaBeli`) dengan kategori `operasional_kasir` / `operasional` bertuliskan *Beban Barang Cacat / Rusak: [Nama Barang]* sehingga langsung tercatat di laporan keuangan Laba Rugi toko.
3. **Status**: Langsung berstatus `selesai` (arsip pemusnahan barang rusak).

---

### B. Alur Barang Retur ke Supplier (Supplier Claim Lifecycle)
1. **Pencatatan Retur**:
   - Admin **wajib memilih Supplier** rekanan yang dituju.
   - Memilih produk yang akan diretur ke supplier beserta kuantitas dan alasan klaim retur.
   - Nilai estimasi retur dihitung berdasarkan modal barang (`qty × hargaBeli`).
2. **Tahap 1: Pengiriman Retur (Status: `proses_retur`)**:
   - Stok barang di toko langsung dipotong keluar (karena barang fisik sudah diserahkan/dikirimkan ke supplier).
   - Dicatat pada mutasi pergerakan stok: `jenis: 'retur_supplier'`.
   - Belum memotong kas/pengeluaran toko karena statusnya adalah barang dalam proses klaim garansi/retur.
3. **Tahap 2: Aksi "Selesai di-Retur"**:
   - Pada baris transaksi retur yang berstatus `proses_retur`, terdapat tombol aksi **`Selesaikan Retur`**.
   - Saat diklik, muncul modal dialog penyelesaian dengan opsi:
     - **Opsi 1: Diganti Barang Baru (Recommended Default)**:
       - Supplier mengganti unit barang baru yang utuh.
       - Stok produk otomatis bertambah kembali ke sistem gudang toko (`jenis: 'masuk'`, keterangan: *Penggantian retur selesai dari [Supplier]*).
       - Status transaksi diperbarui menjadi `selesai_retur`.
     - **Opsi 2: Kompensasi Finansial (Potong Hutang / Pengembalian Dana)**:
       - Stok tidak dikembalikan (karena diganti uang/kredit nota).
       - Jika toko memiliki hutang aktif ke supplier tersebut, nilai retur dapat otomatis memotong saldo `HutangSupplier`, atau dicatat sebagai pengurang beban modal.
       - Status transaksi diperbarui menjadi `selesai_retur`.

---

## 3. Key Assumptions & Decisions (Hasil Sharpening)

1. **Harga Acuan**:
   - Nilai barang keluar dan nilai pengeluaran untuk barang cacat dihitung berdasarkan **Harga Beli (HPP modal toko)**, bukan harga jual, karena mencerminkan kerugian modal aktual atas aset toko.
2. **Keterikatan Supplier**:
   - **Retur**: Wajib memilih supplier tujuan agar histori klaim per rekanan supplier terlacak jelas.
   - **Cacat**: Supplier bersifat opsional (karena barang rusak bisa akibat kelalaian operasional internal atau penyimpanan toko).
3. **Cetak Surat Jalan / Bukti Barang Keluar**:
   - Disediakan tombol cetak PDF untuk Surat Jalan Retur Barang ke Supplier (mirip dengan format PO namun berkop *Surat Pengembalian / Retur Barang ke Rekanan*).

---

## 4. MVP Scope

### IN (Tercakup dalam Rilis Pertama):
- **Tipe Data & Model**:
  - `BarangKeluar` & `ItemBarangKeluar` pada `src/types/index.ts`.
  - Penambahan mutasi dan fungsi store di `useDataStore.ts`: `catatBarangKeluar()`, `selesaikanRetur()`, dan `hapusBarangKeluar()`.
- **Navigasi Sidebar Admin**:
  - Penambahan menu `Barang Keluar` (`/admin/barang-keluar`) di bawah `Barang Masuk` pada `ADMIN_NAV` di [Layout.tsx](file:///d:/PROYEK/ipos/src/components/Layout.tsx).
  - Pendaftaran rute di `src/App.tsx`.
- **Halaman [BarangKeluar.tsx](file:///d:/PROYEK/ipos/src/pages/inventory/BarangKeluar.tsx)**:
  - Header dengan ringkasan metrik: Total Barang Keluar, Total Nilai Kerugian Cacat, dan Retur Aktif Menunggu Supplier.
  - Filter kategori: *Semua*, *Cacat*, *Retur (Menunggu)*, *Retur (Selesai)*.
  - Tombol modal **`+ Catat Barang Keluar`** dengan toggle tipe: **Cacat (Pemusnahan)** vs **Retur Supplier**.
  - Tabel interaktif input multi-barang (Nama Produk, Qty, Satuan, Harga Beli, Subtotal, Alasan).
  - Tombol aksi **`Selesaikan Retur`** dengan modal konfirmasi (pilihan: Ganti Barang Baru vs Kompensasi Finansial).
  - Cetak Bukti Barang Keluar / Surat Jalan Retur.
- **Integrasi Stok & Keuangan**:
  - Pemotongan stok otomatis di `PergerakanStok`.
  - Pembuatan otomatis transaksi di modul `Pengeluaran` toko untuk jenis `cacat`.
  - Pengembalian stok otomatis saat retur berstatus selesai ganti barang.

### OUT (Tidak Dilakukan pada MVP):
- Integrasi ekspedisi pelacakan kurir logistik pihak ketiga (JNE/SiCepat).
- Pengembalian sebagian (partial replacement) dalam 1 faktur retur — jika sebagian barang diganti dan sebagian dikembalikan dana, di MVP dicatat sebagai 2 transaksi retur terpisah.

---

## 5. Technical Architecture & Data Schema

```typescript
export type KategoriBarangKeluar = 'cacat' | 'retur'
export type StatusRetur = 'proses_retur' | 'selesai_retur'

export type ItemBarangKeluar = {
  produkId: string
  namaProduk: string
  sku: string
  qty: number
  satuan: string
  hargaBeli: number
  subtotal: number
  alasan?: string
}

export type BarangKeluar = {
  id: string
  nomor: string // Misal: BK/0001/2026
  kategori: KategoriBarangKeluar
  supplierId?: string
  items: ItemBarangKeluar[]
  totalNilai: number
  status: 'selesai' | StatusRetur
  resolusiRetur?: 'ganti_barang' | 'potong_hutang' | 'kembali_dana'
  tanggalKeluar: string
  tanggalSelesai?: string
  pengeluaranId?: string // Referensi ID pengeluaran untuk barang cacat
  userId: string
  catatan?: string
}
```

---

## 6. Open Questions / Next Steps
- Apakah dokumen konsep ini sudah sesuai dan siap diimplementasikan langsung ke kode aplikasi?
