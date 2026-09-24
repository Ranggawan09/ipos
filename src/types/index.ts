// Entitas model data operasional iPOS

export type Role = 'admin' | 'kasir' | 'owner'

export type User = {
  id: string
  nama: string
  username: string
  pin: string
  role: Role
  aktif: boolean
}

export type Kategori = {
  id: string
  nama: string
  deskripsi: string
}

export type Supplier = {
  id: string
  nama: string
  kontak: string
  telepon: string
  alamat: string
}

export type VarianBobot = {
  id: string
  nama: string // contoh: "5 kg", "2 kg", "1 kg"
  bobot: number // bobot per kemasan dalam satuan produk (misal 5 untuk 5 kg)
  hargaJual: number
}

export type SatuanBertingkat = {
  id: string
  namaSatuan: string // contoh: "renceng", "pax", "karton"
  satuanTurunan: string // satuan di bawahnya, contoh: "pcs"
  isi: number // isi terhadap satuan di bawahnya (contoh: 12)
  multiplierToBase: number // total pengali ke satuan dasar/terkecil (contoh: 12)
  hargaBeli: number // modal satuan ini (bisa override)
  marginPersen: number // margin %
  hargaJual: number // harga jual satuan ini (bisa override)
  barcode?: string
  isPecahan?: boolean // true jika merupakan sub-satuan pecahan (misal: 1/2 renceng)
  indukSatuan?: string // nama satuan induk (misal: "renceng")
  rasio?: number // rasio terhadap induk (misal: 0.5)
}

export type Produk = {
  id: string
  sku: string
  barcode: string
  nama: string
  kategoriId: string
  supplierId?: string
  satuan: string // Satuan terkecil (Base Unit), misal: 'pcs', 'kg'
  hargaBeli: number // Modal satuan terkecil
  hargaJual: number // Harga jual satuan terkecil
  stok: number // Kuantitas dalam satuan terkecil
  stokMinimum: number // Batas minimum dalam satuan terkecil
  aktif: boolean
  tglExpired?: string // Tanggal kedaluwarsa produk (YYYY-MM-DD)
  varian?: VarianBobot[]
  satuanBertingkat?: SatuanBertingkat[]
}

export type JenisPergerakan =
  | 'masuk'
  | 'penjualan'
  | 'keluar_rusak'
  | 'keluar_hilang'
  | 'retur_supplier'
  | 'retur_pelanggan'
  | 'opname'
  | 'void'
  | 'repack_keluar'
  | 'repack_masuk'
  | 'waste'

export type PergerakanStok = {
  id: string
  produkId: string
  jenis: JenisPergerakan
  jumlah: number // positif = masuk, negatif = keluar
  stokSebelum: number
  stokSesudah: number
  keterangan: string
  referensiId?: string
  userId: string
  waktu: string
}

export type MetodePembayaran = 'tunai' | 'qris' | 'debit'

export type DetailTransaksi = {
  id: string
  produkId: string
  namaProduk: string
  sku: string
  hargaSatuan: number
  hargaBeli: number
  qty: number
  satuan?: string
  satuanId?: string
  multiplier?: number
  diskonItem: number // nominal rupiah
  subtotal: number
  varianId?: string
  namaVarian?: string
  bobot?: number
}

export type StatusTransaksi = 'selesai' | 'void' | 'menunggu_sinkron'

export type Transaksi = {
  id: string
  nomor: string
  shiftId: string
  kasirId: string
  pelanggan?: string
  detail: DetailTransaksi[]
  subtotal: number
  diskonNota: number // nominal rupiah
  diskonNominal: number
  total: number
  hpp: number
  metode: MetodePembayaran
  dibayar: number
  kembalian: number
  status: StatusTransaksi
  voidBy?: string
  voidAlasan?: string
  waktu: string
}

export type Shift = {
  id: string
  kasirId: string
  shiftNomor?: 1 | 2
  waktuBuka: string
  waktuTutup?: string
  saldoAwal: number
  totalPenjualan: number
  totalTunai: number
  totalNonTunai: number
  totalPengeluaran?: number
  jumlahTransaksi: number
  saldoAkhir?: number
  status: 'buka' | 'tutup'
}

export type ItemPengeluaran = {
  nama: string
  qty: number
  harga: number
  subtotal: number
}

export type Pengeluaran = {
  id: string
  kategori: 'listrik' | 'sewa' | 'gaji' | 'transport' | 'lainnya' | 'operasional_kasir'
  keterangan: string
  jumlah: number
  tanggal: string
  userId: string
  shiftId?: string
  items?: ItemPengeluaran[]
}

export type HutangSupplier = {
  id: string
  supplierId: string
  nomorFaktur: string
  jumlah: number
  sisa: number
  jatuhTempo: string
  status: 'belum_lunas' | 'lunas'
  tanggal: string
}

export type ItemPenerimaan = {
  produkId: string
  namaProduk: string
  qty: number
  hargaBeli: number
  satuan?: string
  satuanId?: string
  multiplier?: number
  jumlahStokMasuk?: number
  tglExpired?: string
}

export type PenerimaanBarang = {
  id: string
  nomor: string
  supplierId: string
  items: ItemPenerimaan[]
  total: number
  metode: 'tunai' | 'kredit'
  jatuhTempo?: string
  userId: string
  waktu: string
}

export type KategoriBarangKeluar = 'cacat' | 'retur'
export type StatusBarangKeluar = 'selesai' | 'proses_retur' | 'selesai_retur'
export type ResolusiRetur = 'ganti_barang' | 'potong_hutang' | 'kembali_dana'

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
  nomor: string
  kategori: KategoriBarangKeluar
  supplierId?: string
  items: ItemBarangKeluar[]
  totalNilai: number
  status: StatusBarangKeluar
  resolusiRetur?: ResolusiRetur
  tanggalKeluar: string
  tanggalSelesai?: string
  pengeluaranId?: string
  userId: string
  catatan?: string
}

export type LogSinkron = {
  id: string
  waktu: string
  jenis: 'cloud' | 'lokal'
  jumlahData: number
  keterangan: string
  status: 'sukses' | 'menunggu'
}

// ---- Repack / Pengemasan Curah ke Kemasan ----

export type ItemResep = {
  produkKemasanId: string
  beratPerKemasan: number
}

export type ResepKonversi = {
  id: string
  nama: string
  produkCurahId: string
  beratPerUnit: number
  satuanDasar: string
  items: ItemResep[]
  biayaKemasanPerUnit: number
}

export type ItemPengemasan = {
  produkKemasanId: string
  namaProduk: string
  qty: number
  beratPerKemasan: number
  hppPerKemasan: number
}

export type Pengemasan = {
  id: string
  resepId: string
  resepNama: string
  produkCurahId: string
  namaProdukCurah: string
  jumlahUnitCurah: number
  totalBerat: number
  items: ItemPengemasan[]
  totalBeratKemasan: number
  waste: number
  hppCurahPerSatuan: number
  biayaKemasan: number
  userId: string
  waktu: string
}
