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
    <div class="sub">Periode: ${periode} | Dicetak: ${new Date().toLocaleString('id-ID')}</div>
    ${html}
  </body></html>`)
  w.document.close()
}

export type POItem = {
  nama: string
  sku: string
  satuan: string
  stokSaatIni: number
  stokMin: number
  qtyOrder: number
  hargaSatuan: number
  subtotal: number
}

export type POData = {
  nomorPO: string
  tanggal: string
  supplier: {
    nama: string
    kontak?: string
    telepon?: string
    alamat?: string
  }
  petugas: string
  catatan?: string
  items: POItem[]
}

const renderPOHtml = (po: POData) => {
  const totalItem = po.items.reduce((a, i) => a + i.qtyOrder, 0)
  const totalEstimasi = po.items.reduce((a, i) => a + i.subtotal, 0)

  return `
    <div class="po-doc">
      <div class="po-header">
        <div>
          <h2 class="toko-nama">TOKO PASAR JAYA</h2>
          <p class="toko-sub">Pasar Induk Blok A No. 12, Jakarta Timur | Telp: 0812-3456-7890</p>
          <p class="toko-sub">Sistem Pengadaan &amp; Manajemen Retail</p>
        </div>
        <div class="po-meta">
          <div class="badge-po">PURCHASE ORDER (PO)</div>
          <p class="meta-row"><strong>No. PO:</strong> ${po.nomorPO}</p>
          <p class="meta-row"><strong>Tanggal:</strong> ${po.tanggal}</p>
          <p class="meta-row"><strong>Petugas:</strong> ${po.petugas}</p>
        </div>
      </div>

      <div class="supplier-box">
        <div class="sup-title">KEPADA YTH. REKANAN PEMASOK (SUPPLIER):</div>
        <div class="sup-grid">
          <div>
            <p class="sup-nama">${po.supplier.nama}</p>
            <p class="sup-detail"><strong>Kontak:</strong> ${po.supplier.kontak || '-'}</p>
            <p class="sup-detail"><strong>Telepon:</strong> ${po.supplier.telepon || '-'}</p>
          </div>
          <div>
            <p class="sup-detail"><strong>Alamat Pengiriman:</strong></p>
            <p class="sup-detail">${po.supplier.alamat || '-'}</p>
          </div>
        </div>
      </div>

      <p class="intro-text">
        Dengan surat ini kami memesan barang-barang berikut untuk kebutuhan restock stok menipis:
      </p>

      <table class="po-table">
        <thead>
          <tr>
            <th style="width: 32px;" class="center">No</th>
            <th>Nama Barang &amp; Spesifikasi</th>
            <th style="width: 80px;">SKU</th>
            <th style="width: 70px;" class="center">Stok Sisa</th>
            <th style="width: 70px;" class="center">Stok Min</th>
            <th style="width: 80px;" class="center">Qty Pesan</th>
            <th style="width: 95px;" class="num">Harga Satuan</th>
            <th style="width: 110px;" class="num">Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${po.items
            .map(
              (it, idx) => `
            <tr>
              <td class="center">${idx + 1}</td>
              <td><strong>${it.nama}</strong></td>
              <td class="mono">${it.sku}</td>
              <td class="center text-rose">${it.stokSaatIni} ${it.satuan}</td>
              <td class="center">${it.stokMin} ${it.satuan}</td>
              <td class="center bold text-primary">${it.qtyOrder} ${it.satuan}</td>
              <td class="num">${it.hargaSatuan.toLocaleString('id-ID')}</td>
              <td class="num bold">${it.subtotal.toLocaleString('id-ID')}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="total-label">TOTAL JUMLAH PESANAN</td>
            <td class="center bold text-primary">${totalItem} Unit</td>
            <td class="num bold">TOTAL</td>
            <td class="num bold text-primary">Rp ${totalEstimasi.toLocaleString('id-ID')}</td>
          </tr>
        </tfoot>
      </table>

      <div class="po-notes">
        <p><strong>Catatan Pengiriman &amp; Penerimaan:</strong></p>
        <ul>
          <li>Mohon konfirmasi kesediaan stok dan estimasi waktu pengantaran barang setelah menerima PO ini.</li>
          <li>Kualitas dan masa kedaluwarsa barang harus dalam kondisi prima saat serah terima.</li>
          <li>Faktur / surat jalan wajib dilampirkan pada saat pengiriman untuk pencocokan barang masuk di sistem.</li>
        </ul>
      </div>

      <div class="po-signature">
        <div class="sig-box">
          <p class="sig-title">Diterima &amp; Dikonfirmasi Oleh,</p>
          <div class="sig-line"></div>
          <p class="sig-name">Pihak Supplier / Pengirim</p>
          <p class="sig-date">Tgl: .......................................</p>
        </div>
        <div class="sig-box">
          <p class="sig-title">Dipesan Oleh,</p>
          <div class="sig-line"></div>
          <p class="sig-name">${po.petugas}</p>
          <p class="sig-role">Admin Pengadaan Toko</p>
        </div>
      </div>
    </div>
  `
}

const PO_STYLE = `
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    padding: 24px;
    color: #1e293b;
    background: #fff;
    margin: 0;
  }
  .po-doc {
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
  }
  .po-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .toko-nama {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 2px 0;
    letter-spacing: -0.5px;
  }
  .toko-sub {
    font-size: 11px;
    color: #64748b;
    margin: 0;
  }
  .po-meta {
    text-align: right;
  }
  .badge-po {
    display: inline-block;
    background: #0f172a;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }
  .meta-row {
    font-size: 12px;
    margin: 2px 0;
    color: #334155;
  }
  .supplier-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 14px;
  }
  .sup-title {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .sup-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .sup-nama {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px 0;
  }
  .sup-detail {
    font-size: 11.5px;
    color: #334155;
    margin: 2px 0;
  }
  .intro-text {
    font-size: 12px;
    color: #475569;
    margin: 0 0 10px 0;
  }
  .po-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 16px;
  }
  .po-table th {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    padding: 7px 8px;
    font-weight: 700;
    color: #1e293b;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
  }
  .po-table td {
    border: 1px solid #e2e8f0;
    padding: 6px 8px;
    color: #1e293b;
  }
  .po-table tfoot td {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    padding: 8px 8px;
  }
  .center { text-align: center; }
  .num { text-align: right; }
  .bold { font-weight: 700; }
  .mono { font-family: monospace; font-size: 11px; color: #64748b; }
  .text-primary { color: #0284c7; }
  .text-rose { color: #e11d48; font-weight: 600; }
  .total-label { text-align: right; font-weight: 700; font-size: 11.5px; }
  .po-notes {
    border-left: 3px solid #0284c7;
    background: #f0f9ff;
    padding: 8px 12px;
    font-size: 11px;
    color: #334155;
    margin-bottom: 24px;
    border-radius: 0 4px 4px 0;
  }
  .po-notes p { margin: 0 0 4px 0; }
  .po-notes ul { margin: 0; padding-left: 16px; }
  .po-notes li { margin-bottom: 2px; }
  .po-signature {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    page-break-inside: avoid;
  }
  .sig-box {
    width: 220px;
    text-align: center;
  }
  .sig-title {
    font-size: 11.5px;
    color: #475569;
    margin-bottom: 56px;
  }
  .sig-line {
    border-bottom: 1px solid #334155;
    margin-bottom: 4px;
  }
  .sig-name {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }
  .sig-role {
    font-size: 11px;
    color: #64748b;
    margin: 2px 0 0 0;
  }
  .sig-date {
    font-size: 10.5px;
    color: #64748b;
    margin: 2px 0 0 0;
  }
  .page-break {
    page-break-after: always;
    margin-bottom: 40px;
  }
  @media print {
    @page { size: A4; margin: 12mm 15mm; }
    body { padding: 0; }
    .page-break { page-break-after: always; }
  }
`

export function cetakPurchaseOrder(po: POData) {
  const w = window.open('', '_blank', 'width=900,height=750')
  if (!w) {
    alert('Izinkan pop-up peramban untuk mencetak Surat Pesanan (PO).')
    return
  }
  w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PO - ${po.supplier.nama} (${po.nomorPO})</title>
    <style>${PO_STYLE}</style>
  </head>
  <body onload="window.print()">
    ${renderPOHtml(po)}
  </body>
</html>`)
  w.document.close()
}

export function cetakSemuaPurchaseOrder(pos: POData[]) {
  if (pos.length === 0) return
  const w = window.open('', '_blank', 'width=900,height=750')
  if (!w) {
    alert('Izinkan pop-up peramban untuk mencetak Surat Pesanan (PO).')
    return
  }
  const content = pos
    .map(
      (po, idx) => `
      <div class="${idx < pos.length - 1 ? 'page-break' : ''}">
        ${renderPOHtml(po)}
      </div>
    `,
    )
    .join('')

  w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Purchase Orders Restock (${pos.length} Supplier)</title>
    <style>${PO_STYLE}</style>
  </head>
  <body onload="window.print()">
    ${content}
  </body>
</html>`)
  w.document.close()
}
