import type {
  BarangKeluar,
  HutangSupplier,
  Kategori,
  MetodePembayaran,
  PenerimaanBarang,
  Pengeluaran,
  PergerakanStok,
  Produk,
  ResepKonversi,
  Pengemasan as TPengemasan,
  Shift,
  Supplier,
  Transaksi,
  User,
} from '@/types'

// ---- Seed data dummy toko retail pasar ----------------------------------
// Semua data dibuat deterministik (PRNG sederhana) agar tampilan konsisten.

let seed = 20260910
function rnd() {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}
function int(min: number, max: number) {
  return Math.floor(rnd() * (max - min + 1)) + min
}

export const uid = (prefix: string, n: number) =>
  `${prefix}-${String(n).padStart(4, '0')}`

export const KATEGORI_SEED: Kategori[] = [
  { id: 'KAT-01', nama: 'Sembako', deskripsi: 'Beras, gula, minyak, tepung' },
  { id: 'KAT-02', nama: 'Minuman', deskripsi: 'Air mineral, soda, sirup, kopi sachet' },
  { id: 'KAT-03', nama: 'Makanan Ringan', deskripsi: 'Biskuit, keripik, wafer, permen' },
  { id: 'KAT-04', nama: 'Bumbu Dapur', deskripsi: 'Garam, kecap, saus, rempah' },
  { id: 'KAT-05', nama: 'Perawatan Diri', deskripsi: 'Sabun, shampo, pasta gigi' },
  { id: 'KAT-06', nama: 'Kebutuhan Rumah', deskripsi: 'Deterjen, pembersih, tisu' },
  { id: 'KAT-07', nama: 'Rokok', deskripsi: 'Berbagai merek rokok' },
  { id: 'KAT-08', nama: 'Alat Tulis', deskripsi: 'Pulpen, buku, penghapus' },
]

export const SUPPLIER_SEED: Supplier[] = [
  { id: 'SUP-01', nama: 'CV Sumber Rejeki', kontak: 'Budi Hartono', telepon: '0812-3456-7890', alamat: 'Pasar Induk Blok A No. 12, Jakarta' },
  { id: 'SUP-02', nama: 'PT Anugerah Pangan', kontak: 'Siti Aminah', telepon: '0813-9988-7766', alamat: 'Jl. Industri Raya No. 45, Bekasi' },
  { id: 'SUP-03', nama: 'UD Makmur Jaya', kontak: 'Hendra Wijaya', telepon: '0857-1122-3344', alamat: 'Pasar Tanah Abang Blok C No. 3' },
  { id: 'SUP-04', nama: 'PT Sejahtera Abadi', kontak: 'Dewi Lestari', telepon: '0821-5566-7788', alamat: 'Jl. Raya Bogor KM 27, Depok' },
  { id: 'SUP-05', nama: 'UD Barokah', kontak: 'Ahmad Fauzi', telepon: '0878-3344-5566', alamat: 'Pasar Minggu Blok D No. 8' },
  { id: 'SUP-06', nama: 'PT Nusantara Distribusi', kontak: 'Rina Marlina', telepon: '0811-2233-4455', alamat: 'Kawasan Industri Pulogadung, Jakarta' },
]

export const USER_SEED: User[] = [
  { id: 'USR-01', nama: 'Administrator Toko', username: 'admin', pin: '1234', role: 'admin', aktif: true },
  { id: 'USR-02', nama: 'Rina Kasir', username: 'rina', pin: '1111', role: 'kasir', aktif: true },
  { id: 'USR-03', nama: 'Dedi Kasir', username: 'dedi', pin: '2222', role: 'kasir', aktif: true },
  { id: 'USR-04', nama: 'Sari Kasir', username: 'sari', pin: '3333', role: 'kasir', aktif: true },
  { id: 'USR-05', nama: 'Tono Kasir', username: 'tono', pin: '4444', role: 'kasir', aktif: true },
  { id: 'USR-06', nama: 'H. Pak Owner', username: 'owner', pin: '9999', role: 'owner', aktif: true },
]

