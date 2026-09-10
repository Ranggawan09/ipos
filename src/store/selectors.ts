import type { PergerakanStok, Produk, Transaksi } from '@/types'

export const hanyaSelesai = (trx: Transaksi[]) => trx.filter((t) => t.status === 'selesai')

export function dalamRentang(iso: string, dari: Date, sampai: Date) {
  const t = new Date(iso).getTime()
  return t >= dari.getTime() && t <= sampai.getTime()
}

export function stokKritis(produk: Produk[]) {
  return produk.filter((p) => p.aktif && p.stok <= p.stokMinimum)
}

export function totalPenjualan(trx: Transaksi[]) {
  return hanyaSelesai(trx).reduce((a, t) => a + t.total, 0)
}

export function totalHpp(trx: Transaksi[]) {
  return hanyaSelesai(trx).reduce((a, t) => a + t.hpp, 0)
}

export function labaKotor(trx: Transaksi[]) {
  return totalPenjualan(trx) - totalHpp(trx)
}

export function ringkasPerHari(trx: Transaksi[], jumlahHari: number) {
  const hasil: { label: string; tanggal: string; penjualan: number; hpp: number; laba: number; transaksi: number }[] = []
  for (let i = jumlahHari - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const besok = new Date(d)
    besok.setDate(besok.getDate() + 1)
    const rows = hanyaSelesai(trx).filter((t) => dalamRentang(t.waktu, d, besok))
    const penjualan = rows.reduce((a, t) => a + t.total, 0)
    const hpp = rows.reduce((a, t) => a + t.hpp, 0)
    hasil.push({
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      tanggal: d.toISOString(),
      penjualan,
      hpp,
      laba: penjualan - hpp,
      transaksi: rows.length,
    })
  }
  return hasil
}

export function produkTerlaris(trx: Transaksi[], limit = 5) {
  const map = new Map<string, { nama: string; qty: number; nilai: number }>()
  hanyaSelesai(trx).forEach((t) => {
    t.detail.forEach((d) => {
      const cur = map.get(d.produkId) ?? { nama: d.namaProduk, qty: 0, nilai: 0 }
      cur.qty += d.qty
      cur.nilai += d.subtotal
      map.set(d.produkId, cur)
    })
  })
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
}

export function nilaiStok(produk: Produk[], basis: 'beli' | 'jual' = 'beli') {
  return produk.reduce(
    (a, p) => a + p.stok * (basis === 'beli' ? p.hargaBeli : p.hargaJual),
    0,
  )
}

export function getMasukKeluar(pergerakan: PergerakanStok[]) {
  return {
    masuk: pergerakan.filter((p) => p.jumlah > 0).reduce((a, p) => a + p.jumlah, 0),
    keluar: pergerakan.filter((p) => p.jumlah < 0).reduce((a, p) => a + Math.abs(p.jumlah), 0),
  }
}
