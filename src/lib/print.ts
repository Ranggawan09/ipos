// Cetak struk thermal 80mm & laporan melalui dialog print browser.

export type StrukItem = {
  nama: string
  qty: number
  harga: number
  diskonItem?: number
  subtotal: number
}

export type StrukData = {
  namaToko: string
  alamat: string
  nomor: string
  waktu: string
  kasir: string
  items: StrukItem[]
  subtotal: number
  diskonItem?: number
  diskonNota?: number
  diskon: number
  total: number
  metode: string
  dibayar: number
  kembalian: number
}

const rp = (n: number) => Math.round(n).toLocaleString('id-ID')

export function cetakStruk(data: StrukData) {
  const w = window.open('', '_blank', 'width=380,height=640')
  if (!w) {
    alert('Izinkan pop-up untuk mencetak struk.')
    return
  }
  const items = data.items
    .map((i) => {
      const hargaAsli = i.qty * i.harga
      const diskon = i.diskonItem || 0
      const diskonRow =
        diskon > 0
          ? `<div class="row" style="padding-left: 8px; font-size: 11px;"><span>Diskon</span><span>-${rp(diskon)}</span></div>`
          : ''
      return `
      <div class="item">
        <div>${i.nama}</div>
        <div class="row"><span>${i.qty} x ${rp(i.harga)}</span><span>${rp(hargaAsli)}</span></div>
        ${diskonRow}
      </div>`
    })
    .join('')

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Struk ${data.nomor}</title>
  <style>
    * { font-family: 'Courier New', monospace; }
    body { width: 72mm; margin: 0 auto; padding: 8px; font-size: 12px; color:#000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; }
    .item { margin-bottom: 4px; }
    .big { font-size: 14px; }
    @media print { body { width: auto; } @page { size: 80mm auto; margin: 0; } }
  </style></head><body onload="window.print()">
    <div class="center bold big">${data.namaToko}</div>
    <div class="center">${data.alamat}</div>
    <div class="line"></div>
    <div class="row"><span>No</span><span>${data.nomor}</span></div>
    <div class="row"><span>Waktu</span><span>${data.waktu}</span></div>
    <div class="row"><span>Kasir</span><span>${data.kasir}</span></div>
    <div class="line"></div>
    ${items}
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${rp(data.subtotal)}</span></div>
    ${
      data.diskonItem && data.diskonNota
        ? `<div class="row"><span>Diskon Item</span><span>-${rp(data.diskonItem)}</span></div>
    <div class="row"><span>Diskon Nota</span><span>-${rp(data.diskonNota)}</span></div>`
        : data.diskon > 0
          ? `<div class="row"><span>Diskon</span><span>-${rp(data.diskon)}</span></div>`
          : ''
    }
    <div class="row bold big"><span>TOTAL</span><span>${rp(data.total)}</span></div>
    <div class="row"><span>${data.metode}</span><span>${rp(data.dibayar)}</span></div>
    <div class="row"><span>Kembali</span><span>${rp(data.kembalian)}</span></div>
    <div class="line"></div>
    <div class="center">Terima kasih telah berbelanja</div>
    <div class="center">Barang yang sudah dibeli tidak dapat ditukar</div>
  </body></html>`)
  w.document.close()
}

export function cetakLaporan(judul: string, periode: string, html: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) {
    alert('Izinkan pop-up untuk mencetak laporan.')
    return
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${judul}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0; }
    .sub { color: #555; font-size: 13px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; }
    td.num, th.num { text-align: right; }
    tfoot td { font-weight: bold; background: #f8fafc; }
    @media print { @page { size: A4; margin: 12mm; } }
  </style></head><body onload="window.print()">
    <h1>${judul}</h1>
    <div class="sub">Periode: ${periode} &middot; Dicetak: ${new Date().toLocaleString('id-ID')}</div>
    ${html}
  </body></html>`)
  w.document.close()
}