// Template nama produk per kategori: [nama, satuan, hargaBeli kira-kira]
const TEMPLATE: Record<string, [string, string, number][]> = {
  'KAT-01': [
    ['Beras Premium 5kg', 'sak', 62000], ['Beras Medium 5kg', 'sak', 55000],
    ['Gula Pasir 1kg', 'pcs', 14000], ['Minyak Goreng 2L', 'pouch', 32000],
    ['Minyak Goreng 1L', 'pouch', 17000], ['Tepung Terigu 1kg', 'pcs', 11000],
    ['Beras Premium 10kg', 'sak', 120000], ['Gula Merah 500g', 'pcs', 8000],
    ['Mie Instan Goreng', 'dus', 105000], ['Mie Instan Kuah', 'dus', 100000],
    ['Telur Ayam 1kg', 'kg', 26000], ['Daging Ayam Fillet 500g', 'pack', 28000],
    ['Tempe', 'papan', 5000], ['Tahu Putih', 'bungkus', 6000],
    ['Beras Ketan 1kg', 'pcs', 16000],
    // ── CURAH: Gula ──
    ['Gula Pasir Curah 50kg', 'sak', 350000],
    ['Gula Pasir Eceran 1kg', 'pcs', 7000],
    ['Gula Pasir Eceran 500g', 'pcs', 3500],
    ['Gula Pasir Eceran 250g', 'pcs', 1750],
    // ── CURAH: Beras ──
    ['Beras Curah 50kg', 'sak', 600000],
    ['Beras Eceran 5kg', 'pcs', 60000],
    ['Beras Eceran 2kg', 'pcs', 24000],
    ['Beras Eceran 1kg', 'pcs', 12000],
    // ── VARIAN BOBOT: Beras Rojolele ──
    ['Beras Rojolele Curah', 'kg', 12000],
    // ── CURAH: Minyak Goreng ──
    ['Minyak Goreng Curah 18L', 'jerigen', 270000],
    ['Minyak Goreng Eceran 1L', 'botol', 15000],
    ['Minyak Goreng Eceran 500ml', 'botol', 7500],
    // ── CURAH: Tepung Terigu ──
    ['Tepung Terigu Curah 25kg', 'sak', 175000],
    ['Tepung Terigu Eceran 1kg', 'pcs', 7000],
    ['Tepung Terigu Eceran 500g', 'pcs', 3500],
  ],
  'KAT-02': [
    ['Air Mineral 600ml', 'dus', 42000], ['Air Mineral 1500ml', 'dus', 55000],
    ['Air Mineral Galon', 'galon', 18000], ['Teh Kotak 250ml', 'dus', 48000],
    ['Kopi Sachet', 'renceng', 12000], ['Susu Kental Manis', 'kaleng', 11000],
    ['Susu UHT 1L', 'kotak', 18000], ['Sirup Marjan', 'botol', 22000],
    ['Soda Cola 390ml', 'dus', 52000], ['Minuman Isotonik', 'dus', 60000],
    ['Kopi Bubuk 250g', 'bungkus', 25000], ['Teh Celup', 'kotak', 9000],
    ['Susu Bubuk 400g', 'kotak', 45000], ['Jus Buah Kemasan', 'dus', 55000],
    // ── CURAH: Kopi ──
    ['Kopi Bubuk Curah 5kg', 'karung', 350000],
    ['Kopi Bubuk Eceran 250g', 'pcs', 17500],
    ['Kopi Bubuk Eceran 100g', 'pcs', 7000],
  ],
  'KAT-03': [
    ['Biskuit Kelapa', 'renceng', 9000], ['Wafer Cokelat', 'renceng', 10000],
    ['Keripik Kentang', 'pcs', 12000], ['Kacang Atom', 'renceng', 8000],
    ['Permen Mint', 'toples', 15000], ['Cokelat Batang', 'pcs', 10000],
    ['Biskuit Cokelat', 'renceng', 11000], ['Kerupuk Udang', 'bungkus', 7000],
    ['Kacang Kulit', 'bungkus', 9000], ['Roti Tawar', 'bungkus', 14000],
    ['Roti Manis', 'pcs', 5000], ['Snack Jagung', 'pcs', 8000],
    ['Wafer Keju', 'renceng', 10000], ['Biskuit Marie', 'renceng', 9500],
  ],
  'KAT-04': [
    ['Garam Halus 500g', 'pcs', 4000], ['Kecap Manis 520ml', 'botol', 15000],
    ['Saus Sambal 340ml', 'botol', 14000], ['Saus Tomat 340ml', 'botol', 13000],
    ['Penyedap Rasa', 'pcs', 3000], ['Merica Bubuk', 'sachet', 2500],
    ['Bawang Merah 1kg', 'kg', 32000], ['Bawang Putih 1kg', 'kg', 28000],
    ['Cabai Merah 1kg', 'kg', 42000], ['Kemiri 250g', 'pcs', 15000],
    ['Ketumbar Bubuk', 'sachet', 3000], ['Asam Jawa', 'bungkus', 5000],
    ['Kunyit Bubuk', 'sachet', 2500], ['Daun Salam', 'bungkus', 3000],
    // ── CURAH: Garam ──
    ['Garam Curah 50kg', 'sak', 100000],
    ['Garam Eceran 500g', 'pcs', 1000],
    ['Garam Eceran 250g', 'pcs', 500],
    // ── CURAH: Kecap ──
    ['Kecap Manis Curah 5L', 'jerigen', 80000],
    ['Kecap Manis Eceran 500ml', 'botol', 8000],
    ['Kecap Manis Eceran 250ml', 'botol', 4000],
    ['Kecap Manis Eceran 100ml', 'botol', 1600],
  ],
  'KAT-05': [
    ['Sabun Mandi Batang', 'pcs', 4500], ['Sabun Cair 450ml', 'botol', 22000],
    ['Shampo Sachet', 'renceng', 10000], ['Shampo Botol 170ml', 'botol', 25000],
    ['Pasta Gigi 190g', 'pcs', 16000], ['Sikat Gigi', 'pcs', 8000],
    ['Deodoran Roll', 'pcs', 18000], ['Sabun Cuci Muka', 'pcs', 20000],
    ['Minya Rambut', 'botol', 15000], ['Bedak Bayi', 'pcs', 17000],
  ],
  'KAT-06': [
    ['Deterjen Bubuk 1kg', 'pcs', 18000], ['Deterjen Cair 800ml', 'pouch', 20000],
    ['Sabun Cuci Piring 800ml', 'botol', 17000], ['Pemutih Pakaian 1L', 'botol', 16000],
    ['Pembersih Lantai 800ml', 'botol', 15000], ['Tisu Wajah', 'kotak', 12000],
    ['Tisu Gulung', 'pack', 14000], ['Sapu Ijuk', 'pcs', 20000],
    ['Pel Lantai', 'pcs', 22000], ['Spons Cuci', 'pack', 8000],
    ['Kantong Plastik 1kg', 'pack', 12000], ['Pewangi Pakaian 500ml', 'botol', 13000],
    // ── CURAH: Deterjen ──
    ['Deterjen Bubuk Curah 25kg', 'sak', 350000],
    ['Deterjen Bubuk Eceran 1kg', 'pcs', 14000],
    ['Deterjen Bubuk Eceran 500g', 'pcs', 7000],
    // ── CURAH: Sabun Cuci Piring ──
    ['Sabun Cuci Piring Curah 5L', 'jerigen', 65000],
    ['Sabun Cuci Piring Eceran 500ml', 'botol', 6500],
    ['Sabun Cuci Piring Eceran 250ml', 'botol', 3250],
  ],
  'KAT-07': [
    ['Rokok Filter A 12', 'bungkus', 23000], ['Rokok Filter A 16', 'bungkus', 30000],
    ['Rokok Merah B 12', 'bungkus', 24000], ['Rokok Merah B 16', 'bungkus', 31000],
    ['Rokok Mild C 16', 'bungkus', 33000], ['Rokok Mild C 12', 'bungkus', 25000],
    ['Rokok Kretek D', 'bungkus', 22000], ['Rokok Slim E', 'bungkus', 34000],
    ['Rokok Filter A 20', 'bungkus', 37000], ['Rokok Mild C 20', 'bungkus', 40000],
  ],
  'KAT-08': [
    ['Pulpen Standar', 'pcs', 2000], ['Pensil 2B', 'pcs', 2500],
    ['Buku Tulis 38 lembar', 'pcs', 4000], ['Buku Tulis 58 lembar', 'pcs', 6000],
    ['Penghapus', 'pcs', 2000], ['Penggaris 30cm', 'pcs', 3500],
    ['Spidol Whiteboard', 'pcs', 7000], ['Lem Kertas', 'pcs', 3000],
    ['Gunting', 'pcs', 8000], ['Stabilo', 'pcs', 9000],
  ],
}

