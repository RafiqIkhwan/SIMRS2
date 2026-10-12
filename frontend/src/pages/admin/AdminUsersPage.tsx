import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash, UserPlus, KeyRound, Pencil } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ConfirmModal, Modal } from '../../components/ui/Modal';
import type { ApiResponse, User } from '../../types';

const roleOptions = [
  'SUPER_ADMIN',
  'HOSPITAL_ADMIN',
  'REGISTRATION_STAFF',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_STAFF',
  'CASHIER',
  'MEDICAL_RECORD_STAFF',
  'MANAGEMENT',
] as const;

type RoleName = (typeof roleOptions)[number];

interface UserForm {
  username: string;
  email: string;
  fullName: string;
  phone: string;
  password: string;
  roles: RoleName[];
  isActive: boolean;
}

const emptyForm: UserForm = {
  username: '',
  email: '',
  fullName: '',
  phone: '',
  password: '',
  roles: [],
  isActive: true,
};

export function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: '',
    role: undefined as RoleName | undefined,
    isActive: undefined as boolean | undefined,
  });

  const [form, setForm] = useState<UserForm>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users', query],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: query.page, limit: query.limit };
      if (query.search) params.search = query.search;
      if (query.role) params.role = query.role;
      if (query.isActive !== undefined) params.isActive = query.isActive;
      const res = await api.get<ApiResponse<User[]>>('/users', { params });
      return res.data;
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setCreateOpen(true);
  };

  const openEdit = (user: User) => {
    setForm({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? '',
      password: '',
      roles: user.roles.map((r) => r.name as RoleName),
      isActive: user.isActive,
    });
    setEditId(user.id);
    setEditOpen(true);
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      await api.post('/users', {
        username: form.username,
        email: form.email,
        fullName: form.fullName,
        phone: form.phone || undefined,
        password: form.password,
        roles: form.roles,
      });
      toast('success', 'Pengguna berhasil dibuat');
      setCreateOpen(false);
      await invalidate();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message ?? 'Gagal membuat pengguna');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName,
        phone: form.phone || undefined,
        isActive: form.isActive,
        roles: form.roles,
      };
      if (form.password) body.password = form.password;
      await api.patch(`/users/${editId}`, body);
      toast('success', 'Pengguna berhasil diperbarui');
      setEditOpen(false);
      await invalidate();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message ?? 'Gagal memperbarui pengguna');
    } finally {
      setSaving(false);
    }
  };

  const submitReset = async () => {
    if (!resetId) return;
    setSaving(true);
    try {
      await api.post(`/users/${resetId}/reset-password`, { newPassword });
      toast('success', 'Kata sandi berhasil direset');
      setResetOpen(false);
      setNewPassword('');
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message ?? 'Gagal mereset kata sandi');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.delete(`/users/${deleteId}`);
      toast('success', 'Pengguna berhasil dihapus');
      setDeleteOpen(false);
      await invalidate();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message ?? 'Gagal menghapus pengguna');
    } finally {
      setSaving(false);
    }
  };

  const roleBadgeClass = (name: string) =>
    name === 'SUPER_ADMIN'
      ? 'bg-red-100 text-red-800'
      : name === 'HOSPITAL_ADMIN'
        ? 'bg-orange-100 text-orange-800'
        : 'bg-gray-100 text-gray-800';

  const formFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          className="input w-full"
          value={form.username}
          disabled={!!editId}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          className="input w-full"
          value={form.email}
          disabled={!!editId}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
        <input
          className="input w-full"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
        <input
          className="input w-full"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      {editId ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kata Sandi Baru <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>
          </label>
          <input
            type="password"
            className="input w-full"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi</label>
          <input
            type="password"
            className="input w-full"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-3">
          {roleOptions.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.roles.includes(role)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    roles: e.target.checked
                      ? [...form.roles, role]
                      : form.roles.filter((r) => r !== role),
                  })
                }
              />
              {role.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      {editId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="input w-full"
            value={form.isActive ? 'active' : 'inactive'}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => (editId ? setEditOpen(false) : setCreateOpen(false))}
        >
          Batal
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={saving || form.roles.length === 0}
          onClick={editId ? submitEdit : submitCreate}
        >
          {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Buat Pengguna'}
        </button>
      </div>
    </>
  );

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Beranda', to: '/' },
          { label: 'Pengguna', to: '/admin/users' },
          { label: 'Manajemen Pengguna' },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500">Kelola akun staf, role, dan kredensial.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <UserPlus className="h-4 w-4" />
          Tambah Pengguna
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="text"
            placeholder="Cari nama, username, atau email..."
            className="input sm:w-64"
            value={query.search}
            onChange={(e) => setQuery((p) => ({ ...p, search: e.target.value, page: 1 }))}
          />
          <select
            className="input sm:w-48"
            value={query.role ?? ''}
            onChange={(e) =>
              setQuery((p) => ({
                ...p,
                role: e.target.value ? (e.target.value as RoleName) : undefined,
                page: 1,
              }))
            }
          >
            <option value="">Semua Role</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className="input sm:w-40"
            value={query.isActive === undefined ? '' : String(query.isActive)}
            onChange={(e) =>
              setQuery((p) => ({
                ...p,
                isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1,
              }))
            }
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm text-red-600">Gagal memuat data pengguna.</p>
            <button onClick={() => refetch()} className="btn-outline mt-3">
              Coba Lagi
            </button>
          </div>
        ) : !data?.data?.length ? (
          <EmptyState
            title="Tidak ada pengguna yang sesuai"
            message="Gunakan filter untuk mencari pengguna."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama Lengkap</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Terakhir Login</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium text-primary-600">{user.username}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{user.fullName}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        {user.roles.length ? (
                          user.roles.map((role) => (
                            <span
                              key={role.id}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-1 ${roleBadgeClass(role.name)}`}
                            >
                              {role.name.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Belum pernah login'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                            title="Edit"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Reset Kata Sandi"
                            onClick={() => {
                              setResetId(user.id);
                              setNewPassword('');
                              setResetOpen(true);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {user.username !== 'superadmin' && (
                            <button
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              title="Hapus"
                              onClick={() => {
                                setDeleteId(user.id);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={data.meta ?? { page: query.page, limit: query.limit, total: 0, totalPages: 1 }}
              onPageChange={(nextPage) => setQuery((p) => ({ ...p, page: nextPage }))}
            />
          </>
        )}
      </div>

      <Modal open={createOpen || editOpen} onClose={() => (editId ? setEditOpen(false) : setCreateOpen(false))} title={editId ? 'Edit Pengguna' : 'Tambah Pengguna'}>
        <div className="space-y-4">{formFields}</div>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Kata Sandi" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
            <input
              type="password"
              className="input w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setResetOpen(false)} disabled={saving}>
              Batal
            </button>
            <button className="btn-primary" onClick={submitReset} disabled={saving || newPassword.length < 8}>
              {saving ? 'Memproses...' : 'Reset Kata Sandi'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={submitDelete}
        title="Hapus Pengguna"
        message="Pengguna akan dihapus permanen. Akses loginnya akan dicabut. Lanjutkan?"
        confirmText="Hapus"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}