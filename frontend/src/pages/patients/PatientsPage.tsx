import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, Edit, Trash2, User, Phone, MapPin, Calendar, Eye } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import type { ApiResponse, Patient, PaginationMeta } from '../../types';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal, ConfirmModal } from '../../components/ui/Modal';

const patientSchema = z.object({
  nationalIdNumber: z.string().length(16, 'NIK harus 16 digit'),
  fullName: z.string().min(3, 'Nama minimal 3 karakter'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().min(1, 'Tanggal lahir wajib'),
  address: z.string().min(5),
  city: z.string().min(2),
  phone: z.string().min(8),
  bloodType: z.string().optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
  allergies: z.string().optional(),
});

type PatientForm = z.infer<typeof patientSchema>;

export function PatientsPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
  });

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Pasien', active: true },
  ];

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Patient[]>>('/patients', {
        params: { page, limit, search },
      });
      if (res.data?.success && res.data.data) {
        setPatients(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      }
    } catch (err) {
      toast('error', 'Gagal memuat data pasien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, search]);

  const canCreate = hasRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF');
  const canUpdate = hasRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF');

  const onSubmit = async (data: PatientForm) => {
    try {
      if (selectedPatient) {
        await api.patch(`/patients/${selectedPatient.id}`, data);
        toast('success', 'Data pasien berhasil diperbarui');
      } else {
        await api.post('/patients', data);
        toast('success', 'Pasien baru berhasil didaftarkan');
      }
      setModalOpen(false);
      reset();
      setSelectedPatient(null);
      fetchPatients();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operasi gagal';
      toast('error', msg);
    }
  };

  const openEditModal = (patient: Patient) => {
    setSelectedPatient(patient);
    reset({
      nationalIdNumber: patient.nationalIdNumber,
      fullName: patient.fullName,
      gender: patient.gender,
      birthDate: patient.birthDate?.split('T')[0] || '',
      address: patient.address,
      city: patient.city,
      phone: patient.phone,
      bloodType: patient.bloodType || '',
      maritalStatus: (patient.maritalStatus as any) || 'SINGLE',
      allergies: patient.allergies || '',
    });
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedPatient(null);
    reset({
      nationalIdNumber: '',
      fullName: '',
      gender: 'MALE',
      birthDate: '',
      address: '',
      city: '',
      phone: '',
      bloodType: '',
      maritalStatus: 'SINGLE',
      allergies: '',
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await api.delete(`/patients/${deleteModal.id}`);
      toast('success', 'Data pasien berhasil dihapus');
      setDeleteModal({ open: false });
      fetchPatients();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menghapus data');
    }
  };

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pasien</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data pasien, nomor rekam medis, dan riwayat kunjungan.</p>
        </div>
        {canCreate && (
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Pasien Baru
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan Nomor RM, NIK, nama, atau telepon..."
            className="input pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <LoadingSpinner />
        ) : patients.length === 0 ? (
          <EmptyState
            title="Belum ada pasien"
            message="Data pasien akan muncul setelah pendaftaran."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No. RM</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Pasien</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NIK</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Telepon</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kota</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-primary-600 font-medium">{p.medicalRecordNumber}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.fullName}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{p.nationalIdNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{p.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{p.city}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/patients/${p.id}`)}
                          className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Ubah"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModal({ open: true, id: p.id })}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedPatient ? 'Ubah Data Pasien' : 'Registrasi Pasien Baru'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">NIK (16 digit)</label>
              <input {...register('nationalIdNumber')} className="input" placeholder="3201010101900001" />
              {errors.nationalIdNumber && <p className="mt-1 text-sm text-red-600">{errors.nationalIdNumber.message}</p>}
            </div>
            <div>
              <label className="label">Nama Lengkap</label>
              <input {...register('fullName')} className="input" placeholder="Nama pasien" />
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="label">Jenis Kelamin</label>
              <select {...register('gender')} className="input">
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="label">Tanggal Lahir</label>
              <input type="date" {...register('birthDate')} className="input" />
              {errors.birthDate && <p className="mt-1 text-sm text-red-600">{errors.birthDate.message}</p>}
            </div>
            <div>
              <label className="label">Golongan Darah</label>
              <select {...register('bloodType')} className="input">
                <option value="">- Pilih -</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label className="label">Status Pernikahan</label>
              <select {...register('maritalStatus')} className="input">
                <option value="SINGLE">Belum Menikah</option>
                <option value="MARRIED">Menikah</option>
                <option value="DIVORCED">Cerai</option>
                <option value="WIDOWED">Duda/Janda</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Alamat</label>
              <textarea {...register('address')} rows={2} className="input" placeholder="Alamat lengkap" />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>}
            </div>
            <div>
              <label className="label">Kota</label>
              <input {...register('city')} className="input" placeholder="Kota" />
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">Telepon</label>
              <input {...register('phone')} className="input" placeholder="08xxxxxxxxxx" />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Riwayat Alergi</label>
              <textarea {...register('allergies')} rows={2} className="input" placeholder="Contoh: Penisilin, Seafood" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">
              {selectedPatient ? 'Simpan Perubahan' : 'Daftarkan Pasien'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        onConfirm={handleDelete}
        title="Hapus Data Pasien"
        message="Apakah Anda yakin ingin menghapus data pasien ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="danger"
      />
    </div>
  );
}