# Produk Varian Bobot & Dynamic Shared Pool POS

## 1. Problem Statement
Bagaimana kasir POS dapat menjual produk curah (seperti beras eceran) dalam berbagai varian bobot (5kg, 2kg, 1kg) dengan stok yang langsung terpotong dinamis dari total kg penerimaan barang, tanpa perlu memecah produk menjadi banyak SKU atau melakukan pengemasan manual di sistem?

## 2. Recommended Direction
Menerapkan arsitektur **Master Produk Tunggal dengan Multi-Varian Bobot (Dynamic Shared Pool)**:
- Produk curah (misal: Beras Rojolele) dibuat sebagai 1 master produk ber-SKU tunggal dengan satuan dasar `kg`.
- Master produk memiliki daftar varian bobot (misal: `5 kg`, `2 kg`, `1 kg`) yang masing-masing menyimpan rasio bobot dalam kg dan harga jualnya.
- Pada saat **Penerimaan Barang / Restock**, admin/gudang hanya menginput total kuantitas kg (misal: restock 1 karung = 50 kg). Tidak perlu alokasi manual jumlah bungkus plastik di sistem.
- Di layar **POS Kasir**, produk tampil sebagai 1 kartu dengan indikator total stok kg.
- Saat kartu diklik, modal pilihan varian muncul menampilkan varian ukuran, harga jual, dan kuota sisa yang dapat dijual.
- Saat transaksi selesai, stok induk otomatis berkurang secara proporsional: `stokMaster -= qty × bobotVarian`.

## 3. Key Assumptions & Decisions
- **Pemilihan Varian:** Kasir selalu memilih varian via interaksi layar POS (tidak memerlukan barcode terpisah per varian).
- **Komponen Kemasan:** Harga jual per varian sudah memperhitungkan biaya kantong plastik/kemasan (tidak perlu pelacakan inventori plastik terpisah).
- **Kalkulasi HPP:** HPP transaksi dihitung proporsional dari harga beli per kg induk (`hppVarian = hargaBeliPerKg * bobotVarian`).
- **Validasi Stok Otomatis:** Jika sisa stok induk lebih kecil dari bobot varian (misal stok tinggal 3 kg tapi kasir memilih varian 5 kg), tombol varian tersebut nonaktif (*disabled*).

## 4. MVP Scope
### IN (Tercakup):
- Tipe data `VarianBobot` dan penambahan opsional `varian?: VarianBobot[]` pada entitas `Produk`.
- Penambahan field `varianId?: string`, `namaVarian?: string`, `bobot?: number` pada `DetailTransaksi` dan `CartItem`.
- Form Tambah & Edit Produk di `Produk.tsx` dengan UI input varian bobot dan harga jual.
- Modal pemilihan varian di POS `Kasir.tsx` saat kartu produk yang memiliki varian diklik.
- Pengurangan stok master secara proporsional (`stok -= qty * bobot`) di `buatTransaksi` pada `useDataStore.ts`.
- Tampilan nama varian pada daftar keranjang belanja, ringkasan pembayaran, dan format cetak struk kasir.
- Seed data awal untuk contoh produk varian beras eceran.

### OUT (Tidak Dilakukan):
- Pembuatan SKU terpisah untuk setiap varian.
- Alur pengemasan manual wajib sebelum bisa berjualan.
- Barcode scanner per varian kemasan.
- Integrasi timbangan hardware USB/serial.
- Pelacakan susut/waste per transaksi (tetap dicatat via Stock Opname jika ada selisih fisik).

## 5. Open Questions
*Semua pertanyaan penajaman telah terjawab dan disepakati oleh pengguna.*
