import type { Produk, SatuanBertingkat } from '@/types'

// Kalkulasi harga modal multi-satuan & margin statis.
// Dipakai bersama oleh form Produk (edit manual) dan penerimaan barang (store)
// agar perilakunya identik.

export type ModeMargin = 'persen' | 'nominal'

/** Penanda sumber perubahan modal = satuan dasar (bukan tier). */
export const SUMBER_DASAR = 'dasar' as const

/** Index tier di `satuanBertingkat`, atau `SUMBER_DASAR` untuk satuan dasar. */
export type SumberModal = number | typeof SUMBER_DASAR

type ProdukHarga = Pick<Produk, 'hargaBeli' | 'hargaJual' | 'satuanBertingkat' | 'bagiModalOtomatis' | 'modeMargin'>

const bulat1 = (n: number) => Math.round(n * 10) / 10

/** `undefined` dianggap aktif agar perilaku produk lama tetap sinkron proporsional. */
export const isBagiModalAktif = (p: Pick<Produk, 'bagiModalOtomatis'>) => p.bagiModalOtomatis !== false

export const persenMargin = (modal: number, jual: number) => (modal > 0 ? bulat1(((jual - modal) / modal) * 100) : 0)

/**
 * Hitung harga jual baru agar margin tetap (statis) ketika modal berubah.
 * - persen : margin % dipertahankan (pakai `marginPersenTersimpan` bila ada, selain itu dihitung dari harga lama)
 * - nominal: laba Rp (jual - modal) dipertahankan
 */
export function hitungJualMarginStatis(
  modalLama: number,
  jualLama: number,
  modalBaru: number,
  mode: ModeMargin,
  marginPersenTersimpan?: number,
): { hargaJual: number; marginPersen: number } {
  let hargaJual = jualLama
  if (mode === 'persen') {
    const pct = marginPersenTersimpan ?? (modalLama > 0 ? ((jualLama - modalLama) / modalLama) * 100 : undefined)
    // Tanpa acuan margin (modal lama 0 & tidak ada margin tersimpan) harga jual dibiarkan
    if (pct !== undefined && modalBaru > 0) {
      hargaJual = Math.max(0, Math.round(modalBaru * (1 + pct / 100)))
    }
  } else {
    hargaJual = Math.max(0, modalBaru + (jualLama - modalLama))
  }
  return { hargaJual, marginPersen: persenMargin(modalBaru, hargaJual) }
}

/**
 * Terapkan perubahan modal pada satu satuan (dasar atau tier) ke produk.
 * - Bagi modal otomatis ON : seluruh satuan (dasar, bertingkat, pecahan) dihitung ulang
 *   proporsional terhadap `multiplierToBase`. Satuan sumber memakai nilai persis yang diinput.
 * - Bagi modal otomatis OFF: hanya satuan sumber yang berubah.
 * Setiap satuan yang modalnya berubah, harga jualnya disesuaikan dengan margin statis.
 */
export function terapkanPerubahanModal(
  produk: ProdukHarga,
  sumber: SumberModal,
  hargaBeliBaru: number,
  opsi: { modeMargin?: ModeMargin; marginPersenDasar?: number } = {},
): { hargaBeli: number; hargaJual: number; satuanBertingkat?: SatuanBertingkat[] } {
  const bagi = isBagiModalAktif(produk)
  const mode: ModeMargin = opsi.modeMargin ?? produk.modeMargin ?? 'nominal'
  const tiers = produk.satuanBertingkat
  const isDasar = sumber === SUMBER_DASAR
  const tierSumber = isDasar ? undefined : tiers?.[sumber]
  const modalBaru = Math.max(0, hargaBeliBaru)

  if (!isDasar && !tierSumber) {
    return { hargaBeli: produk.hargaBeli, hargaJual: produk.hargaJual, satuanBertingkat: tiers }
  }

  const multSumber = isDasar ? 1 : tierSumber!.multiplierToBase || 1
  const modalPerDasar = modalBaru / multSumber
  const modalUntuk = (mult: number, isSumber: boolean) => (isSumber ? modalBaru : Math.round(modalPerDasar * mult))

  // Satuan dasar
  let hargaBeli = produk.hargaBeli
  let hargaJual = produk.hargaJual
  if (isDasar || bagi) {
    const baru = modalUntuk(1, isDasar)
    if (baru !== produk.hargaBeli) {
      hargaJual = hitungJualMarginStatis(
        produk.hargaBeli,
        produk.hargaJual,
        baru,
        mode,
        mode === 'persen' ? opsi.marginPersenDasar : undefined,
      ).hargaJual
      hargaBeli = baru
    }
  }

  // Satuan bertingkat & pecahan
  const satuanBertingkat = tiers?.map((tier, i) => {
    const isSumber = !isDasar && i === sumber
    if (!bagi && !isSumber) return tier
    const baru = modalUntuk(tier.multiplierToBase || 1, isSumber)
    if (baru === tier.hargaBeli) return tier
    const res = hitungJualMarginStatis(
      tier.hargaBeli,
      tier.hargaJual,
      baru,
      mode,
      mode === 'persen' ? tier.marginPersen : undefined,
    )
    return { ...tier, hargaBeli: baru, hargaJual: res.hargaJual, marginPersen: res.marginPersen }
  })

  return { hargaBeli, hargaJual, satuanBertingkat }
}