const KAT_SUPPLIER_MAP: Record<string, string> = {
  'KAT-01': 'SUP-01', // Sembako & Curah -> CV Sumber Rejeki
  'KAT-02': 'SUP-02', // Makanan Ringan -> PT Anugerah Pangan
  'KAT-03': 'SUP-03', // Minuman -> UD Makmur Jaya
  'KAT-04': 'SUP-04', // Bumbu Dapur -> PT Sejahtera Abadi
  'KAT-05': 'SUP-05', // Perlengkapan Mandi -> UD Barokah
  'KAT-06': 'SUP-06', // Rumah Tangga -> PT Nusantara Distribusi
  'KAT-07': 'SUP-01', // Rokok -> CV Sumber Rejeki
  'KAT-08': 'SUP-03', // ATK -> UD Makmur Jaya
}

export function buildProduk(): Produk[] {
  const list: Produk[] = []
  let n = 1
  KATEGORI_SEED.forEach((kat) => {
    TEMPLATE[kat.id].forEach(([nama, satuan, hargaBeli]) => {
      const margin = 1.12 + rnd() * 0.25
      const hargaJual = Math.round((hargaBeli * margin) / 100) * 100
      const stokMin = kat.id === 'KAT-07' ? 20 : int(5, 15)
      let stok = int(10, 120)

      // Pemetaan supplier: Contoh khusus sesuai kebutuhan toko
      // Supplier B (PT Anugerah Pangan): Beras, Minyak
      // Supplier A (CV Sumber Rejeki): Gula, Susu, Tepung
      let supplierId = KAT_SUPPLIER_MAP[kat.id] || 'SUP-01'
      const namaLower = nama.toLowerCase()
      if (namaLower.includes('beras') || namaLower.includes('minyak')) {
        supplierId = 'SUP-02' // PT Anugerah Pangan
      } else if (namaLower.includes('gula') || namaLower.includes('tepung') || namaLower.includes('susu')) {
        supplierId = 'SUP-01' // CV Sumber Rejeki
      }

      // Buat beberapa produk sembako kunci berada dalam kondisi stok menipis (kritis)
      if (
        nama === 'Gula Pasir 1kg' ||
        nama === 'Tepung Terigu 1kg' ||
        nama === 'Beras Premium 5kg' ||
        nama === 'Minyak Goreng 2L'
      ) {
        stok = int(1, 3) // pasti di bawah stokMin (misal stok = 2, min = 10)
      } else if (rnd() < 0.12) {
        stok = int(0, stokMin)
      }

      const prod: Produk = {
        id: `PRD-${String(n).padStart(4, '0')}`,
        sku: `SKU${String(n).padStart(4, '0')}`,
        barcode: `899${String(1000000 + n).slice(-7)}`,
        nama,
        kategoriId: kat.id,
        supplierId,
        satuan,
        hargaBeli,
        hargaJual,
        stok,
        stokMinimum: stokMin,
        aktif: true,
        tglExpired: ['KAT-01', 'KAT-02', 'KAT-03', 'KAT-04'].includes(kat.id)
          ? isoDaysAgo(-int(60, 360)).split('T')[0]
          : undefined,
      }

      // Produk varian bobot: Beras Rojolele Curah
      if (nama === 'Beras Rojolele Curah') {
        prod.stok = 50
        prod.varian = [
          { id: 'VRN-BRC-5', nama: '5 kg', bobot: 5, hargaJual: 70000 },
          { id: 'VRN-BRC-2', nama: '2 kg', bobot: 2, hargaJual: 30000 },
          { id: 'VRN-BRC-1', nama: '1 kg', bobot: 1, hargaJual: 15000 },
        ]
      }

      list.push(prod)
      n++
    })
  })
  return list
}

