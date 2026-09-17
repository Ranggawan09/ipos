export const rupiah = (n: number) =>
  'Rp ' + Math.round(n).toLocaleString('id-ID')

export const rupiahShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`
  if (Math.abs(n) >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`
  return rupiah(n)
}

export const angka = (n: number) => Math.round(n).toLocaleString('id-ID')

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const tanggal = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export const tanggalSingkat = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const tanggalJam = (iso: string) => {
  const d = new Date(iso)
  return `${tanggalSingkat(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const jam = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const namaHari = (iso: string) => HARI[new Date(iso).getDay()]

export const toDateInput = (iso: string) => iso.slice(0, 10)

export const awalHariIni = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const awalBulanIni = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export const getShiftNomor = (shift?: { id: string; shiftNomor?: number } | null): 1 | 2 => {
  if (shift?.shiftNomor === 1 || shift?.shiftNomor === 2) {
    return shift.shiftNomor
  }
  if (shift?.shiftNomor && shift.shiftNomor > 2) {
    return (((shift.shiftNomor - 1) % 2) + 1) as 1 | 2
  }
  if (!shift?.id) return 1
  const num = parseInt(shift.id.replace(/\D/g, '').slice(-2) || '1', 10)
  return (((num - 1) % 2) + 1) as 1 | 2
}

