import { useMemo, useState } from 'react'
import type { TemplateNota } from '@/types'
import { DEFAULT_TEMPLATE_NOTA } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah, tanggalJam } from '@/lib/format'
import { cetakStruk } from '@/lib/print'
import { Badge, Button, Card, DataTable, FR, Input, Label, Modal, PageHeader, Select, StatCard } from '@/components/ui'

// Data contoh untuk simulasi dan live preview struk nota kasir
const CONTOH_ITEMS = [
  { nama: 'Beras Premium 5kg', qty: 1, satuan: 'sak', harga: 68000, diskonItem: 3000, subtotal: 65000 },
  { nama: 'Minyak Goreng 2L', qty: 2, satuan: 'pouch', harga: 34000, diskonItem: 0, subtotal: 68000 },
  { nama: 'Gula Pasir 1kg', qty: 3, satuan: 'pcs', harga: 15000, diskonItem: 1000, subtotal: 44000 },
]

export function Pengaturan() {
  const {
    templateNota,
    simpanTemplateNota,
    resetTemplateNota,
    logSinkron,
    tambahLogSinkron,
    resetData,
    transaksi,
    produk,
    pergerakan,
  } = useDataStore()

  const push = useToast((s) => s.push)

  // Tab aktif di halaman Pengaturan
  const [tabAktif, setTabAktif] = useState<'nota' | 'sinkron' | 'data'>('nota')

  // State form template nota kasir
  const [formNota, setFormNota] = useState<TemplateNota>(() => ({
    ...(DEFAULT_TEMPLATE_NOTA),
    ...(templateNota || {}),
  }))

  const [resetOpen, setResetOpen] = useState(false)
  const [modalResetNota, setModalResetNota] = useState(false)

  // Perbarui form jika store berubah
  const simpanNota = () => {
    if (!formNota.namaToko.trim()) {
      push({ tipe: 'error', judul: 'Nama toko tidak boleh kosong' })
      return
    }
    simpanTemplateNota(formNota)
    push({
      tipe: 'sukses',
      judul: 'Template Nota Disimpan',
      pesan: 'Format nota kasir terbaru telah diterapkan ke semua transaksi dan pencetakan thermal.',
    })
  }

  const kembalikanNotaDefault = () => {
    resetTemplateNota()
    setFormNota(structuredClone(DEFAULT_TEMPLATE_NOTA))
    setModalResetNota(false)
    push({
      tipe: 'info',
      judul: 'Template Nota Direset',
      pesan: 'Format nota kasir kembali ke pengaturan bawaan standar iPOS.',
    })
  }

  // Uji cetak thermal dengan printer browser
  const ujiCetakThermal = () => {
    const subtotal = CONTOH_ITEMS.reduce((a, b) => a + b.qty * b.harga, 0)
    const diskonItem = CONTOH_ITEMS.reduce((a, b) => a + (b.diskonItem || 0), 0)
    const diskonNota = 5000
    const totalDiskon = diskonItem + diskonNota
    const total = subtotal - totalDiskon
    const dibayar = 200000
    const kembalian = dibayar - total

    cetakStruk({
      template: formNota,
      nomor: 'TRX-SAMPLE-01',
      waktu: tanggalJam(new Date().toISOString()),
      kasir: 'Rina Kasir',
      items: CONTOH_ITEMS,
      totalItem: CONTOH_ITEMS.reduce((a, b) => a + b.qty, 0),
      subtotal,
      diskonItem,
      diskonNota,
      diskon: totalDiskon,
      total,
      metode: 'TUNAI',
      dibayar,
      kembalian,
    })
  }

  // Sinkronisasi cloud
  const terakhirCloud = logSinkron.find((l) => l.jenis === 'cloud')
  const sinkron = () => {
    tambahLogSinkron({
      waktu: new Date().toISOString(),
      jenis: 'cloud',
      jumlahData: transaksi.length,
      keterangan: 'Sinkronisasi manual seluruh data ke cloud',
      status: 'sukses',
    })
    push({
      tipe: 'sukses',
      judul: 'Sinkronisasi cloud dijalankan',
      pesan: 'Seluruh data lokal terkirim sebagai cadangan.',
    })
  }

  const konfirmasiResetData = () => {
    resetData()
    setResetOpen(false)
    push({ tipe: 'sukses', judul: 'Data operasional dikembalikan ke pengaturan awal' })
  }

  // Perhitungan total contoh untuk live preview
  const previewSubtotal = useMemo(() => CONTOH_ITEMS.reduce((a, b) => a + b.qty * b.harga, 0), [])
  const previewDiskonItem = useMemo(() => CONTOH_ITEMS.reduce((a, b) => a + (b.diskonItem || 0), 0), [])
  const previewDiskonNota = 5000
  const previewTotal = previewSubtotal - (previewDiskonItem + previewDiskonNota)

  return (
    <>
      <PageHeader
        judul="Pengaturan Sistem"
        deskripsi="Kelola template nota kasir, pencadangan basis data, dan sinkronisasi server lokal."
        aksi={<FR kode="FR-CFG-01" />}
      />

      {/* Navigasi Tab Pengaturan */}
      <div className="mb-5 flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTabAktif('nota')}
          className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-semibold transition ${
            tabAktif === 'nota'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Template Nota Kasir
        </button>

        <button
          type="button"
          onClick={() => setTabAktif('sinkron')}
          className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-semibold transition ${
            tabAktif === 'sinkron'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sinkronisasi & Cloud
        </button>

        <button
          type="button"
          onClick={() => setTabAktif('data')}
          className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-semibold transition ${
            tabAktif === 'data'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          Data & Penyetelan Ulang
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEMPLATE NOTA KASIR                                                */}
      {/* ========================================================================= */}
      {tabAktif === 'nota' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Panel Form Konfigurasi (7 Kolom) */}
          <div className="space-y-5 lg:col-span-7">
            {/* Card 1: Identitas Toko */}
            <Card title="Identitas Toko di Nota" subtitle="Informasi header toko yang dicetak di bagian paling atas struk.">
              <div className="space-y-4">
                <div>
                  <Label>Nama Toko / Usaha *</Label>
                  <Input
                    value={formNota.namaToko}
                    onChange={(e) => setFormNota({ ...formNota, namaToko: e.target.value })}
                    placeholder="Contoh: TOKO PASAR JAYA"
                  />
                </div>

                <div>
                  <Label>Alamat Lengkap Toko</Label>
                  <Input
                    value={formNota.alamat}
                    onChange={(e) => setFormNota({ ...formNota, alamat: e.target.value })}
                    placeholder="Contoh: Pasar Induk Blok A No. 12, Jakarta"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Nomor Telepon / WhatsApp</Label>
                    <Input
                      value={formNota.telepon}
                      onChange={(e) => setFormNota({ ...formNota, telepon: e.target.value })}
                      placeholder="Contoh: 0812-3456-7890"
                    />
                  </div>
                  <div>
                    <Label>Slogan / Info Tambahan Header</Label>
                    <Input
                      value={formNota.headerPesan || ''}
                      onChange={(e) => setFormNota({ ...formNota, headerPesan: e.target.value })}
                      placeholder="Contoh: Grosir & Eceran Murah"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 2: Pengaturan Kertas Thermal & Huruf */}
            <Card title="Format Kertas & Printer Thermal" subtitle="Sesuaikan spesifikasi printer kasir yang digunakan di toko.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Ukuran Lebar Kertas Struk</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormNota({ ...formNota, lebarKertas: '80mm' })}
                      className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition ${
                        formNota.lebarKertas === '80mm'
                          ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold ring-2 ring-brand-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">80 mm</span>
                      <span className="text-[10px] text-slate-500">Standar Kasir POS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormNota({ ...formNota, lebarKertas: '58mm' })}
                      className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition ${
                        formNota.lebarKertas === '58mm'
                          ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold ring-2 ring-brand-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">58 mm</span>
                      <span className="text-[10px] text-slate-500">Printer Mini / Bluetooth</span>
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Ukuran Huruf / Kerapatan Font</Label>
                  <Select
                    value={formNota.ukuranFont}
                    onChange={(e) => setFormNota({ ...formNota, ukuranFont: e.target.value as TemplateNota['ukuranFont'] })}
                    className="mt-1"
                  >
                    <option value="kecil">Kecil (Hemat Kertas & Rapat)</option>
                    <option value="normal">Normal (Standar Monospace)</option>
                    <option value="besar">Besar (Mudah Dibaca)</option>
                  </Select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Mempengaruhi kerapatan karakter teks pada cetakan kertas thermal printer.
                  </p>
                </div>
              </div>
            </Card>

            {/* Card 3: Elemen yang Ditampilkan */}
            <Card title="Elemen & Informasi Struk" subtitle="Pilih informasi yang ingin ditampilkan atau disembunyikan pada nota.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanNomor}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanNomor: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Nomor Transaksi / Faktur</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanWaktu}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanWaktu: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Tanggal & Jam Transaksi</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanKasir}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanKasir: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Nama Kasir yang Bertugas</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanTotalItem}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanTotalItem: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Jumlah Total Qty Item</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanSatuan}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanSatuan: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Satuan Produk (pcs, kg, sak)</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanDiskonItem}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanDiskonItem: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Rincian Diskon per Barang</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanDiskonNota}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanDiskonNota: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Diskon Nota / Potongan Total</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNota.tampilkanMetodeBayar}
                    onChange={(e) => setFormNota({ ...formNota, tampilkanMetodeBayar: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Metode Bayar & Uang Kembali</span>
                </label>
              </div>
            </Card>

            {/* Card 4: Catatan Footer */}
            <Card title="Pesan Footer & Penutup" subtitle="Teks yang tercetak di bagian paling bawah nota.">
              <div className="space-y-3">
                <div>
                  <Label>Baris Ucapan 1</Label>
                  <Input
                    value={formNota.footerPesan1}
                    onChange={(e) => setFormNota({ ...formNota, footerPesan1: e.target.value })}
                    placeholder="Contoh: Terima kasih telah berbelanja"
                  />
                </div>
                <div>
                  <Label>Baris Ucapan 2</Label>
                  <Input
                    value={formNota.footerPesan2}
                    onChange={(e) => setFormNota({ ...formNota, footerPesan2: e.target.value })}
                    placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar"
                  />
                </div>
                <div>
                  <Label>Baris Ucapan 3 / Media Sosial / Info Kontak (Opsional)</Label>
                  <Input
                    value={formNota.footerPesan3 || ''}
                    onChange={(e) => setFormNota({ ...formNota, footerPesan3: e.target.value })}
                    placeholder="Contoh: Instagram: @tokopasarjaya | Layanan CS: 0812-3456"
                  />
                </div>
              </div>
            </Card>

            {/* Baris Tombol Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalResetNota(true)}>
                Kembalikan ke Default
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="success" onClick={ujiCetakThermal}>
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Uji Cetak Thermal
                </Button>
                <Button onClick={simpanNota}>
                  Simpan Perubahan Template
                </Button>
              </div>
            </div>
          </div>

          {/* Panel Kanan: Live Preview Nota Interaktif (5 Kolom) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Pratinjau Langsung Nota Kasir</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <Badge warna="blue">Lebar: {formNota.lebarKertas}</Badge>
              </div>

              {/* Wadah Kertas Struk Thermal Interaktif */}
              <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-200 p-4 shadow-inner flex justify-center">
                <div
                  className={`relative bg-white text-black p-5 shadow-lg font-mono transition-all duration-200 ${
                    formNota.lebarKertas === '58mm' ? 'w-[250px]' : 'w-[310px]'
                  }`}
                  style={{
                    fontSize: formNota.ukuranFont === 'kecil' ? '11px' : formNota.ukuranFont === 'besar' ? '13px' : '12px',
                    lineHeight: '1.35',
                  }}
                >
                  {/* Efek Sobekan Gerigi Kertas Atas */}
                  <div className="absolute -top-2 left-0 right-0 h-2 bg-radial from-slate-300 to-transparent bg-repeat-x opacity-40" />

                  {/* Header Nota */}
                  <div className="text-center font-bold" style={{ fontSize: formNota.ukuranFont === 'kecil' ? '13px' : formNota.ukuranFont === 'besar' ? '15px' : '14px' }}>
                    {formNota.namaToko || 'NAMA TOKO'}
                  </div>
                  {formNota.alamat && <div className="text-center text-[11px] text-slate-700">{formNota.alamat}</div>}
                  {formNota.telepon && <div className="text-center text-[11px] text-slate-700">Telp: {formNota.telepon}</div>}
                  {formNota.headerPesan && <div className="text-center text-[11px] text-slate-600 mt-0.5">{formNota.headerPesan}</div>}

                  <div className="my-2 border-t border-dashed border-black" />

                  {/* Informasi Metadata */}
                  {formNota.tampilkanNomor && (
                    <div className="flex justify-between"><span>No</span><span>TRX-202610-001</span></div>
                  )}
                  {formNota.tampilkanWaktu && (
                    <div className="flex justify-between"><span>Waktu</span><span>07/10/26 14:30</span></div>
                  )}
                  {formNota.tampilkanKasir && (
                    <div className="flex justify-between"><span>Kasir</span><span>Rina Kasir</span></div>
                  )}

                  <div className="my-2 border-t border-dashed border-black" />

                  {/* Daftar Item Sampel */}
                  <div className="space-y-1.5">
                    {CONTOH_ITEMS.map((item, idx) => {
                      const hargaAsli = item.qty * item.harga
                      const diskon = formNota.tampilkanDiskonItem ? item.diskonItem : 0
                      return (
                        <div key={idx}>
                          <div className="font-semibold">{item.nama}</div>
                          <div className="flex justify-between text-slate-700">
                            <span>
                              {item.qty}
                              {formNota.tampilkanSatuan && item.satuan ? ` ${item.satuan}` : ''} x {angka(item.harga)}
                            </span>
                            <span>{angka(hargaAsli)}</span>
                          </div>
                          {diskon > 0 && (
                            <div className="flex justify-between text-slate-600 pl-2 text-[10px]">
                              <span>Diskon</span>
                              <span>-{angka(diskon)}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="my-2 border-t border-dashed border-black" />

                  {/* Total & Rincian */}
                  {formNota.tampilkanTotalItem && (
                    <div className="flex justify-between"><span>Jumlah Item</span><span>6</span></div>
                  )}
                  <div className="flex justify-between"><span>Subtotal</span><span>{angka(previewSubtotal)}</span></div>

                  {formNota.tampilkanDiskonItem && formNota.tampilkanDiskonNota ? (
                    <>
                      <div className="flex justify-between text-slate-700"><span>Diskon Item</span><span>-{angka(previewDiskonItem)}</span></div>
                      <div className="flex justify-between text-slate-700"><span>Diskon Nota</span><span>-{angka(previewDiskonNota)}</span></div>
                    </>
                  ) : (previewDiskonItem > 0 || previewDiskonNota > 0) && (formNota.tampilkanDiskonItem || formNota.tampilkanDiskonNota) ? (
                    <div className="flex justify-between text-slate-700"><span>Diskon</span><span>-{angka(previewDiskonItem + previewDiskonNota)}</span></div>
                  ) : null}

                  <div className="flex justify-between font-bold text-sm pt-1">
                    <span>TOTAL</span>
                    <span>{rupiah(previewTotal)}</span>
                  </div>

                  {formNota.tampilkanMetodeBayar && (
                    <>
                      <div className="flex justify-between"><span>TUNAI</span><span>{angka(200000)}</span></div>
                      <div className="flex justify-between"><span>Kembali</span><span>{angka(200000 - previewTotal)}</span></div>
                    </>
                  )}

                  <div className="my-2 border-t border-dashed border-black" />

                  {/* Footer Nota */}
                  {formNota.footerPesan1 && <div className="text-center">{formNota.footerPesan1}</div>}
                  {formNota.footerPesan2 && <div className="text-center">{formNota.footerPesan2}</div>}
                  {formNota.footerPesan3 && <div className="text-center text-[10px] mt-1 text-slate-600">{formNota.footerPesan3}</div>}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
                <p className="font-semibold">Informasi Sinkronisasi Struk Kasir:</p>
                <p className="mt-0.5 text-blue-700">
                  Perubahan template nota otomatis langsung digunakan saat kasir mencetak struk di layar POS kasir maupun cetak ulang riwayat transaksi admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SINKRONISASI & CLOUD                                               */}
      {/* ========================================================================= */}
      {tabAktif === 'sinkron' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Produk Terdata" value={produk.length} tone="brand" />
            <StatCard label="Total Transaksi" value={transaksi.length} tone="green" />
            <StatCard label="Pergerakan Stok" value={pergerakan.length} tone="violet" />
            <StatCard
              label="Sinkronisasi Terakhir"
              value={terakhirCloud ? tanggalJam(terakhirCloud.waktu).split(' ')[1] : '-'}
              hint={terakhirCloud ? tanggalJam(terakhirCloud.waktu).split(' ')[0] : 'Belum pernah'}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Status Koneksi & Jaringan" className="lg:col-span-1">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                  <span className="text-emerald-700 font-medium">Server lokal (WiFi toko)</span>
                  <Badge warna="green">Terhubung</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5">
                  <span className="text-brand-700 font-medium">Basis data cloud (backup)</span>
                  <Badge warna="blue">Aktif</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-slate-600">Hak akses berbasis peran</span>
                  <Badge warna="violet">Aktif</Badge>
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={sinkron}>
                Sinkronkan Sekarang ke Cloud
              </Button>
              <p className="mt-2 text-[11px] text-slate-400">
                Pencadangan berjalan otomatis secara berkala melalui enkripsi HTTPS dengan otentikasi token aman.
              </p>
            </Card>

            <Card title="Riwayat Log Sinkronisasi" className="lg:col-span-2">
              <DataTable
                data={logSinkron}
                kolom={[
                  { key: 'waktu', header: 'Waktu', render: (l) => <span className="text-xs text-slate-500">{tanggalJam(l.waktu)}</span> },
                  { key: 'jenis', header: 'Jenis', render: (l) => l.jenis === 'cloud' ? <Badge warna="blue">Cloud</Badge> : <Badge warna="violet">Lokal</Badge> },
                  { key: 'keterangan', header: 'Keterangan', className: 'text-slate-600' },
                  { key: 'jumlah', header: 'Data', align: 'right', render: (l) => l.jumlahData },
                  { key: 'status', header: 'Status', render: (l) => l.status === 'sukses' ? <Badge warna="green">Sukses</Badge> : <Badge warna="amber">Menunggu</Badge> },
                ]}
                kosong="Belum ada log sinkronisasi"
              />
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATA & RESET                                                       */}
      {/* ========================================================================= */}
      {tabAktif === 'data' && (
        <div className="space-y-4">
          <Card title="Penyetelan Ulang Data Bawaan" subtitle="Kembalikan seluruh data sistem ke konfigurasi awal toko." className="border-rose-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-sm text-slate-600">
                Semua data operasional tersimpan pada basis data perangkat ini. Penyetelan ulang akan mengembalikan
                seluruh produk, transaksi, shift, dan riwayat ke kondisi bawaan toko.
              </p>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                Reset Data Toko
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Konfirmasi Reset Data Toko */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Konfirmasi Penyetelan Ulang Data"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={konfirmasiResetData}>
              Ya, Reset Data
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Tindakan ini akan mengembalikan data produk, stok, transaksi, dan riwayat shift ke kondisi awal saat aplikasi pertama kali dipasang.
          Data transaksi yang belum dicadangkan akan hilang. Lanjutkan?
        </p>
      </Modal>

      {/* Modal Konfirmasi Reset Template Nota */}
      <Modal
        open={modalResetNota}
        onClose={() => setModalResetNota(false)}
        title="Kembalikan Format Nota Bawaan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalResetNota(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={kembalikanNotaDefault}>
              Ya, Kembalikan ke Default
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Format nota kasir (nama toko, alamat, ukuran kertas 80mm, pesan penutup bawaan) akan dikembalikan ke setelan awal standar toko.
        </p>
      </Modal>
    </>
  )
}

// Re-export sebagai Sinkronisasi agar kompatibilitas kode terjamin
export { Pengaturan as Sinkronisasi }