// --- Helper tanggal -------------------------------------------------------
export function isoDaysAgo(days: number, hour = 9, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const KASIR_IDS = ['USR-02', 'USR-03', 'USR-04', 'USR-05']

export function buildShiftDanTransaksi(produk: Produk[]) {
  const shifts: Shift[] = []
  const transaksi: Transaksi[] = []
  const pergerakan: PergerakanStok[] = []
  let trxNo = 1
  let shiftNo = 1
  let movNo = 1

  // 30 hari terakhir, masing-masing 1-2 shift
  for (let hari = 30; hari >= 1; hari--) {
    const jumlahShift = hari % 3 === 0 ? 2 : 1
    for (let s = 0; s < jumlahShift; s++) {
      const kasirId = pick(KASIR_IDS)
      const jamBuka = s === 0 ? 8 : 15
      const waktuBuka = isoDaysAgo(hari, jamBuka, int(0, 20))
      const waktuTutup = isoDaysAgo(hari, jamBuka + 6, int(30, 59))
      const saldoAwal = 200000
      const shiftId = `SHF-${String(shiftNo).padStart(4, '0')}`

      const jmlTrx = int(4, 9)
      let totalPenjualan = 0
      let totalTunai = 0
      let totalNonTunai = 0

      for (let t = 0; t < jmlTrx; t++) {
        const nItem = int(1, 4)
        const detail = []
        let subtotal = 0
        let hpp = 0
        for (let i = 0; i < nItem; i++) {
          const p = pick(produk)
          const qty = int(1, 4)
          const diskonItem = rnd() < 0.12 ? pick([2000, 5000]) : 0
          const subtotalItem = Math.max(0, p.hargaJual * qty - diskonItem)
          detail.push({
            id: `DTL-${trxNo}-${i + 1}`,
            produkId: p.id,
            namaProduk: p.nama,
            sku: p.sku,
            hargaSatuan: p.hargaJual,
            hargaBeli: p.hargaBeli,
            qty,
            satuan: p.satuan || 'pcs',
            diskonItem,
            subtotal: subtotalItem,
          })
          subtotal += subtotalItem
          hpp += p.hargaBeli * qty
        }
        const diskonNota = rnd() < 0.08 ? 10000 : 0
        const diskonNominal = Math.min(subtotal, Math.max(0, diskonNota))
        const total = Math.max(0, subtotal - diskonNominal)
        const metode = rnd() < 0.7 ? 'tunai' : pick<MetodePembayaran>(['qris', 'debit'])
        const dibayar = metode === 'tunai' ? Math.ceil(total / 5000) * 5000 : total
        const waktu = isoDaysAgo(hari, jamBuka + int(0, 5), int(0, 59))

        transaksi.push({
          id: `TRX-${String(trxNo).padStart(5, '0')}`,
          nomor: `INV/${new Date(waktu).toISOString().slice(0, 10).replace(/-/g, '')}/${String(trxNo).padStart(4, '0')}`,
          shiftId,
          kasirId,
          detail,
          subtotal,
          diskonNota,
          diskonNominal,
          total,
          hpp,
          metode,
          dibayar,
          kembalian: dibayar - total,
          status: 'selesai',
          waktu,
        })

        detail.forEach((d, idx) => {
          pergerakan.push({
            id: `MOV-${String(movNo++).padStart(5, '0')}`,
            produkId: d.produkId,
            jenis: 'penjualan',
            jumlah: -d.qty,
            stokSebelum: 0,
            stokSesudah: 0,
            keterangan: `Penjualan ${String(trxNo).padStart(5, '0')}`,
            referensiId: `TRX-${String(trxNo).padStart(5, '0')}`,
            userId: kasirId,
            waktu: isoDaysAgo(hari, jamBuka + int(0, 5), int(0, 59) + idx),
          })
        })

        totalPenjualan += total
        if (metode === 'tunai') totalTunai += total
        else totalNonTunai += total
        trxNo++
      }

      shifts.push({
        id: shiftId,
        kasirId,
        shiftNomor: (((shiftNo - 1) % 2) + 1) as 1 | 2,
        waktuBuka,
        waktuTutup,
        saldoAwal,
        totalPenjualan,
        totalTunai,
        totalNonTunai,
        jumlahTransaksi: jmlTrx,
        saldoAkhir: saldoAwal + totalTunai,
        status: 'tutup',
      })
      shiftNo++
    }
  }

  return { shifts, transaksi, pergerakan }
}

export function buildPengeluaran(): Pengeluaran[] {
  const list: Pengeluaran[] = []
  const kat: Pengeluaran['kategori'][] = ['listrik', 'transport', 'lainnya', 'gaji', 'sewa']
  let n = 1
  for (let hari = 30; hari >= 1; hari -= 3) {
    const k = pick(kat)
    const nominal: Record<string, number> = {
      listrik: int(150000, 450000),
      sewa: 2500000,
      gaji: int(1800000, 2200000),
      transport: int(50000, 200000),
      lainnya: int(30000, 150000),
    }
    list.push({
      id: `EXP-${String(n).padStart(4, '0')}`,
      kategori: k,
      keterangan:
        k === 'listrik' ? 'Token listrik toko' :
        k === 'sewa' ? 'Sewa kios bulanan' :
        k === 'gaji' ? 'Gaji karyawan' :
        k === 'transport' ? 'Biaya transport belanja' : 'Kebutuhan operasional',
      jumlah: nominal[k],
      tanggal: isoDaysAgo(hari, 10, 0),
      userId: 'USR-01',
    })
    n++
  }
  return list
}

export function buildHutang(): HutangSupplier[] {
  return [
    { id: 'HTG-0001', supplierId: 'SUP-01', nomorFaktur: 'FK/SR/2026/0341', jumlah: 4250000, sisa: 4250000, jatuhTempo: isoDaysAgo(-7), status: 'belum_lunas', tanggal: isoDaysAgo(14) },
    { id: 'HTG-0002', supplierId: 'SUP-02', nomorFaktur: 'FK/AP/2026/0198', jumlah: 6800000, sisa: 3400000, jatuhTempo: isoDaysAgo(-3), status: 'belum_lunas', tanggal: isoDaysAgo(20) },
    { id: 'HTG-0003', supplierId: 'SUP-04', nomorFaktur: 'FK/SA/2026/0077', jumlah: 2950000, sisa: 0, jatuhTempo: isoDaysAgo(5), status: 'lunas', tanggal: isoDaysAgo(25) },
    { id: 'HTG-0004', supplierId: 'SUP-06', nomorFaktur: 'FK/ND/2026/0455', jumlah: 12400000, sisa: 12400000, jatuhTempo: isoDaysAgo(-12), status: 'belum_lunas', tanggal: isoDaysAgo(5) },
  ]
}

export function buildPenerimaan(produk: Produk[]): PenerimaanBarang[] {
  const list: PenerimaanBarang[] = []
  for (let i = 0; i < 8; i++) {
    const supplier = pick(SUPPLIER_SEED)
    const nItem = int(2, 5)
    const items = []
    let total = 0
    for (let j = 0; j < nItem; j++) {
      const p = pick(produk)
      const qty = int(5, 40)
      items.push({
        produkId: p.id,
        namaProduk: p.nama,
        qty,
        hargaBeli: p.hargaBeli,
        tglExpired: p.tglExpired || isoDaysAgo(-int(90, 365)).split('T')[0],
      })
      total += p.hargaBeli * qty
    }
    const kredit = rnd() < 0.3
    list.push({
      id: `RCV-${String(i + 1).padStart(4, '0')}`,
      nomor: `BM/${String(i + 1).padStart(4, '0')}/2026`,
      supplierId: supplier.id,
      items,
      total,
      metode: kredit ? 'kredit' : 'tunai',
      jatuhTempo: kredit ? isoDaysAgo(-30) : undefined,
      userId: 'USR-01',
      waktu: isoDaysAgo(30 - i * 3, 9, 30),
    })
  }
  return list
}

// ---- Repack seed ---------------------------------------------------------

// Mapping nama produk curah ke config repack
const REPACK_MAP: {
  curah: string
  beratPerUnit: number
  satuanDasar: string
  kemasan: { nama: string; berat: number }[]
}[] = [
  {
    curah: 'Gula Pasir Curah 50kg',
    beratPerUnit: 50,
    satuanDasar: 'kg',
    kemasan: [
      { nama: 'Gula Pasir Eceran 1kg', berat: 1 },
      { nama: 'Gula Pasir Eceran 500g', berat: 0.5 },
      { nama: 'Gula Pasir Eceran 250g', berat: 0.25 },
    ],
  },
  {
    curah: 'Beras Curah 50kg',
    beratPerUnit: 50,
    satuanDasar: 'kg',
    kemasan: [
      { nama: 'Beras Eceran 5kg', berat: 5 },
      { nama: 'Beras Eceran 2kg', berat: 2 },
      { nama: 'Beras Eceran 1kg', berat: 1 },
    ],
  },
  {
    curah: 'Minyak Goreng Curah 18L',
    beratPerUnit: 18,
    satuanDasar: 'liter',
    kemasan: [
      { nama: 'Minyak Goreng Eceran 1L', berat: 1 },
      { nama: 'Minyak Goreng Eceran 500ml', berat: 0.5 },
    ],
  },
  {
    curah: 'Tepung Terigu Curah 25kg',
    beratPerUnit: 25,
    satuanDasar: 'kg',
    kemasan: [
      { nama: 'Tepung Terigu Eceran 1kg', berat: 1 },
      { nama: 'Tepung Terigu Eceran 500g', berat: 0.5 },
    ],
  },
  {
    curah: 'Kopi Bubuk Curah 5kg',
    beratPerUnit: 5,
    satuanDasar: 'kg',
    kemasan: [
      { nama: 'Kopi Bubuk Eceran 250g', berat: 0.25 },
      { nama: 'Kopi Bubuk Eceran 100g', berat: 0.1 },
    ],
  },
  {
    curah: 'Garam Curah 50kg',
    beratPerUnit: 50,
    satuanDasar: 'kg',
    kemasan: [
      { nama: 'Garam Eceran 500g', berat: 0.5 },
      { nama: 'Garam Eceran 250g', berat: 0.25 },
    ],
  },
  {
    curah: 'Kecap Manis Curah 5L',
    beratPerUnit: 5,
    satuanDasar: 'liter',
    kemasan: [
      { nama: 'Kecap Manis Eceran 500ml', berat: 0.5 },
      { nama: 'Kecap Manis Eceran 250ml', berat: 0.25 },
      { nama: 'Kecap Manis Eceran 100ml', berat: 0.1 },
    ],
  },
  {
    curah: 'Deterjen Bubuk Curah 25kg',
    beratPerUnit: 25,
    satuanDasar: 'kg',
    kemasan: [
      { nama: 'Deterjen Bubuk Eceran 1kg', berat: 1 },
      { nama: 'Deterjen Bubuk Eceran 500g', berat: 0.5 },
    ],
  },
  {
    curah: 'Sabun Cuci Piring Curah 5L',
    beratPerUnit: 5,
    satuanDasar: 'liter',
    kemasan: [
      { nama: 'Sabun Cuci Piring Eceran 500ml', berat: 0.5 },
      { nama: 'Sabun Cuci Piring Eceran 250ml', berat: 0.25 },
    ],
  },
]

export function buildResepKonversi(produk: Produk[]): ResepKonversi[] {
  return REPACK_MAP.map((rm, idx) => {
    const curah = produk.find((p) => p.nama === rm.curah)
    if (!curah) return null
    return {
      id: `RSP-${String(idx + 1).padStart(4, '0')}`,
      nama: `Repack ${rm.curah.replace(/ \d+\w*$/, '')}`,
      produkCurahId: curah.id,
      beratPerUnit: rm.beratPerUnit,
      satuanDasar: rm.satuanDasar,
      items: rm.kemasan
        .map((k) => {
          const pk = produk.find((p) => p.nama === k.nama)
          if (!pk) return null
          return { produkKemasanId: pk.id, beratPerKemasan: k.berat }
        })
        .filter(Boolean) as ResepKonversi['items'],
      biayaKemasanPerUnit: 0,
    } as ResepKonversi
  }).filter(Boolean) as ResepKonversi[]
}

export function buildPengemasan(produk: Produk[], resep: ResepKonversi[]): TPengemasan[] {
  const list: TPengemasan[] = []
  resep.forEach((r, ri) => {
    const curah = produk.find((p) => p.id === r.produkCurahId)
    if (!curah) return
    const hppPerSatuan = curah.hargaBeli / r.beratPerUnit
    // 2 pengemasan sample per resep
    for (let i = 0; i < 2; i++) {
      const items = r.items.map((it) => {
        const pk = produk.find((p) => p.id === it.produkKemasanId)
        const qty = Math.floor((r.beratPerUnit * 0.3) / it.beratPerKemasan) + int(1, 5)
        return {
          produkKemasanId: it.produkKemasanId,
          namaProduk: pk?.nama ?? '-',
          qty,
          beratPerKemasan: it.beratPerKemasan,
          hppPerKemasan: Math.round(hppPerSatuan * it.beratPerKemasan),
        }
      })
      const totalBeratKemasan = items.reduce((a, it) => a + it.qty * it.beratPerKemasan, 0)
      const waste = Math.round((r.beratPerUnit - totalBeratKemasan) * 100) / 100
      list.push({
        id: `PKM-${String(ri * 2 + i + 1).padStart(4, '0')}`,
        resepId: r.id,
        resepNama: r.nama,
        produkCurahId: r.produkCurahId,
        namaProdukCurah: curah.nama,
        jumlahUnitCurah: 1,
        totalBerat: r.beratPerUnit,
        items,
        totalBeratKemasan,
        waste: waste > 0 ? waste : 0,
        hppCurahPerSatuan: hppPerSatuan,
        biayaKemasan: 0,
        userId: 'USR-01',
        waktu: isoDaysAgo(15 - ri * 3 - i, 10, 30),
      })
    }
  })
  return list
}

export function buildBarangKeluar(produk: Produk[], suppliers: Supplier[]): BarangKeluar[] {
  const p1 = produk.find((p) => p.kategoriId === 'KAT-02') || produk[0]
  const p2 = produk.find((p) => p.kategoriId === 'KAT-03') || produk[1]
  const p3 = produk.find((p) => p.kategoriId === 'KAT-04') || produk[2]
  const s1 = suppliers[0] || SUPPLIER_SEED[0]
  const s2 = suppliers[1] || SUPPLIER_SEED[1]

  const items1 = [
    {
      produkId: p1.id,
      namaProduk: p1.nama,
      sku: p1.sku,
      qty: 4,
      satuan: p1.satuan,
      hargaBeli: p1.hargaBeli,
      subtotal: p1.hargaBeli * 4,
      alasan: 'Kemasan kaleng penyok & bocor',
    },
  ]
  const total1 = items1.reduce((sum, it) => sum + it.subtotal, 0)

  const items2 = [
    {
      produkId: p2.id,
      namaProduk: p2.nama,
      sku: p2.sku,
      qty: 6,
      satuan: p2.satuan,
      hargaBeli: p2.hargaBeli,
      subtotal: p2.hargaBeli * 6,
      alasan: 'Kemasan rusak dari pabrik/segel robek',
    },
  ]
  const total2 = items2.reduce((sum, it) => sum + it.subtotal, 0)

  const items3 = [
    {
      produkId: p3.id,
      namaProduk: p3.nama,
      sku: p3.sku,
      qty: 5,
      satuan: p3.satuan,
      hargaBeli: p3.hargaBeli,
      subtotal: p3.hargaBeli * 5,
      alasan: 'Kedaluwarsa sebelum terjual',
    },
  ]
  const total3 = items3.reduce((sum, it) => sum + it.subtotal, 0)

  return [
    {
      id: 'BK-0001',
      nomor: 'BK-202609-0001',
      kategori: 'cacat',
      items: items1,
      totalNilai: total1,
      status: 'selesai',
      tanggalKeluar: isoDaysAgo(4, 14, 20),
      userId: 'USR-01',
      catatan: 'Barang rusak di rak display, dicatat ke pengeluaran',
    },
    {
      id: 'BK-0002',
      nomor: 'BK-202609-0002',
      kategori: 'retur',
      supplierId: s1.id,
      items: items2,
      totalNilai: total2,
      status: 'proses_retur',
      tanggalKeluar: isoDaysAgo(2, 10, 15),
      userId: 'USR-01',
      catatan: `Menunggu penggantian fisik saat salesman ${s1.nama} datang`,
    },
    {
      id: 'BK-0003',
      nomor: 'BK-202609-0003',
      kategori: 'retur',
      supplierId: s2.id,
      items: items3,
      totalNilai: total3,
      status: 'selesai_retur',
      resolusiRetur: 'ganti_barang',
      tanggalKeluar: isoDaysAgo(8, 9, 30),
      tanggalSelesai: isoDaysAgo(6, 11, 0),
      userId: 'USR-01',
      catatan: `Sudah diganti barang baru oleh ${s2.nama}`,
    },
  ]
}

