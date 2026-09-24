import { useMemo, useState } from 'react'
import type { Produk as TProduk, SatuanBertingkat, VarianBobot } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { angka, rupiah } from '@/lib/format'
import { Badge, Button, Card, CurrencyInput, DataTable, FR, Input, Label, Modal, NumberInput, PageHeader, Select } from '@/components/ui'
import { SelectSatuanDinamis } from '@/components/SelectSatuanDinamis'

function LayersIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
  )
}

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

const kosong: Omit<TProduk, 'id'> = {
  sku: '', barcode: '', nama: '', kategoriId: '', satuan: 'pcs',
  hargaBeli: 0, hargaJual: 0, stok: 0, stokMinimum: 5, aktif: true,
  tglExpired: '',
}

export function Produk() {
  const { produk, kategori, supplier, simpanProduk, hapusProduk, resepKonversi } = useDataStore()
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [cari, setCari] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [filterStok, setFilterStok] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<TProduk | null>(null)
  const [form, setForm] = useState<Omit<TProduk, 'id'>>(kosong)
  const [marginInput, setMarginInput] = useState<string>('')
  const [marginType, setMarginType] = useState<'persen' | 'nominal'>('persen')
  const [isDuplikat, setIsDuplikat] = useState(false)
  const [hapusTarget, setHapusTarget] = useState<TProduk | null>(null)
  const [modalPecahan, setModalPecahan] = useState(false)
  const [pecahanInduk, setPecahanInduk] = useState('')
  const [pecahanRasio, setPecahanRasio] = useState(0.5)
  const [pecahanNama, setPecahanNama] = useState('')

  const katNama = (id: string) => kategori.find((k) => k.id === id)?.nama ?? '-'

  const rows = useMemo(() => {
    const q = cari.toLowerCase()
    return produk.filter((p) => {
      const cocok =
        !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)
      const kat = !filterKat || p.kategoriId === filterKat
      const stok =
        filterStok === 'kritis' ? p.stok <= p.stokMinimum :
          filterStok === 'habis' ? p.stok === 0 :
            filterStok === 'aman' ? p.stok > p.stokMinimum : true
      return cocok && kat && stok
    })
  }, [produk, cari, filterKat, filterStok])

  const totalNilai = rows.reduce((a, p) => a + p.stok * p.hargaBeli, 0)

  const bukaTambah = () => {
    setEdit(null)
    setIsDuplikat(false)
    setMarginType('persen')
    setMarginInput('20')
    setForm({
      ...kosong,
      kategoriId: kategori[0]?.id ?? '',
      sku: `SKU${String(produk.length + 1).padStart(4, '0')}`,
      barcode: String(8990000000 + produk.length + 1),
      satuanBertingkat: undefined,
    })
    setModal(true)
  }

  const bukaEdit = (p: TProduk) => {
    setEdit(p)
    setIsDuplikat(false)
    setForm({
      ...p,
      satuanBertingkat: p.satuanBertingkat ? structuredClone(p.satuanBertingkat) : undefined,
      varian: p.varian ? structuredClone(p.varian) : undefined,
    })
    setMarginType('persen')
    const pct = p.hargaBeli > 0 ? ((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100 : 0
    const rounded = Math.round(pct * 10) / 10
    setMarginInput(p.hargaBeli > 0 ? String(rounded) : '')
    setModal(true)
  }

  const bukaDuplikat = (p: TProduk) => {
    setEdit(null)
    setIsDuplikat(true)
    let nextNum = produk.length + 1
    let candidateSku = `SKU${String(nextNum).padStart(4, '0')}`
    while (produk.some((x) => x.sku.toLowerCase() === candidateSku.toLowerCase())) {
      nextNum++
      candidateSku = `SKU${String(nextNum).padStart(4, '0')}`
    }
    const nextBarcode = String(8990000000 + nextNum)

    setForm({
      ...p,
      sku: candidateSku,
      barcode: nextBarcode,
      nama: `${p.nama} (Salinan)`,
      varian: p.varian
        ? p.varian.map((v, i) => ({
          ...v,
          id: `VAR-${Date.now()}-${i + 1}`,
        }))
        : undefined,
      satuanBertingkat: p.satuanBertingkat
        ? p.satuanBertingkat.map((s, i) => ({
          ...s,
          id: `STB-${Date.now()}-${i + 1}`,
        }))
        : undefined,
    })
    setMarginType('persen')
    const pct = p.hargaBeli > 0 ? ((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100 : 0
    const rounded = Math.round(pct * 10) / 10
    setMarginInput(p.hargaBeli > 0 ? String(rounded) : '')
    setModal(true)
  }

  const handleGantiMarginType = (type: 'persen' | 'nominal') => {
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

  const handleHargaBeliChange = (beliVal: number) => {
    const beli = Math.max(0, beliVal)
    setForm((prev) => {
      let newJual = prev.hargaJual
      if (marginType === 'nominal') {
        const nom = parseFloat(marginInput) || 0
        newJual = Math.max(0, beli + nom)
      } else {
        const pct = parseFloat(marginInput)
        if (!isNaN(pct) && marginInput !== '' && beli > 0) {
          newJual = Math.max(0, Math.round(beli * (1 + pct / 100)))
        }
      }

      let updatedBertingkat = prev.satuanBertingkat
      if (updatedBertingkat && updatedBertingkat.length > 0) {
        const prevBeli = prev.hargaBeli || 0
        updatedBertingkat = updatedBertingkat.map((tier) => {
          if (tier.hargaBeli === prevBeli * tier.multiplierToBase) {
            const tierBeli = beli * tier.multiplierToBase
            const tierJual = Math.round(tierBeli * (1 + (tier.marginPersen || 0) / 100))
            return {
              ...tier,
              hargaBeli: tierBeli,
              hargaJual: tierJual,
            }
          }
          return tier
        })
      }

      return {
        ...prev,
        hargaBeli: beli,
        hargaJual: newJual,
        satuanBertingkat: updatedBertingkat,
      }
    })
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

  const toggleVarian = (checked: boolean) => {
    if (checked) {
      const defaultSatuan = form.satuan === 'pcs' ? 'kg' : form.satuan
      setForm({
        ...form,
        satuan: defaultSatuan,
        varian: [
          { id: `VAR-${Date.now()}-1`, nama: '5 kg', bobot: 5, hargaJual: Math.round(form.hargaJual * 5) || 70000 },
          { id: `VAR-${Date.now()}-2`, nama: '2 kg', bobot: 2, hargaJual: Math.round(form.hargaJual * 2) || 30000 },
          { id: `VAR-${Date.now()}-3`, nama: '1 kg', bobot: 1, hargaJual: form.hargaJual || 15000 },
        ],
      })
    } else {
      setForm({ ...form, varian: undefined })
    }
  }

  const tambahVarian = () => {
    const list = form.varian ? [...form.varian] : []
    list.push({
      id: `VAR-${Date.now()}-${list.length + 1}`,
      nama: '',
      bobot: 1,
      hargaJual: form.hargaJual || 0,
    })
    setForm({ ...form, varian: list })
  }

  const ubahVarian = (index: number, field: keyof VarianBobot, val: any) => {
    if (!form.varian) return
    const list = form.varian.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    setForm({ ...form, varian: list })
  }

  const hapusVarian = (index: number) => {
    if (!form.varian) return
    const list = form.varian.filter((_, i) => i !== index)
    setForm({ ...form, varian: list.length > 0 ? list : undefined })
  }

  // ---- Pengelolaan Satuan Bertingkat Dinamis ----
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

  const toggleSatuanBertingkat = (checked: boolean) => {
    if (checked) {
      const baseSatuan = form.satuan || 'pcs'
      const baseBeli = form.hargaBeli || 0
      const baseJual = form.hargaJual || 0
      const defaultTierName = baseSatuan.toLowerCase() === 'pcs' ? 'renceng' : 'pack'
      const isi = 12
      const multiplierToBase = 12
      const hargaBeli = baseBeli * multiplierToBase
      const marginPersen = 20
      const hargaJual = hargaBeli > 0 ? Math.round(hargaBeli * (1 + marginPersen / 100)) : baseJual * multiplierToBase

      setForm({
        ...form,
        satuanBertingkat: [
          {
            id: `STB-${Date.now()}-1`,
            namaSatuan: defaultTierName,
            satuanTurunan: baseSatuan,
            isi,
            multiplierToBase,
            hargaBeli,
            marginPersen,
            hargaJual,
          },
        ],
      })
    } else {
      setForm({ ...form, satuanBertingkat: undefined })
    }
  }

  const bukaTambahPecahan = () => {
    if (!form.satuanBertingkat) return
    const mainTiers = form.satuanBertingkat.filter((t) => !t.isPecahan)
    if (mainTiers.length === 0) {
      push({
        tipe: 'peringatan',
        judul: 'Belum ada tingkatan satuan',
        pesan: 'Tambahkan tingkatan satuan utama terlebih dahulu (misal: renceng atau pax).',
      })
      return
    }
    const firstInduk = mainTiers[0].namaSatuan
    setPecahanInduk(firstInduk)
    setPecahanRasio(0.5)
    setPecahanNama(`1/2 ${firstInduk}`)
    setModalPecahan(true)
  }

  const tambahPecahanSimpan = () => {
    if (!form.satuanBertingkat) return
    const parent = form.satuanBertingkat.find(
      (t) => !t.isPecahan && t.namaSatuan.toLowerCase() === pecahanInduk.toLowerCase(),
    )
    if (!parent) return

    const mult = Math.max(0.1, Math.round(parent.multiplierToBase * pecahanRasio * 10) / 10)
    const hargaBeli = Math.round(parent.hargaBeli * pecahanRasio)
    const marginPersen = parent.marginPersen || 20
    const hargaJual = Math.round(hargaBeli * (1 + marginPersen / 100))

    const newPecahan: SatuanBertingkat = {
      id: `STB-FRAC-${Date.now()}`,
      namaSatuan: pecahanNama.trim() || `1/2 ${parent.namaSatuan}`,
      satuanTurunan: form.satuan || 'pcs',
      isi: mult,
      multiplierToBase: mult,
      hargaBeli,
      marginPersen,
      hargaJual,
      isPecahan: true,
      indukSatuan: parent.namaSatuan,
      rasio: pecahanRasio,
    }

    setForm({
      ...form,
      satuanBertingkat: [...form.satuanBertingkat, newPecahan],
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

    const isi = 6
    const multiplierToBase = prevMultiplier * isi
    const hargaBeli = (form.hargaBeli || 0) * multiplierToBase
    const marginPersen = 15
    const hargaJual = hargaBeli > 0 ? Math.round(hargaBeli * (1 + marginPersen / 100)) : (form.hargaJual || 0) * multiplierToBase

    const defaultNextNames = ['pax', 'karton', 'dus', 'bal', 'koli']
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
    } else if (field === 'hargaBeli') {
      const beli = Number(val) || 0
      current.hargaBeli = beli
      if (marginType === 'nominal') {
        const prevNom = Math.max(0, list[index].hargaJual - list[index].hargaBeli)
        current.hargaJual = beli + prevNom
        current.marginPersen = beli > 0 ? Math.round((prevNom / beli) * 100 * 10) / 10 : 0
      } else {
        current.hargaJual = Math.round(beli * (1 + (current.marginPersen || 0) / 100))
      }
    } else {
      ; (current as any)[field] = val
    }

    list[index] = current

    // Sinkronisasi multiplier & satuanTurunan secara cascading untuk satuan utama
    let prevMultiplier = 1
    let prevNama = form.satuan || 'pcs'
    const mainTiersMap = new Map<string, SatuanBertingkat>()

    for (let i = 0; i < list.length; i++) {
      const item = { ...list[i] }
      if (!item.isPecahan) {
        const oldMultiplier = item.multiplierToBase
        item.satuanTurunan = prevNama
        item.multiplierToBase = (item.isi || 1) * prevMultiplier
        if (field === 'isi' && i === index && item.hargaBeli === (form.hargaBeli || 0) * oldMultiplier) {
          item.hargaBeli = (form.hargaBeli || 0) * item.multiplierToBase
          item.hargaJual = Math.round(item.hargaBeli * (1 + (item.marginPersen || 0) / 100))
        }
        prevMultiplier = item.multiplierToBase
        prevNama = item.namaSatuan
        mainTiersMap.set(item.namaSatuan.toLowerCase(), item)
      }
      list[i] = item
    }

    // Sinkronisasi sub-satuan pecahan jika induknya diperbarui
    for (let i = 0; i < list.length; i++) {
      const item = { ...list[i] }
      if (item.isPecahan && item.indukSatuan) {
        const parent = mainTiersMap.get(item.indukSatuan.toLowerCase())
        if (parent) {
          const rasio = item.rasio || 0.5
          item.multiplierToBase = Math.max(0.1, Math.round(parent.multiplierToBase * rasio * 10) / 10)
          item.isi = item.multiplierToBase
          list[i] = item
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
          const mult = Math.max(0.1, Math.round(parent.multiplierToBase * rasio * 10) / 10)
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
    if (form.varian && form.varian.length > 0) {
      const invalid = form.varian.some((v) => !v.nama.trim() || v.bobot <= 0 || v.hargaJual <= 0)
      if (invalid) {
        push({
          tipe: 'error',
          judul: 'Data varian belum lengkap',
          pesan: 'Nama, bobot, dan harga jual setiap varian harus diisi dengan benar.',
        })
        return
      }
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
    simpanProduk(edit ? { ...form, id: edit.id } : form)
    push({
      tipe: 'sukses',
      judul: isDuplikat ? 'Produk berhasil diduplikat' : edit ? 'Produk diperbarui' : 'Produk ditambahkan',
      pesan: form.nama,
    })
    setModal(false)
  }

  const konfirmasiHapus = () => {
    if (!hapusTarget) return
    hapusProduk(hapusTarget.id)
    push({ tipe: 'sukses', judul: 'Produk dihapus', pesan: hapusTarget.nama })
    setHapusTarget(null)
  }

  const isOwner = currentUser?.role === 'owner'

  return (
    <>
      <PageHeader
        judul="Data Produk"
        deskripsi={isOwner ? "Pantauan stok dan harga produk toko (mode baca owner)." : "Kelola seluruh item barang toko beserta harga dan batas stok minimum."}
        aksi={
          <>
            <Button variant="secondary" onClick={() => setCari('')}>
              {rows.length} dari {produk.length} produk
            </Button>
            {!isOwner && <Button onClick={bukaTambah}>Tambah Produk</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Cari produk</Label>
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Nama, SKU, atau barcode..."
            />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status stok</Label>
            <Select value={filterStok} onChange={(e) => setFilterStok(e.target.value)}>
              <option value="">Semua</option>
              <option value="kritis">Di bawah minimum</option>
              <option value="habis">Stok habis</option>
              <option value="aman">Stok aman</option>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Nilai stok (harga beli) untuk hasil filter: <span className="font-semibold text-slate-700">{rupiah(totalNilai)}</span>
          <FR kode="FR-INV-01" />
          <FR kode="FR-INV-02" />
          <FR kode="FR-INV-06" />
        </p>
      </Card>

      <Card>
        <DataTable
          data={rows}
          kolom={[
            {
              key: 'sku', header: 'SKU / Barcode', render: (p) => (
                <div>
                  <p className="font-mono text-xs text-slate-600">{p.sku}</p>
                  <p className="font-mono text-[11px] text-slate-400">{p.barcode}</p>
                </div>
              )
            },
            {
              key: 'nama', header: 'Nama Produk', render: (p) => {
                const isCurah = resepKonversi.some((r) => r.produkCurahId === p.id)
                const isKemasan = resepKonversi.some((r) => r.items.some((it) => it.produkKemasanId === p.id))
                const supp = supplier.find((s) => s.id === p.supplierId)
                return (
                  <div>
                    <p className="font-medium text-slate-700">
                      {p.nama}
                      {isCurah && <Badge warna="blue" className="ml-1.5 text-[10px]">Curah</Badge>}
                      {isKemasan && <Badge warna="purple" className="ml-1.5 text-[10px]">Kemasan</Badge>}
                      {p.satuanBertingkat && p.satuanBertingkat.length > 0 && (
                        <Badge warna="green" className="ml-1.5 text-[10px]">
                          Multi-Satuan ({p.satuanBertingkat.map((s) => s.namaSatuan).join(' → ')})
                        </Badge>
                      )}
                      {p.varian && p.varian.length > 0 && (
                        <Badge warna="purple" className="ml-1.5 text-[10px]">
                          Varian Bobot ({p.varian.map((v) => v.nama).join(', ')})
                        </Badge>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                      <span>{katNama(p.kategoriId)} | Dasar: {p.satuan}</span>
                      {supp ? (
                        <span className="inline-flex items-center text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                          {supp.nama}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                          Supplier: -
                        </span>
                      )}
                    </div>
                  </div>
                )
              }
            },
            { key: 'hargaBeli', header: 'Harga Beli', align: 'right', render: (p) => rupiah(p.hargaBeli) },
            {
              key: 'hargaJual', header: 'Harga Jual', align: 'right', render: (p) => (
                <div>
                  <p className="font-medium">{rupiah(p.hargaJual)}</p>
                  <p className="text-[11px] text-emerald-600">
                    margin {p.hargaBeli ? Math.round(((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100) : 0}%
                  </p>
                </div>
              )
            },
            {
              key: 'stok', header: 'Stok', align: 'right', render: (p) => (
                <div>
                  <span className={`font-semibold ${p.stok === 0 ? 'text-rose-600' : p.stok <= p.stokMinimum ? 'text-amber-600' : 'text-slate-700'}`}>
                    {angka(p.stok)}
                  </span>
                  <p className="text-[11px] text-slate-400">min {p.stokMinimum}</p>
                </div>
              )
            },
            {
              key: 'status', header: 'Status & Expired', render: (p) => (
                <div className="space-y-1">
                  <div>
                    {p.stok === 0 ? <Badge warna="red">Habis</Badge>
                      : p.stok <= p.stokMinimum ? <Badge warna="amber">Stok kritis</Badge>
                        : <Badge warna="green">Aman</Badge>}
                  </div>
                  {p.tglExpired && (
                    <div className="text-[10px] px-1.5 py-0.5 font-medium">
                      Exp: {p.tglExpired}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'aksi', header: '', align: 'right', render: (p) => (
                <div className="flex justify-end gap-1">
                  {isOwner ? (
                    <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Lihat</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => bukaDuplikat(p)} title="Duplikat produk ini">Duplikat</Button>
                      <Button size="sm" variant="ghost" onClick={() => bukaEdit(p)}>Ubah</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setHapusTarget(p)}>Hapus</Button>
                    </>
                  )}
                </div>
              )
            },
          ]}
          kosong="Produk tidak ditemukan"
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={isOwner ? 'Detail Produk (Read-Only)' : isDuplikat ? 'Duplikat Produk' : edit ? 'Ubah Produk' : 'Tambah Produk'}
        lebar="max-w-5xl"
        footer={
          isOwner ? (
            <Button variant="secondary" onClick={() => setModal(false)}>Tutup</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
              <Button onClick={simpan}>Simpan</Button>
            </>
          )
        }
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-2">
            <Label>Nama produk <span className="text-rose-500">*</span></Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Kopi Kapal Api Special Mix" />
          </div>
          <div>
            <Label>SKU <span className="text-rose-500">*</span></Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU0001" />
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="899..." />
          </div>

          <div>
            <Label>Kategori</Label>
            <Select value={form.kategoriId} onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </Select>
          </div>
          <div>
            <Label>Satuan Terkecil (Base Unit) <span className="text-rose-500">*</span></Label>
            <SelectSatuanDinamis
              value={form.satuan}
              onChange={handleBaseSatuanChange}
              placeholder="Pilih/ketik satuan dasar..."
            />
          </div>
          <div>
            <Label>Stok Fisik</Label>
            <NumberInput
              value={form.stok}
              onChange={(val) => setForm({ ...form, stok: val })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Stok Minimum</Label>
            <NumberInput
              value={form.stokMinimum}
              onChange={(val) => setForm({ ...form, stokMinimum: val })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Tgl Kedaluwarsa (Expired)</Label>
            <Input
              type="date"
              value={form.tglExpired || ''}
              onChange={(e) => setForm({ ...form, tglExpired: e.target.value || undefined })}
              className="text-xs"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Label>Supplier Pemasok</Label>
            <Select
              value={form.supplierId || ''}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value || undefined })}
            >
              <option value="">-- Belum Ditentukan (Pilih Supplier) --</option>
              {supplier.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.kontak} - {s.telepon})
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-slate-400">
              Digunakan untuk pengelompokan pesanan restock (Purchase Order) otomatis saat stok menipis.
            </p>
          </div>
          <div className="flex items-center pt-2 md:pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Produk aktif dijual</span>
            </label>
          </div>

          {/* Penetapan Harga, Margin & Satuan Bertingkat (Terpadu) */}
          <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(form.satuanBertingkat && form.satuanBertingkat.length > 0)}
                    onChange={(e) => toggleSatuanBertingkat(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1.5">
                    <LayersIcon size={16} className="text-emerald-600" />
                    Penetapan Harga, Margin & Satuan Bertingkat (Grosir / Eceran)
                  </span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  {form.satuanBertingkat && form.satuanBertingkat.length > 0
                    ? `Satu SKU memiliki banyak level satuan hierarkis (misal: Karton → Pax → Renceng → ${form.satuan || 'pcs'}). Stok fisik tersentralisasi dalam satuan terkecil (${form.satuan || 'pcs'}).`
                    : `Atur harga beli (modal), margin, dan harga jual produk untuk satuan eceran dasar (${form.satuan || 'pcs'}). Centang opsi di atas untuk mengaktifkan satuan bertingkat (grosir).`}
                </p>
              </div>
              {form.satuanBertingkat && form.satuanBertingkat.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={bukaTambahPecahan}
                    className="text-sky-700 border-sky-300 hover:bg-sky-50"
                  >
                    <PlusIcon size={14} className="mr-1" /> Tambah Pecahan (1/2, dll)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={tambahTier}
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  >
                    <PlusIcon size={14} className="mr-1" /> Tambah Tingkatan Satuan
                  </Button>
                </div>
              )}
            </div>

            {form.satuanBertingkat && form.satuanBertingkat.length > 0 ? (
              /* Tabel Terpadu: Satuan Dasar + Seluruh Tingkat Satuan Bertingkat */
              <div className="space-y-3 pt-1 border-t border-emerald-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-emerald-200/80 text-[11px] font-semibold text-slate-600">
                        <th className="py-2 pr-2 w-36">Nama Satuan</th>
                        <th className="py-2 px-2 w-32">Isi / Konversi</th>
                        <th className="py-2 px-2 w-36">Modal (Rp)</th>
                        <th className="py-2 px-2 w-36">
                          <div className="flex items-center justify-between gap-1">
                            <span>Margin</span>
                            <div className="inline-flex rounded-md bg-slate-200/80 p-0.5 text-[9px] font-medium shrink-0">
                              <button
                                type="button"
                                onClick={() => handleGantiMarginType('persen')}
                                className={`rounded px-1.5 py-0.5 transition ${marginType === 'persen'
                                    ? 'bg-white font-bold text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                  }`}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGantiMarginType('nominal')}
                                className={`rounded px-1.5 py-0.5 transition ${marginType === 'nominal'
                                    ? 'bg-white font-bold text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                  }`}
                              >
                                Rp
                              </button>
                            </div>
                          </div>
                        </th>
                        <th className="py-2 px-2">Harga Jual & Estimasi Laba</th>
                        <th className="py-2 pl-2 text-center w-10">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {/* Baris 1: Satuan Terkecil / Eceran Dasar */}
                      <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-xs capitalize">
                              {form.satuan || 'pcs'}
                            </span>
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 border border-emerald-200">
                              Dasar
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="text-xs text-slate-600 font-medium">1 {form.satuan || 'pcs'}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">(Satuan Terkecil)</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <CurrencyInput
                            sizeVariant="sm"
                            value={form.hargaBeli}
                            onChange={handleHargaBeliChange}
                            placeholder="0"
                            className="text-xs font-mono font-semibold"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          {marginType === 'persen' ? (
                            <div className="relative flex items-center w-full">
                              <Input
                                type="number"
                                step="0.1"
                                value={marginInput}
                                onChange={(e) => handleMarginChange(e.target.value)}
                                placeholder="0"
                                className="w-full px-1.5 py-1 text-xs font-mono pr-5 text-emerald-600 font-semibold"
                              />
                              <span className="pointer-events-none absolute right-1.5 text-[10px] font-bold text-slate-400">%</span>
                            </div>
                          ) : (
                            <CurrencyInput
                              sizeVariant="sm"
                              value={parseFloat(marginInput) || 0}
                              onChange={handleMarginNominalChange}
                              placeholder="0"
                              className="w-full text-xs font-mono font-semibold text-emerald-600"
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <CurrencyInput
                            sizeVariant="sm"
                            value={form.hargaJual}
                            onChange={handleHargaJualChange}
                            placeholder="0"
                            className="text-xs font-mono font-bold text-slate-800"
                          />
                          <p className={`text-[11px] font-medium mt-1 ${form.hargaJual >= form.hargaBeli ? 'text-emerald-700' : 'text-rose-600'}`}>
                            Laba kotor: <strong className="font-semibold">{rupiah(form.hargaJual - form.hargaBeli)}</strong> / {form.satuan || 'pcs'}
                            <span className="ml-1 text-[10px] text-slate-400">
                              ({form.hargaBeli > 0 ? (((form.hargaJual - form.hargaBeli) / form.hargaBeli) * 100).toFixed(1) : '0'}%)
                            </span>
                          </p>
                        </td>
                        <td className="py-2.5 pl-2 text-center text-slate-300 text-xs">
                          —
                        </td>
                      </tr>

                      {/* Baris 2..N: Tiap Tingkatan Satuan Bertingkat & Pecahan */}
                      {form.satuanBertingkat.map((tier, idx) => {
                        const isModalOverridden = tier.hargaBeli !== (form.hargaBeli * tier.multiplierToBase)
                        const labaNominal = tier.hargaJual - tier.hargaBeli

                        return (
                          <tr key={tier.id || idx} className={`${tier.isPecahan ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'bg-white/80 hover:bg-white'} transition-colors`}>
                            <td className="py-2.5 pr-2">
                              {tier.isPecahan ? (
                                <div className="space-y-1">
                                  <Input
                                    value={tier.namaSatuan}
                                    onChange={(e) => ubahTier(idx, 'namaSatuan', e.target.value)}
                                    placeholder="Nama pecahan..."
                                    className="text-xs py-1"
                                  />
                                  <span className="inline-flex items-center gap-1 rounded bg-sky-100/80 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 border border-sky-200">
                                    Pecahan {tier.rasio === 0.5 ? '1/2' : tier.rasio === 0.25 ? '1/4' : `${Math.round((tier.rasio || 0) * 100)}%`} {tier.indukSatuan}
                                  </span>
                                </div>
                              ) : (
                                <SelectSatuanDinamis
                                  value={tier.namaSatuan}
                                  onChange={(val) => ubahTier(idx, 'namaSatuan', val)}
                                  placeholder="Satuan..."
                                  sizeVariant="sm"
                                />
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              {tier.isPecahan ? (
                                <div>
                                  <span className="text-xs font-semibold text-slate-700 font-mono">
                                    {tier.multiplierToBase} {form.satuan || 'pcs'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    ({tier.rasio === 0.5 ? '1/2' : `${Math.round((tier.rasio || 0) * 100)}%`} dari 1 {tier.indukSatuan})
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-500 whitespace-nowrap">1 =</span>
                                    <NumberInput
                                      min={1}
                                      value={tier.isi}
                                      onChange={(val) => ubahTier(idx, 'isi', val)}
                                      placeholder="1"
                                      className="w-12 px-1 py-1 text-xs font-mono text-center"
                                    />
                                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[65px]" title={tier.satuanTurunan}>
                                      {tier.satuanTurunan}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[10px] text-emerald-700 font-semibold font-mono">
                                    ({tier.multiplierToBase} {form.satuan || 'pcs'})
                                  </p>
                                </>
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="relative">
                                <CurrencyInput
                                  sizeVariant="sm"
                                  value={tier.hargaBeli}
                                  onChange={(val) => ubahTier(idx, 'hargaBeli', val)}
                                  placeholder="0"
                                  className={`text-xs font-mono ${isModalOverridden ? 'border-amber-400 bg-amber-50/30' : ''}`}
                                />
                                {isModalOverridden && (
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
                            <td className="py-2.5 px-2">
                              {marginType === 'persen' ? (
                                <div className="relative flex items-center w-full">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    value={tier.marginPersen ?? 0}
                                    onChange={(e) => ubahTier(idx, 'marginPersen', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full px-1.5 py-1 text-xs font-mono pr-5 text-emerald-600 font-semibold"
                                  />
                                  <span className="pointer-events-none absolute right-1.5 text-[10px] font-bold text-slate-400">%</span>
                                </div>
                              ) : (
                                <CurrencyInput
                                  sizeVariant="sm"
                                  value={Math.max(0, tier.hargaJual - tier.hargaBeli)}
                                  onChange={(val) => ubahTier(idx, 'marginNominal', val)}
                                  placeholder="0"
                                  className="w-full text-xs font-mono font-semibold text-emerald-600"
                                />
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              <CurrencyInput
                                sizeVariant="sm"
                                value={tier.hargaJual}
                                onChange={(val) => ubahTier(idx, 'hargaJual', val)}
                                placeholder="0"
                                className="text-xs font-mono font-bold text-slate-800"
                              />
                              <p className={`text-[11px] font-medium mt-1 ${labaNominal >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                Laba kotor: <strong className="font-semibold">{rupiah(labaNominal)}</strong> / {tier.namaSatuan || 'unit'}
                                <span className="ml-1 text-[10px] text-slate-400">
                                  ({tier.marginPersen ? `${tier.marginPersen}%` : '0%'})
                                </span>
                              </p>
                            </td>
                            <td className="py-2.5 pl-2 text-center">
                              <button
                                type="button"
                                onClick={() => hapusTier(idx)}
                                className="h-6 w-6 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center transition"
                                title="Hapus tingkatan satuan ini"
                              >
                                <TrashIcon size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg bg-emerald-100/60 p-2.5 text-[11px] text-emerald-900 flex items-start gap-2">
                  <span className="font-bold text-emerald-700 mt-0.5">💡 Contoh Rantai:</span>
                  <span>
                    Jika Satuan Dasar = <strong>{form.satuan || 'pcs'}</strong>, lalu Tingkat 1 = <strong>1 renceng (12 {form.satuan || 'pcs'})</strong>, Tingkat 2 = <strong>1 pax (6 renceng = 72 {form.satuan || 'pcs'})</strong>, dan Tingkat 3 = <strong>1 karton (8 pax = 576 {form.satuan || 'pcs'})</strong>. Kasir dapat memilih satuan saat transaksi, dan stok akan terpotong secara otomatis & akurat.
                  </span>
                </div>
              </div>
            ) : (
              /* Tampilan Tunggal Saat Satuan Bertingkat Tidak Aktif */
              <div className="space-y-2 pt-1 border-t border-emerald-200">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Harga Beli (Modal)</Label>
                    <CurrencyInput
                      value={form.hargaBeli}
                      onChange={handleHargaBeliChange}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="mb-0">Margin {marginType === 'persen' ? '(%)' : '(Rp)'}</Label>
                      <div className="inline-flex rounded-md bg-slate-200/80 p-0.5 text-[10px] font-medium">
                        <button
                          type="button"
                          onClick={() => handleGantiMarginType('persen')}
                          className={`rounded px-1.5 py-0.5 transition ${marginType === 'persen'
                              ? 'bg-white font-semibold text-emerald-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGantiMarginType('nominal')}
                          className={`rounded px-1.5 py-0.5 transition ${marginType === 'nominal'
                              ? 'bg-white font-semibold text-emerald-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          Rp
                        </button>
                      </div>
                    </div>
                    {marginType === 'persen' ? (
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          step="0.1"
                          value={marginInput}
                          onChange={(e) => handleMarginChange(e.target.value)}
                          placeholder="0"
                          className="pr-7 font-semibold text-emerald-600"
                        />
                        <span className="pointer-events-none absolute right-2.5 text-xs font-bold text-slate-400">%</span>
                      </div>
                    ) : (
                      <CurrencyInput
                        value={parseFloat(marginInput) || 0}
                        onChange={handleMarginNominalChange}
                        placeholder="0"
                        className="font-semibold text-emerald-600"
                      />
                    )}
                  </div>
                  <div>
                    <Label>Harga Jual</Label>
                    <CurrencyInput
                      value={form.hargaJual}
                      onChange={handleHargaJualChange}
                      placeholder="0"
                      className="font-semibold text-slate-800"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500 pt-1.5 border-t border-emerald-200/60">
                  <span className={`${form.hargaJual >= form.hargaBeli ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Laba kotor per unit: <strong className="font-semibold">{rupiah(form.hargaJual - form.hargaBeli)}</strong> / {form.satuan || 'pcs'}
                    <span className="ml-1 text-[11px] text-slate-400">
                      ({form.hargaBeli > 0 ? (((form.hargaJual - form.hargaBeli) / form.hargaBeli) * 100).toFixed(1) : '0'}%)
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {marginType === 'persen' ? 'Harga jual dihitung otomatis dari harga beli + margin %.' : 'Harga jual dihitung otomatis dari harga beli + margin nominal (Rp).'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pengaturan Varian Bobot (Shared Pool) */}
          <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(form.varian && form.varian.length > 0)}
                    onChange={(e) => toggleVarian(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Produk Memiliki Varian Ukuran / Bobot (Dynamic Shared Pool)</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Cocok untuk barang curah/karungan seperti Beras, Gula, atau Minyak yang dijual dalam kemasan 5kg, 2kg, 1kg tanpa memecah SKU.
                </p>
              </div>
              {form.varian && form.varian.length > 0 && (
                <Button size="sm" variant="secondary" onClick={tambahVarian}>
                  + Tambah Varian
                </Button>
              )}
            </div>

            {form.varian && form.varian.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-blue-100">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-600 px-1">
                  <span className="col-span-4">Nama Varian (Label)</span>
                  <span className="col-span-3">Bobot ({form.satuan || 'kg'})</span>
                  <span className="col-span-4">Harga Jual (Rp)</span>
                  <span className="col-span-1 text-center">Hapus</span>
                </div>

                {form.varian.map((v, idx) => (
                  <div key={v.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="col-span-4">
                      <Input
                        value={v.nama}
                        onChange={(e) => ubahVarian(idx, 'nama', e.target.value)}
                        placeholder="contoh: 5 kg"
                        className="text-xs py-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <NumberInput
                        min={0.1}
                        step="0.1"
                        value={v.bobot}
                        onChange={(val) => ubahVarian(idx, 'bobot', val)}
                        placeholder="0"
                        className="text-xs py-1 font-mono"
                      />
                    </div>
                    <div className="col-span-4">
                      <CurrencyInput
                        sizeVariant="sm"
                        value={v.hargaJual}
                        onChange={(val) => ubahVarian(idx, 'hargaJual', val)}
                        placeholder="0"
                        className="font-mono font-semibold text-emerald-600"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => hapusVarian(idx)}
                        className="h-6 w-6 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center font-bold text-sm"
                        title="Hapus varian"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-[11px] text-slate-500 italic mt-1">
                  * Stok induk di atas ({form.stok} {form.satuan}) akan menjadi kuota bersama. Saat varian 5 kg terjual 1 unit, stok induk otomatis berkurang 5 {form.satuan}.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

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
              }}
            >
              {form.satuanBertingkat
                ?.filter((t) => !t.isPecahan)
                .map((t) => (
                  <option key={t.id} value={t.namaSatuan}>
                    {t.namaSatuan} (isi {t.multiplierToBase} {form.satuan || 'pcs'} — {rupiah(t.hargaJual)})
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <Label>Pilih Rasio Pecahan</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '1/2 (Setengah)', val: 0.5, name: '1/2' },
                { label: '1/4 (Seperempat)', val: 0.25, name: '1/4' },
                { label: '1/3 (Sepertiga)', val: 0.333, name: '1/3' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setPecahanRasio(p.val)
                    setPecahanNama(`${p.name} ${pecahanInduk}`)
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${pecahanRasio === p.val
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Nama Label Kemasan</Label>
            <Input
              value={pecahanNama}
              onChange={(e) => setPecahanNama(e.target.value)}
              placeholder="contoh: 1/2 renceng atau Setengah Renceng"
            />
          </div>

          {(() => {
            const parent = form.satuanBertingkat?.find(
              (t) => !t.isPecahan && t.namaSatuan.toLowerCase() === pecahanInduk.toLowerCase(),
            )
            if (!parent) return null
            const mult = Math.max(0.1, Math.round(parent.multiplierToBase * pecahanRasio * 10) / 10)
            const estModal = Math.round(parent.hargaBeli * pecahanRasio)
            const estJual = Math.round(parent.hargaJual * pecahanRasio)

            return (
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-2 text-xs">
                <p className="font-bold text-sky-900">Kalkulasi Otomatis (Proporsional):</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white p-2 border border-sky-100">
                    <span className="text-[10px] text-slate-400 block">Kapasitas Isi</span>
                    <span className="font-bold text-slate-800 font-mono">{mult} {form.satuan || 'pcs'}</span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-sky-100">
                    <span className="text-[10px] text-slate-400 block">Estimasi Modal</span>
                    <span className="font-bold text-slate-800 font-mono">{rupiah(estModal)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-sky-100">
                    <span className="text-[10px] text-slate-400 block">Estimasi Jual</span>
                    <span className="font-bold text-emerald-600 font-mono">{rupiah(estJual)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-sky-800 italic">
                  * Setelah ditambahkan ke tabel, Anda dapat mengubah kembali harga beli, margin, maupun harga jual secara manual (override).
                </p>
              </div>
            )
          })()}
        </div>
      </Modal>

      <Modal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        title="Hapus Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHapusTarget(null)}>Batal</Button>
            <Button variant="danger" onClick={konfirmasiHapus}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Hapus <span className="font-semibold">{hapusTarget?.nama}</span>? Tindakan ini tidak dapat dibatalkan
          dan akan dicatat sebagai perubahan data produk.
        </p>
        <p className="mt-2 text-xs text-slate-400">Operator: {currentUser?.nama}</p>
      </Modal>
    </>
  )
}
