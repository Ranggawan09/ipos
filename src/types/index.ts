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

export type Produk = {
  id: string
  sku: string
  barcode: string
  nama: string
  kategoriId: string
  supplierId?: string
  satuan: string
  hargaBeli: number
  hargaJual: number
  stok: number
  stokMinimum: number
  aktif: boolean
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
  diskonItem: number // nominal rupiah
  subtotal: number
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
  jumlahTransaksi: number
  saldoAkhir?: number
  status: 'buka' | 'tutup'
}

export type Pengeluaran = {
  id: string
  kategori: 'listrik' | 'sewa' | 'gaji' | 'transport' | 'lainnya'
  keterangan: string
  jumlah: number
  tanggal: string
  userId: string
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

export type PenerimaanBarang = {
  id: string
  nomor: string
  supplierId: string
  items: { produkId: string; namaProduk: string; qty: number; hargaBeli: number }[]
  total: number
  metode: 'tunai' | 'kredit'
  jatuhTempo?: string
  userId: string
  waktu: string
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
