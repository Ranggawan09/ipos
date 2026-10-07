import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { Produk as TProduk, SatuanBertingkat } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { rupiah } from '@/lib/format'
import {
  Button,
  Card,
  CurrencyInput,
  Input,
  Label,
  Modal,
  NumberInput,
  PageHeader,
  Select,
} from '@/components/ui'
import { SelectSatuanDinamis } from '@/components/SelectSatuanDinamis'
import {
  SUMBER_DASAR,
  hitungJualMarginStatis,
  isBagiModalAktif,
  persenMargin,
  terapkanPerubahanModal,
  type ModeMargin,
} from '@/lib/hargaModal'

function PlusIcon({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M12 5v14" />
    </svg>
  )
}

function TrashIcon({ className = '', size = 13 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function RotateCcwIcon({ className = '', size = 10 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function ArrowLeftIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

const kosong: Omit<TProduk, 'id'> = {
  sku: '',
  barcode: '',
  nama: '',
  kategoriId: '',
  satuan: 'pcs',
  hargaBeli: 0,
  hargaJual: 0,
  stok: 0,
  stokMinimum: 5,
  aktif: true,
  tglExpired: '',
  bagiModalOtomatis: true,
  modeMargin: 'nominal',
}

const marginInputUntuk = (mode: ModeMargin, beli: number, jual: number) =>
  mode === 'nominal' ? String(Math.max(0, jual - beli)) : beli > 0 ? String(persenMargin(beli, jual)) : '0'

export function FormProduk() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const location = useLocation()

  const { produk, kategori, supplier, simpanProduk } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const isOwner = currentUser?.role === 'owner' || location.pathname.startsWith('/owner')
  const isDuplikat = location.pathname.endsWith('/duplikat')
  const isTambah = location.pathname.endsWith('/tambah') || (!id && !isDuplikat)
  const isEdit = !isTambah && !isDuplikat && !!id

  const [form, setForm] = useState<Omit<TProduk, 'id'>>(kosong)
  const [marginInput, setMarginInput] = useState<string>('0')
  const [marginType, setMarginType] = useState<ModeMargin>('nominal')

  // State Sub-Satuan Pecahan Modal
  const [modalPecahan, setModalPecahan] = useState(false)
  const [pecahanInduk, setPecahanInduk] = useState('')
  const [pecahanRasio, setPecahanRasio] = useState(0.5)
  const [pecahanNama, setPecahanNama] = useState('')
  const [pecahanKapasitas, setPecahanKapasitas] = useState('')

  // Inisialisasi data form berdasarkan mode
  useEffect(() => {
    if (isTambah) {
      setMarginType('nominal')
      setMarginInput('0')
      let nextNum = produk.length + 1
      let candidateSku = `SKU${String(nextNum).padStart(4, '0')}`
      while (produk.some((x) => x.sku.toLowerCase() === candidateSku.toLowerCase())) {
        nextNum++
        candidateSku = `SKU${String(nextNum).padStart(4, '0')}`
      }
      setForm({
        ...kosong,
        kategoriId: kategori[0]?.id ?? '',
        sku: candidateSku,
        barcode: candidateSku,
        satuanBertingkat: undefined,
      })
    } else if (id) {
      const p = produk.find((x) => x.id === id)
      if (!p) {
        push({ tipe: 'error', judul: 'Produk tidak ditemukan', pesan: `ID ${id} tidak ada.` })
        navigate(isOwner ? '/owner/produk' : '/admin/produk', { replace: true })
        return
      }

      if (isDuplikat) {
        let nextNum = produk.length + 1
        let candidateSku = `SKU${String(nextNum).padStart(4, '0')}`
        while (produk.some((x) => x.sku.toLowerCase() === candidateSku.toLowerCase())) {
          nextNum++
          candidateSku = `SKU${String(nextNum).padStart(4, '0')}`
        }

        setForm({
          ...p,
          sku: candidateSku,
          barcode: candidateSku,
          nama: `${p.nama} (Salinan)`,
          varian: undefined,
          satuanBertingkat: p.satuanBertingkat
            ? p.satuanBertingkat.map((s, i) => ({
                ...s,
                id: `STB-${Date.now()}-${i + 1}`,
              }))
            : undefined,
        })
        const mode = p.modeMargin ?? 'nominal'
        setMarginType(mode)
        setMarginInput(marginInputUntuk(mode, p.hargaBeli, p.hargaJual))
      } else {
        // Edit / Lihat
        setForm({
          ...p,
          satuanBertingkat: p.satuanBertingkat ? structuredClone(p.satuanBertingkat) : undefined,
          varian: undefined,
        })
        const mode = p.modeMargin ?? 'nominal'
        setMarginType(mode)
        setMarginInput(marginInputUntuk(mode, p.hargaBeli, p.hargaJual))
      }
    }
  }, [id, isTambah, isDuplikat, isOwner, produk, kategori])

  const bagiModalAktif = isBagiModalAktif(form)

  const handleKembali = () => {
    navigate(isOwner ? '/owner/produk' : '/admin/produk')
  }

  const handleGantiMarginType = (type: ModeMargin) => {
    if (type === marginType) return
    setMarginType(type)
    if (type === 'nominal') {
      const nominal = Math.max(0, form.hargaJual - form.hargaBeli)
      setMarginInput(String(nominal))
    } else {
      const pct = form.hargaBeli > 0 ? ((form.hargaJual - form.hargaBeli) / form.hargaBeli) * 100 : 0
      const rounded = Math.round(pct * 10) / 10
      setMarginInput(form.hargaBeli > 0 ? String(rounded) : '0')
    }
  }

  const handleMarginChange = (val: string) => {
    setMarginInput(val)
    const pct = parseFloat(val)
    if (!isNaN(pct) && form.hargaBeli > 0) {
      const newJual = Math.round(form.hargaBeli * (1 + pct / 100))
      setForm((prev) => ({ ...prev, hargaJual: Math.max(0, newJual) }))
    }
  }

  const handleMarginNominalChange = (val: number) => {
    const nom = Math.max(0, val)
    setMarginInput(String(nom))
    const newJual = form.hargaBeli + nom
    setForm((prev) => ({ ...prev, hargaJual: Math.max(0, newJual) }))
  }

  const marginPersenDasarInput = () => {
    if (marginType !== 'persen' || marginInput === '') return undefined
    const pct = parseFloat(marginInput)
    return isNaN(pct) ? undefined : pct
  }

  const handleHargaBeliChange = (beliVal: number) => {
    const beli = Math.max(0, beliVal)
    const marginPersenDasar = marginPersenDasarInput()
    setForm((prev) => ({
      ...prev,
      ...terapkanPerubahanModal(prev, SUMBER_DASAR, beli, { modeMargin: marginType, marginPersenDasar }),
    }))
  }

  const toggleBagiModal = () => {
    setForm((prev) => ({ ...prev, bagiModalOtomatis: !isBagiModalAktif(prev) }))
  }

  const handleHargaJualChange = (jualVal: number) => {
    const jual = Math.max(0, jualVal)
    setForm((prev) => ({ ...prev, hargaJual: jual }))
    if (marginType === 'nominal') {
      const nom = Math.max(0, jual - form.hargaBeli)
      setMarginInput(String(nom))
    } else {
      if (form.hargaBeli > 0) {
        const pct = ((jual - form.hargaBeli) / form.hargaBeli) * 100
        const rounded = Math.round(pct * 10) / 10
        setMarginInput(String(rounded))
      }
    }
  }

  const handleBaseSatuanChange = (s: string) => {
    const clean = s.trim().toLowerCase()
    setForm((prev) => {
      const next = { ...prev, satuan: clean }
      if (next.satuanBertingkat && next.satuanBertingkat.length > 0) {
        let prevMultiplier = 1
        let prevNama = clean || 'pcs'
        next.satuanBertingkat = next.satuanBertingkat.map((tier) => {
          const multiplierToBase = (tier.isi || 1) * prevMultiplier
          const res = {
            ...tier,
            satuanTurunan: prevNama,
            multiplierToBase,
          }
          prevMultiplier = multiplierToBase
          prevNama = tier.namaSatuan
          return res
        })
      }
      return next
    })
  }

  // Pecahan
  const bukaTambahPecahan = () => {
    const baseSatuan = form.satuan || 'pcs'
    const list = form.satuanBertingkat || []
    const mainTiers = list.filter((t) => !t.isPecahan)
    const firstInduk = mainTiers.length > 0 ? mainTiers[0].namaSatuan : baseSatuan
    setPecahanInduk(firstInduk)
    setPecahanRasio(0.5)
    setPecahanNama(`1/2 ${firstInduk}`)
    const parentMult = firstInduk.toLowerCase() === baseSatuan.toLowerCase()
      ? 1
      : mainTiers.find((t) => t.namaSatuan.toLowerCase() === firstInduk.toLowerCase())?.multiplierToBase || 1
    const initKapasitas = Math.max(0.001, Math.round(parentMult * 0.5 * 1000) / 1000)
    setPecahanKapasitas(String(initKapasitas))
    setModalPecahan(true)
  }

  const tambahPecahanSimpan = () => {
    const kapasitasVal = parseFloat(pecahanKapasitas)
    if (!pecahanKapasitas.trim() || isNaN(kapasitasVal) || kapasitasVal <= 0) {
      push({
        tipe: 'error',
        judul: 'Kapasitas pecahan belum diisi',
        pesan: 'Kapasitas / bobot pecahan wajib diisi dengan angka lebih dari 0.',
      })
      return
    }

    if (!pecahanNama.trim()) {
      push({
        tipe: 'error',
        judul: 'Nama label belum diisi',
        pesan: 'Nama label kemasan pecahan wajib diisi.',
      })
      return
    }

    const baseSatuan = form.satuan || 'pcs'
    const list = form.satuanBertingkat || []
    const isBase = pecahanInduk.toLowerCase() === baseSatuan.toLowerCase()

    let mult = 1
    let parentBeli = form.hargaBeli || 0
    let parentMargin = 20
    if (form.hargaBeli > 0 && form.hargaJual >= form.hargaBeli) {
      parentMargin = Math.round(((form.hargaJual - form.hargaBeli) / form.hargaBeli) * 100 * 10) / 10
    } else if (marginType === 'persen') {
      parentMargin = parseFloat(marginInput) || 20
    }
    let parentNama = baseSatuan

    if (!isBase) {
      const parent = list.find(
        (t) => !t.isPecahan && t.namaSatuan.toLowerCase() === pecahanInduk.toLowerCase(),
      )
      if (!parent) return
      mult = parent.multiplierToBase
      parentBeli = parent.hargaBeli
      parentMargin = parent.marginPersen || 20
      parentNama = parent.namaSatuan
    }

    const calculatedMult = Math.max(0.001, Math.round(kapasitasVal * 1000) / 1000)
    const effectiveRasio = mult > 0 ? calculatedMult / mult : pecahanRasio
    const hargaBeli = Math.round(parentBeli * effectiveRasio)
    const marginPersen = parentMargin
    const hargaJual = Math.round(hargaBeli * (1 + marginPersen / 100))

    const newPecahan: SatuanBertingkat = {
      id: `STB-FRAC-${Date.now()}`,
      namaSatuan: pecahanNama.trim() || `1/2 ${parentNama}`,
      satuanTurunan: baseSatuan,
      isi: calculatedMult,
      multiplierToBase: calculatedMult,
      hargaBeli,
      marginPersen,
      hargaJual,
      isPecahan: true,
      indukSatuan: parentNama,
      rasio: effectiveRasio,
    }

    setForm({
      ...form,
      satuanBertingkat: [...list, newPecahan],
    })
    setModalPecahan(false)
  }

  const tambahTier = () => {
    const list = form.satuanBertingkat ? [...form.satuanBertingkat] : []
    const baseSatuan = form.satuan || 'pcs'
    const mainTiers = list.filter((t) => !t.isPecahan)
    const prevTier = mainTiers[mainTiers.length - 1]
    const satuanTurunan = prevTier ? prevTier.namaSatuan : baseSatuan
    const prevMultiplier = prevTier ? prevTier.multiplierToBase : 1

    const isi = list.length === 0 ? 12 : 6
    const multiplierToBase = prevMultiplier * isi
    const hargaBeli = (form.hargaBeli || 0) * multiplierToBase
    const marginPersen = 15
    const hargaJual = hargaBeli > 0 ? Math.round(hargaBeli * (1 + marginPersen / 100)) : (form.hargaJual || 0) * multiplierToBase

    const defaultNextNames = ['renceng', 'pax', 'karton', 'dus', 'bal', 'koli']
    const nextName = defaultNextNames.find((n) => !list.some((t) => t.namaSatuan.toLowerCase() === n)) || 'pack'

    const newTier: SatuanBertingkat = {
      id: `STB-${Date.now()}-${list.length + 1}`,
      namaSatuan: nextName,
      satuanTurunan,
      isi,
      multiplierToBase,
      hargaBeli,
      marginPersen,
      hargaJual,
    }

    setForm({
      ...form,
      satuanBertingkat: [...list, newTier],
    })
  }

  const ubahTier = (index: number, field: keyof SatuanBertingkat | 'marginNominal', val: any) => {
    if (!form.satuanBertingkat) return

    if (field === 'hargaBeli') {
      const hasil = terapkanPerubahanModal(form, index, Number(val) || 0, {
        modeMargin: marginType,
        marginPersenDasar: marginPersenDasarInput(),
      })
      setForm({ ...form, ...hasil })
      return
    }

    const list = [...form.satuanBertingkat]
    const current = { ...list[index] }

    if (field === 'marginPersen') {
      const pct = Number(val) || 0
      current.marginPersen = pct
      current.hargaJual = Math.round(current.hargaBeli * (1 + pct / 100))
    } else if (field === 'marginNominal') {
      const nom = Math.max(0, Number(val) || 0)
      current.hargaJual = current.hargaBeli + nom
      current.marginPersen = current.hargaBeli > 0
        ? Math.round((nom / current.hargaBeli) * 100 * 10) / 10
        : 0
    } else if (field === 'hargaJual') {
      const jual = Number(val) || 0
      current.hargaJual = jual
      current.marginPersen = current.hargaBeli > 0
        ? Math.round(((jual - current.hargaBeli) / current.hargaBeli) * 100 * 10) / 10
        : 0
    } else {
      ;(current as any)[field] = val
    }

    list[index] = current

    const bagiAktif = isBagiModalAktif(form)
    const baseBeli = form.hargaBeli || 0
    const sesuaikanModalTier = (item: SatuanBertingkat): SatuanBertingkat => {
      const modalBaru = Math.round(baseBeli * item.multiplierToBase)
      if (modalBaru === item.hargaBeli) return item
      const res = hitungJualMarginStatis(
        item.hargaBeli,
        item.hargaJual,
        modalBaru,
        marginType,
        marginType === 'persen' ? item.marginPersen : undefined,
      )
      return { ...item, hargaBeli: modalBaru, hargaJual: res.hargaJual, marginPersen: res.marginPersen }
    }

    let prevMultiplier = 1
    let prevNama = form.satuan || 'pcs'
    const mainTiersMap = new Map<string, SatuanBertingkat>()

    for (let i = 0; i < list.length; i++) {
      let item = { ...list[i] }
      if (!item.isPecahan) {
        const oldMultiplier = item.multiplierToBase
        item.satuanTurunan = prevNama
        item.multiplierToBase = (item.isi || 1) * prevMultiplier
        if (field === 'isi') {
          const ikutProporsional = bagiAktif
            ? item.multiplierToBase !== oldMultiplier
            : i === index && item.hargaBeli === baseBeli * oldMultiplier
          if (ikutProporsional) item = sesuaikanModalTier(item)
        }
        prevMultiplier = item.multiplierToBase
        prevNama = item.namaSatuan
        mainTiersMap.set(item.namaSatuan.toLowerCase(), item)
      }
      list[i] = item
    }

    for (let i = 0; i < list.length; i++) {
      const item = { ...list[i] }
      if (item.isPecahan && item.indukSatuan) {
        const parent = mainTiersMap.get(item.indukSatuan.toLowerCase())
        if (parent) {
          const oldMultiplier = item.multiplierToBase
          const rasio = item.rasio || 0.5
          item.multiplierToBase = Math.max(0.001, Math.round(parent.multiplierToBase * rasio * 1000) / 1000)
          item.isi = item.multiplierToBase
          list[i] = field === 'isi' && bagiAktif && item.multiplierToBase !== oldMultiplier
            ? sesuaikanModalTier(item)
            : item
        }
      }
    }

    setForm({ ...form, satuanBertingkat: list })
  }

  const resetTierHargaBeli = (index: number) => {
    if (!form.satuanBertingkat) return
    const list = [...form.satuanBertingkat]
    const tier = { ...list[index] }
    tier.hargaBeli = (form.hargaBeli || 0) * tier.multiplierToBase
    tier.hargaJual = Math.round(tier.hargaBeli * (1 + (tier.marginPersen || 15) / 100))
    list[index] = tier
    setForm({ ...form, satuanBertingkat: list })
  }

  const hapusTier = (index: number) => {
    if (!form.satuanBertingkat) return
    const target = form.satuanBertingkat[index]
    const remaining = form.satuanBertingkat.filter((t, i) => {
      if (i === index) return false
      if (!target.isPecahan && t.isPecahan && t.indukSatuan?.toLowerCase() === target.namaSatuan.toLowerCase()) {
        return false
      }
      return true
    })

    if (remaining.length === 0) {
      setForm({ ...form, satuanBertingkat: undefined })
      return
    }

    let prevMultiplier = 1
    let prevNama = form.satuan || 'pcs'
    const mainTiersMap = new Map<string, SatuanBertingkat>()

    const updated = remaining.map((tier) => {
      if (!tier.isPecahan) {
        const multiplierToBase = (tier.isi || 1) * prevMultiplier
        const res = {
          ...tier,
          satuanTurunan: prevNama,
          multiplierToBase,
        }
        prevMultiplier = multiplierToBase
        prevNama = tier.namaSatuan
        mainTiersMap.set(tier.namaSatuan.toLowerCase(), res)
        return res
      }
      return tier
    })

    const finalUpdated = updated.map((tier) => {
      if (tier.isPecahan && tier.indukSatuan) {
        const parent = mainTiersMap.get(tier.indukSatuan.toLowerCase())
        if (parent) {
          const rasio = tier.rasio || 0.5
          const mult = Math.max(0.001, Math.round(parent.multiplierToBase * rasio * 1000) / 1000)
          return {
            ...tier,
            multiplierToBase: mult,
            isi: mult,
          }
        }
      }
      return tier
    })

    setForm({ ...form, satuanBertingkat: finalUpdated })
  }

  const simpan = () => {
    if (!form.nama.trim() || !form.sku.trim()) {
      push({ tipe: 'error', judul: 'Data belum lengkap', pesan: 'Nama dan SKU wajib diisi.' })
      return
    }
    if (form.satuanBertingkat && form.satuanBertingkat.length > 0) {
      const invalid = form.satuanBertingkat.some(
        (s) => !s.namaSatuan.trim() || s.isi <= 0 || s.hargaJual <= 0,
      )
      if (invalid) {
        push({
          tipe: 'error',
          judul: 'Data satuan bertingkat belum lengkap',
          pesan: 'Nama satuan, isi, dan harga jual setiap tingkatan harus diisi dengan benar.',
        })
        return
      }
    }
    const cleanForm: Omit<TProduk, 'id'> = {
      ...form,
      barcode: form.barcode || form.sku, // barcode diisi otomatis dari SKU
      varian: undefined,
      satuanBertingkat: form.satuanBertingkat && form.satuanBertingkat.length > 0 ? form.satuanBertingkat : undefined,
      bagiModalOtomatis: isBagiModalAktif(form),
      modeMargin: marginType,
    }
    simpanProduk(isEdit ? { ...cleanForm, id } : cleanForm)
    push({
      tipe: 'sukses',
      judul: isDuplikat ? 'Produk berhasil diduplikat' : isEdit ? 'Produk diperbarui' : 'Produk ditambahkan',
      pesan: form.nama,
    })
    navigate(isOwner ? '/owner/produk' : '/admin/produk')
  }

  const judulHalaman = isOwner
    ? 'Detail Produk (Read-Only)'
    : isDuplikat
    ? 'Duplikat Produk'
    : isEdit
    ? 'Ubah Data Produk'
    : 'Tambah Produk Baru'

  const deskripsiHalaman = isOwner
    ? `Melihat rincian produk ${form.nama || ''} dalam mode baca owner.`
    : isDuplikat
    ? `Membuat produk baru dari salinan ${form.nama || ''}.`
    : isEdit
    ? `Perbarui informasi, harga, batas stok, dan multi-satuan untuk ${form.nama || ''}.`
    : 'Masukkan data item barang baru, atur harga dasar, batas stok, dan opsi multi-satuan.'

  return (
    <div className="space-y-5 pb-12">
      {/* Header Halaman Luas */}
      <PageHeader
        judul={judulHalaman}
        deskripsi={deskripsiHalaman}
        aksi={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleKembali}>
              <ArrowLeftIcon size={16} className="mr-1.5" />
              Kembali
            </Button>
            {!isOwner && (
              <Button onClick={simpan}>
                Simpan Produk
              </Button>
            )}
          </div>
        }
      />

      {/* Grid Informasi Utama Produk */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Kolom Kiri (2 cols): Informasi Identitas & Klasifikasi */}
        <Card className="lg:col-span-2 space-y-4" title="Informasi Identitas & Kategori" subtitle="Rincian nama item, nomor SKU, kategori dan pemasok toko">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nama Produk <span className="text-rose-500">*</span></Label>
              <Input
                value={form.nama}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Contoh: Kopi Kapal Api Special Mix"
                className="text-sm font-medium"
              />
            </div>

            <div>
              <Label>Kode SKU <span className="text-rose-500">*</span></Label>
              <Input
                value={form.sku}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="SKU0001"
                className="font-mono text-xs uppercase"
              />
              <p className="mt-1 text-[11px] text-slate-400">Kode unik pengenal produk di sistem kasir.</p>
            </div>

            <div>
              <Label>Kategori Produk</Label>
              <Select
                value={form.kategoriId}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}
              >
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Satuan Terkecil (Base Unit) <span className="text-rose-500">*</span></Label>
              <SelectSatuanDinamis
                value={form.satuan}
                onChange={handleBaseSatuanChange}
                placeholder="Pilih/ketik satuan dasar..."
                disabled={isOwner}
              />
              <p className="mt-1 text-[11px] text-slate-400">Dasar perhitungan stok fisik (mis. pcs, kg, botol).</p>
            </div>

            <div>
              <Label>Supplier Pemasok</Label>
              <Select
                value={form.supplierId || ''}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value || undefined })}
              >
                <option value="">-- Belum Ditentukan --</option>
                {supplier.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.kontak})
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-slate-400">Pemasok utama untuk pesanan restock otomatis.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.aktif}
                disabled={isOwner}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Produk aktif dijual di kasir</span>
            </label>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.aktif ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
              {form.aktif ? 'Aktif' : 'Non-Aktif'}
            </span>
          </div>
        </Card>

        {/* Kolom Kanan (1 col): Manajemen Stok & Kedaluwarsa */}
        <Card className="space-y-4" title="Manajemen Stok Fisik" subtitle="Kontrol kuantitas stok dan batas peringatan menipis">
          <div>
            <Label>Stok Fisik Saat Ini ({form.satuan || 'pcs'})</Label>
            <NumberInput
              value={form.stok}
              disabled={isOwner}
              onChange={(val) => setForm({ ...form, stok: val })}
              placeholder="0"
              className="text-base font-mono font-bold"
            />
            <p className="mt-1 text-[11px] text-slate-400">Kuantitas stok riil di gudang/toko dalam satuan terkecil.</p>
          </div>

          <div>
            <Label>Batas Minimum Peringatan</Label>
            <NumberInput
              value={form.stokMinimum}
              disabled={isOwner}
              onChange={(val) => setForm({ ...form, stokMinimum: val })}
              placeholder="5"
              className="text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-400">Sistem memberi tanda peringatan jika stok di bawah angka ini.</p>
          </div>

          <div>
            <Label>Tanggal Kedaluwarsa (Expired)</Label>
            <Input
              type="date"
              value={form.tglExpired || ''}
              disabled={isOwner}
              onChange={(e) => setForm({ ...form, tglExpired: e.target.value || undefined })}
              className="text-xs"
            />
            <p className="mt-1 text-[11px] text-slate-400">Opsional untuk makanan & produk dengan tanggal kedaluwarsa.</p>
          </div>
        </Card>
      </div>

      {/* Card Lebar: Penetapan Harga, Margin & Satuan Bertingkat (Terpadu) */}
      <Card
        title="Penetapan Harga, Margin & Satuan Bertingkat (Terpadu)"
        subtitle={`Atur modal, margin keuntungan, dan harga jual pada satuan eceran dasar (${form.satuan || 'pcs'}) maupun satuan grosir dan sub-satuan pecahan.`}
        action={
          !isOwner && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={bukaTambahPecahan}
                className="text-sky-700 border-sky-300 hover:bg-sky-50"
              >
                <PlusIcon size={14} className="mr-1" /> Tambah Pecahan
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={tambahTier}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <PlusIcon size={14} className="mr-1" /> Tambah Satuan Bertingkat
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          {/* Tabel Terpadu */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4 w-52">Nama Satuan</th>
                    <th className="py-3 px-4 w-56">Isi / Konversi</th>
                    <th className="py-3 px-4 w-52">
                      <div className="flex items-center justify-between gap-1.5">
                        <span>Modal (Rp)</span>
                        <button
                          type="button"
                          id="toggle-bagi-modal-otomatis"
                          role="switch"
                          aria-checked={bagiModalAktif}
                          onClick={toggleBagiModal}
                          disabled={isOwner}
                          title={
                            bagiModalAktif
                              ? 'Bagi modal otomatis AKTIF: mengubah modal salah satu satuan (atau saat penerimaan barang) akan menghitung ulang modal semua satuan & pecahan secara proporsional.'
                              : 'Bagi modal otomatis NONAKTIF: perubahan modal hanya berlaku untuk satuan yang diubah/diterima.'
                          }
                          className={`group inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            bagiModalAktif
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${bagiModalAktif ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all duration-200 ${bagiModalAktif ? 'left-3' : 'left-0.5'}`} />
                          </span>
                          Bagi otomatis
                        </button>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-36">
                      <div className="flex items-center justify-between gap-1.5">
                        <span>Margin</span>
                        <div className="inline-flex rounded bg-slate-200/80 p-0.5 text-[9px] font-medium shrink-0">
                          <button
                            type="button"
                            disabled={isOwner}
                            onClick={() => handleGantiMarginType('persen')}
                            className={`rounded px-1.5 py-0.5 transition ${
                              marginType === 'persen'
                                ? 'bg-white font-bold text-emerald-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            disabled={isOwner}
                            onClick={() => handleGantiMarginType('nominal')}
                            className={`rounded px-1.5 py-0.5 transition ${
                              marginType === 'nominal'
                                ? 'bg-white font-bold text-emerald-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Rp
                          </button>
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-64">Harga Jual & Estimasi Laba</th>
                    {!isOwner && <th className="py-3 px-3 text-center w-14">Hapus</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Baris 1: Satuan Dasar */}
                  <tr className="bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm capitalize">
                          {form.satuan || 'pcs'}
                        </span>
                        <span className="rounded bg-emerald-100/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                          Dasar (Eceran)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-700 font-semibold">1 {form.satuan || 'pcs'}</span>
                      <span className="text-[11px] text-slate-400 block font-normal">(Satuan Terkecil Toko)</span>
                    </td>
                    <td className="py-3 px-4">
                      <CurrencyInput
                        sizeVariant="sm"
                        value={form.hargaBeli}
                        disabled={isOwner}
                        onChange={handleHargaBeliChange}
                        placeholder="0"
                        className="text-xs font-mono font-semibold w-full max-w-[150px]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      {marginType === 'persen' ? (
                        <div className="relative flex items-center w-full max-w-[120px]">
                          <Input
                            type="number"
                            step="0.1"
                            disabled={isOwner}
                            value={marginInput}
                            onChange={(e) => handleMarginChange(e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs font-mono pr-5 text-emerald-600 font-semibold"
                          />
                          <span className="pointer-events-none absolute right-2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                      ) : (
                        <CurrencyInput
                          sizeVariant="sm"
                          disabled={isOwner}
                          value={parseFloat(marginInput) || 0}
                          onChange={handleMarginNominalChange}
                          placeholder="0"
                          className="w-full max-w-[120px] text-xs font-mono font-semibold text-emerald-600"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <CurrencyInput
                        sizeVariant="sm"
                        value={form.hargaJual}
                        disabled={isOwner}
                        onChange={handleHargaJualChange}
                        placeholder="0"
                        className="text-xs font-mono font-bold text-slate-800 w-full max-w-[190px]"
                      />
                      <p className={`text-[11px] font-medium mt-1 ${form.hargaJual >= form.hargaBeli ? 'text-emerald-700' : 'text-rose-600'}`}>
                        Laba kotor: <strong className="font-semibold">{rupiah(form.hargaJual - form.hargaBeli)}</strong> / {form.satuan || 'pcs'}
                        <span className="ml-1 text-[10px] text-slate-400">
                          ({form.hargaBeli > 0 ? (((form.hargaJual - form.hargaBeli) / form.hargaBeli) * 100).toFixed(1) : '0'}%)
                        </span>
                      </p>
                    </td>
                    {!isOwner && (
                      <td className="py-3 px-3 text-center text-slate-300 text-xs">
                        —
                      </td>
                    )}
                  </tr>

                  {/* Baris 2..N: Satuan Bertingkat & Pecahan */}
                  {form.satuanBertingkat?.map((tier, idx) => {
                    const isModalOverridden = !bagiModalAktif && tier.hargaBeli !== ((form.hargaBeli || 0) * tier.multiplierToBase)
                    const labaNominal = tier.hargaJual - tier.hargaBeli

                    return (
                      <tr key={tier.id || idx} className={`${tier.isPecahan ? 'bg-sky-50/30 hover:bg-sky-50/60' : 'bg-white hover:bg-slate-50/70'} transition-colors`}>
                        <td className="py-3 px-4">
                          {tier.isPecahan ? (
                            <div className="space-y-1">
                              <Input
                                value={tier.namaSatuan}
                                disabled={isOwner}
                                onChange={(e) => ubahTier(idx, 'namaSatuan', e.target.value)}
                                placeholder="Nama pecahan..."
                                className="text-xs py-1"
                              />
                              <span className="inline-flex items-center gap-1 rounded bg-sky-100/80 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 border border-sky-200">
                                Pecahan {tier.rasio === 0.5 ? '1/2' : tier.rasio === 0.25 ? '1/4' : `${tier.multiplierToBase} ${form.satuan || 'pcs'}`} {tier.indukSatuan ? `(${tier.indukSatuan})` : ''}
                              </span>
                            </div>
                          ) : (
                            <SelectSatuanDinamis
                              value={tier.namaSatuan}
                              onChange={(val) => ubahTier(idx, 'namaSatuan', val)}
                              placeholder="Satuan..."
                              sizeVariant="sm"
                              disabled={isOwner}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {tier.isPecahan ? (
                            <div>
                              <span className="text-xs font-semibold text-slate-700 font-mono">
                                {tier.multiplierToBase} {form.satuan || 'pcs'}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                ({tier.rasio === 0.5 ? '1/2' : tier.rasio === 0.25 ? '1/4' : `${tier.multiplierToBase} ${form.satuan || 'pcs'}`} dari 1 {tier.indukSatuan})
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500 whitespace-nowrap">1 =</span>
                                <NumberInput
                                  min={1}
                                  disabled={isOwner}
                                  value={tier.isi}
                                  onChange={(val) => ubahTier(idx, 'isi', val)}
                                  placeholder="1"
                                  className="w-16 px-1.5 py-1 text-xs font-mono text-center"
                                />
                                <span className="text-xs font-medium text-slate-700 whitespace-nowrap" title={tier.satuanTurunan}>
                                  {tier.satuanTurunan}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] text-emerald-700 font-semibold font-mono whitespace-nowrap">
                                (= {tier.multiplierToBase} {form.satuan || 'pcs'})
                              </p>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative max-w-[150px]">
                            <CurrencyInput
                              sizeVariant="sm"
                              value={tier.hargaBeli}
                              disabled={isOwner}
                              onChange={(val) => ubahTier(idx, 'hargaBeli', val)}
                              placeholder="0"
                              className={`text-xs font-mono w-full ${isModalOverridden ? 'border-amber-400 bg-amber-50/30' : ''}`}
                            />
                            {isModalOverridden && !isOwner && (
                              <button
                                type="button"
                                onClick={() => resetTierHargaBeli(idx)}
                                title="Reset modal ke proporsional dasar"
                                className="absolute right-1 top-1 text-[9px] text-amber-600 hover:text-amber-800 flex items-center gap-0.5 bg-amber-100/80 px-1 rounded"
                              >
                                <RotateCcwIcon size={10} /> reset
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {marginType === 'persen' ? (
                            <div className="relative flex items-center w-full max-w-[120px]">
                              <Input
                                type="number"
                                step="0.5"
                                disabled={isOwner}
                                value={tier.marginPersen ?? 0}
                                onChange={(e) => ubahTier(idx, 'marginPersen', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2 py-1 text-xs font-mono pr-5 text-emerald-600 font-semibold"
                              />
                              <span className="pointer-events-none absolute right-2 text-[10px] font-bold text-slate-400">%</span>
                            </div>
                          ) : (
                            <CurrencyInput
                              sizeVariant="sm"
                              disabled={isOwner}
                              value={Math.max(0, tier.hargaJual - tier.hargaBeli)}
                              onChange={(val) => ubahTier(idx, 'marginNominal', val)}
                              placeholder="0"
                              className="w-full max-w-[120px] text-xs font-mono font-semibold text-emerald-600"
                            />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <CurrencyInput
                            sizeVariant="sm"
                            value={tier.hargaJual}
                            disabled={isOwner}
                            onChange={(val) => ubahTier(idx, 'hargaJual', val)}
                            placeholder="0"
                            className="text-xs font-mono font-bold text-slate-800 w-full max-w-[190px]"
                          />
                          <p className={`text-[11px] font-medium mt-1 ${labaNominal >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            Laba kotor: <strong className="font-semibold">{rupiah(labaNominal)}</strong> / {tier.namaSatuan || 'unit'}
                            <span className="ml-1 text-[10px] text-slate-400">
                              ({tier.marginPersen ? `${tier.marginPersen}%` : '0%'})
                            </span>
                          </p>
                        </td>
                        {!isOwner && (
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => hapusTier(idx)}
                              className="h-7 w-7 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center transition"
                              title="Hapus tingkatan satuan ini"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 text-xs text-emerald-950 flex items-start gap-2.5">
            <span className="font-bold text-emerald-700 mt-0.5">💡 Sistem Satuan Terpadu:</span>
            <div className="space-y-1">
              <p>
                Stok fisik tersentralisasi pada satuan eceran dasar (<strong>{form.satuan || 'pcs'}</strong>). Anda dapat menambahkan satuan grosir berjenjang (renceng, pax, karton) atau sub-satuan pecahan (1/2, 1/4) agar kasir dapat menjual dengan pilihan satuan fleksibel dan stok terpotong otomatis.
              </p>
              <p className="text-[11px] text-emerald-800">
                <strong>Margin statis:</strong> setiap kali modal berubah (manual maupun penerimaan barang), harga jual otomatis menyesuaikan agar margin ({marginType === 'persen' ? '%' : 'Rp'}) tetap.{' '}
                <strong>Bagi otomatis</strong> {bagiModalAktif ? 'aktif — modal semua satuan & pecahan ikut dihitung proporsional.' : 'nonaktif — hanya modal satuan yang diubah/diterima yang berubah.'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Floating / Sticky Footer Actions */}
      {!isOwner && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={handleKembali}>
            Batal
          </Button>
          <Button onClick={simpan}>
            Simpan Produk
          </Button>
        </div>
      )}

      {/* Modal Tambah Sub-Satuan Pecahan */}
      <Modal
        open={modalPecahan}
        onClose={() => setModalPecahan(false)}
        title="Tambah Sub-Satuan Pecahan"
        lebar="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalPecahan(false)}>
              Batal
            </Button>
            <Button onClick={tambahPecahanSimpan}>
              Tambahkan Pecahan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Pilih Satuan Induk</Label>
            <Select
              value={pecahanInduk}
              onChange={(e) => {
                const val = e.target.value
                setPecahanInduk(val)
                const fracStr = pecahanRasio === 0.5 ? '1/2' : pecahanRasio === 0.25 ? '1/4' : `${Math.round(pecahanRasio * 100)}%`
                setPecahanNama(`${fracStr} ${val}`)
                const baseSatuan = form.satuan || 'pcs'
                const pMult = val.toLowerCase() === baseSatuan.toLowerCase()
                  ? 1
                  : form.satuanBertingkat?.find((t) => !t.isPecahan && t.namaSatuan.toLowerCase() === val.toLowerCase())?.multiplierToBase || 1
                const newKapasitas = Math.max(0.001, Math.round(pMult * pecahanRasio * 1000) / 1000)
                setPecahanKapasitas(String(newKapasitas))
              }}
            >
              <option value={form.satuan || 'pcs'}>
                {form.satuan || 'pcs'} (Satuan Dasar — {rupiah(form.hargaJual)})
              </option>
              {form.satuanBertingkat
                ?.filter((t) => !t.isPecahan && t.namaSatuan.toLowerCase() !== (form.satuan || 'pcs').toLowerCase())
                .map((t) => (
                  <option key={t.id} value={t.namaSatuan}>
                    {t.namaSatuan} (isi {t.multiplierToBase} {form.satuan || 'pcs'} — {rupiah(t.hargaJual)})
                  </option>
                ))}
            </Select>
          </div>

          {(() => {
            const baseSatuan = form.satuan || 'pcs'
            const isBase = pecahanInduk.toLowerCase() === baseSatuan.toLowerCase()
            const parent = isBase
              ? { multiplierToBase: 1, hargaBeli: form.hargaBeli || 0, hargaJual: form.hargaJual || 0, namaSatuan: baseSatuan }
              : form.satuanBertingkat?.find(
                  (t) => !t.isPecahan && t.namaSatuan.toLowerCase() === pecahanInduk.toLowerCase(),
                )
            if (!parent) return null
            const kapasitasVal = parseFloat(pecahanKapasitas) || 0
            const isValidKapasitas = kapasitasVal > 0
            const effectiveRasio = isValidKapasitas && parent.multiplierToBase > 0 ? kapasitasVal / parent.multiplierToBase : pecahanRasio
            const estModal = Math.round(parent.hargaBeli * effectiveRasio)
            const estJual = Math.round(parent.hargaJual * effectiveRasio)

            const presets = parent.multiplierToBase >= 5
              ? [
                  { label: '5 kg', val: 5 / parent.multiplierToBase, name: '5kg' },
                  { label: '2 kg', val: 2 / parent.multiplierToBase, name: '2kg' },
                  { label: '1 kg', val: 1 / parent.multiplierToBase, name: '1kg' },
                  { label: '1/2 (Setengah)', val: 0.5, name: `1/2 ${parent.namaSatuan}` },
                  { label: '1/4 (Seperempat)', val: 0.25, name: `1/4 ${parent.namaSatuan}` },
                ]
              : [
                  { label: `1/2 ${baseSatuan} (Setengah)`, val: 0.5, name: `1/2${baseSatuan}` },
                  { label: `1/4 ${baseSatuan} (Seperempat)`, val: 0.25, name: `1/4${baseSatuan}` },
                  { label: `1/10 ${baseSatuan}`, val: 0.1, name: `0.1${baseSatuan}` },
                  { label: '1/3', val: 0.333, name: `1/3 ${parent.namaSatuan}` },
                ]

            return (
              <>
                <div>
                  <Label>Pilihan Cepat / Preset Ukuran</Label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => {
                      const isActive = isValidKapasitas && Math.abs(pecahanRasio - p.val) < 0.001
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setPecahanRasio(p.val)
                            setPecahanNama(p.name)
                            const newKapasitas = Math.max(0.001, Math.round(parent.multiplierToBase * p.val * 1000) / 1000)
                            setPecahanKapasitas(String(newKapasitas))
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            isActive
                              ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label>
                    Kapasitas / Bobot Pecahan ({baseSatuan}) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="any"
                      min="0.001"
                      value={pecahanKapasitas}
                      onChange={(e) => {
                        const str = e.target.value
                        setPecahanKapasitas(str)
                        const val = parseFloat(str)
                        if (!isNaN(val) && val > 0 && parent.multiplierToBase > 0) {
                          const r = val / parent.multiplierToBase
                          setPecahanRasio(r)
                          const fracLabel = val === 0.5 ? '1/2' : val === 0.25 ? '1/4' : `${val}`
                          setPecahanNama(`${fracLabel}${baseSatuan}`)
                        }
                      }}
                      placeholder={`Kapasitas dalam ${baseSatuan}...`}
                      className={`text-xs font-mono font-bold ${
                        !pecahanKapasitas.trim() || (parseFloat(pecahanKapasitas) || 0) <= 0
                          ? 'border-rose-400 focus:border-rose-500'
                          : ''
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {baseSatuan}{' '}
                      {isValidKapasitas
                        ? `(= ${Math.round(effectiveRasio * 1000) / 10}% dari ${parent.namaSatuan})`
                        : ''}
                    </span>
                  </div>
                  {(!pecahanKapasitas.trim() || (parseFloat(pecahanKapasitas) || 0) <= 0) && (
                    <p className="mt-1 text-[11px] text-rose-500">
                      Kapasitas / bobot pecahan wajib diisi dengan nilai lebih dari 0.
                    </p>
                  )}
                </div>

                <div>
                  <Label>
                    Nama Label Kemasan <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={pecahanNama}
                    onChange={(e) => setPecahanNama(e.target.value)}
                    placeholder="contoh: 5kg, 1/2kg, atau Setengah Renceng"
                  />
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-2 text-xs">
                  <p className="font-bold text-sky-900">Kalkulasi Otomatis (Proporsional):</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white p-2 border border-sky-100">
                      <span className="text-[10px] text-slate-400 block">Kapasitas Isi</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {isValidKapasitas ? `${kapasitasVal} ${baseSatuan}` : '-'}
                      </span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-sky-100">
                      <span className="text-[10px] text-slate-400 block">Estimasi Modal</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {isValidKapasitas ? rupiah(estModal) : '-'}
                      </span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-sky-100">
                      <span className="text-[10px] text-slate-400 block">Estimasi Jual</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {isValidKapasitas ? rupiah(estJual) : '-'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-sky-800 italic">
                    * Setelah ditambahkan ke tabel, Anda dapat mengubah kembali harga beli, margin, maupun harga jual secara manual (override).
                  </p>
                </div>
              </>
            )
          })()}
        </div>
      </Modal>
    </div>
  )
}
