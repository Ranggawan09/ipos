import { useState } from 'react'
import type { Role, User } from '@/types'
import { useDataStore } from '@/store/useDataStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useToast } from '@/store/useToast'
import { Badge, Button, Card, DataTable, Input, Label, Modal, PageHeader, Select } from '@/components/ui'

const kosong: Omit<User, 'id'> = { nama: '', username: '', pin: '', role: 'kasir', aktif: true }

export function Pengguna() {
  const { users, shifts, transaksi } = useDataStore()
  const setCurrentUser = useSessionStore((s) => s.setCurrentUser)
  const currentUser = useSessionStore((s) => s.currentUser)
  const push = useToast((s) => s.push)

  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<User | null>(null)
  const [form, setForm] = useState(kosong)

  const data = users

  const jumlahTrx = (id: string) => transaksi.filter((t) => t.kasirId === id).length
  const shiftAktif = (id: string) => shifts.some((s) => s.kasirId === id && s.status === 'buka')

  // Perubahan pengguna disimpan langsung melalui store data
  const simpanKeStore = (list: User[]) => useDataStore.setState({ users: list })
  const simpan = () => {
    if (!form.nama.trim() || !form.username.trim() || !form.pin.trim()) {
      push({ tipe: 'error', judul: 'Lengkapi nama, username, dan PIN' })
      return
    }
    if (edit) {
      simpanKeStore(data.map((u) => (u.id === edit.id ? { ...form, id: edit.id } : u)))
      if (currentUser?.id === edit.id) setCurrentUser({ ...form, id: edit.id })
      push({ tipe: 'sukses', judul: 'Pengguna diperbarui', pesan: form.nama })
    } else {
      if (data.some((u) => u.username === form.username)) {
        push({ tipe: 'error', judul: 'Username sudah digunakan' })
        return
      }
      const created: User = { ...form, id: `USR-${Date.now()}` }
      simpanKeStore([...data, created])
      push({ tipe: 'sukses', judul: 'Pengguna ditambahkan', pesan: created.nama })
    }
    setModal(false)
  }

  const toggleAktif = (u: User) => {
    if (shiftAktif(u.id)) {
      push({ tipe: 'error', judul: 'Tidak dapat menonaktifkan', pesan: 'Kasir masih memiliki shift berjalan.' })
      return
    }
    simpanKeStore(data.map((x) => (x.id === u.id ? { ...x, aktif: !x.aktif } : x)))
  }

  return (
    <>
      <PageHeader
        judul="Manajemen Pengguna"
        deskripsi="Kelola akun admin, kasir, dan owner beserta pembatasan akses berbasis peran."
        aksi={<Button onClick={() => { setEdit(null); setForm(kosong); setModal(true) }}>Tambah Pengguna</Button>}
      />

      <Card title="Daftar Pengguna" subtitle="Sistem menerapkan kontrol akses berbasis peran (RBAC).">
        <DataTable
          data={data}
          kolom={[
            { key: 'nama', header: 'Nama', render: (u) => (
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {u.nama.charAt(0)}
                </span>
                <div>
                  <p className="font-medium text-slate-700">{u.nama}</p>
                  <p className="text-[11px] text-slate-400">@{u.username}</p>
                </div>
              </div>
            ) },
            { key: 'role', header: 'Peran', render: (u) => (
              <Badge warna={u.role === 'admin' ? 'blue' : u.role === 'owner' ? 'violet' : 'green'}>
                {u.role === 'admin' ? 'Admin' : u.role === 'owner' ? 'Owner' : 'Kasir'}
              </Badge>
            ) },
            { key: 'trx', header: 'Transaksi', align: 'right', render: (u) => jumlahTrx(u.id) },
            { key: 'shift', header: 'Shift Aktif', align: 'center', render: (u) => shiftAktif(u.id) ? <Badge warna="amber">Buka</Badge> : <span className="text-slate-300">-</span> },
            { key: 'status', header: 'Status', render: (u) => u.aktif ? <Badge warna="green">Aktif</Badge> : <Badge warna="slate">Nonaktif</Badge> },
            { key: 'aksi', header: '', align: 'right', render: (u) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEdit(u); setForm({ nama: u.nama, username: u.username, pin: u.pin, role: u.role, aktif: u.aktif }); setModal(true) }}>Ubah</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleAktif(u)}>{u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Button>
              </div>
            ) },
          ]}
        />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? 'Ubah Pengguna' : 'Tambah Pengguna'}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Batal</Button><Button onClick={simpan}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Nama lengkap</Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>PIN (4 digit)</Label>
              <Input maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Peran</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="kasir">Kasir (akses modul POS)</option>
              <option value="admin">Admin (akses penuh)</option>
              <option value="owner">Owner (dashboard read-only)</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
            Akun aktif
          </label>
        </div>
      </Modal>
    </>
  )
}
