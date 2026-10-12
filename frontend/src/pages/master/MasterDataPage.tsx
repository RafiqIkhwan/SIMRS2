import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus, Stethoscope } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import type { ApiResponse, Department, Clinic, Doctor } from '../../types';

const departmentSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
});

const clinicSchema = z.object({
  departmentId: z.string().min(1, 'Departemen wajib dipilih'),
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
});

type DepartmentForm = z.infer<typeof departmentSchema>;
type ClinicForm = z.infer<typeof clinicSchema>;

export function MasterDataPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deptModal, setDeptModal] = useState(false);
  const [clinicModal, setClinicModal] = useState(false);

  const isAdmin = hasRole('SUPER_ADMIN', 'HOSPITAL_ADMIN');

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Master Data', active: true },
  ];

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Department[]>>('/master/departments');
      return res.data?.data ?? [];
    },
  });

  const { data: clinics, isLoading: loadingClinics } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Clinic[]>>('/master/clinics');
      return res.data?.data ?? [];
    },
  });

  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Doctor[]>>('/master/doctors');
      return res.data?.data ?? [];
    },
  });

  const {
    register: rDept,
    handleSubmit: hDept,
    reset: resetDept,
    formState: { errors: eDept },
  } = useForm<DepartmentForm>({ resolver: zodResolver(departmentSchema) });

  const {
    register: rClinic,
    handleSubmit: hClinic,
    reset: resetClinic,
    formState: { errors: eClinic },
  } = useForm<ClinicForm>({ resolver: zodResolver(clinicSchema) });

  const onCreateDept = async (data: DepartmentForm) => {
    try {
      await api.post('/master/departments', data);
      toast('success', 'Departemen berhasil ditambahkan');
      setDeptModal(false);
      resetDept();
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menambah departemen');
    }
  };

  const onCreateClinic = async (data: ClinicForm) => {
    try {
      await api.post('/master/clinics', data);
      toast('success', 'Poliklinik berhasil ditambahkan');
      setClinicModal(false);
      resetClinic();
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menambah poliklinik');
    }
  };

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
          <p className="text-sm text-gray-500">Departemen, poliklinik, dan data dokter.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Departments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Departemen</h2>
            {isAdmin && (
              <button onClick={() => setDeptModal(true)} className="btn-primary !py-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            )}
          </div>
          {loadingDepts ? (
            <LoadingSpinner />
          ) : (departments ?? []).length === 0 ? (
            <EmptyState title="Belum ada departemen" />
          ) : (
            <div className="space-y-2">
              {(departments ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{d.code}</p>
                  </div>
                  <span className="badge badge-gray">{d.clinics?.length ?? 0} poli</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinics */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Poliklinik</h2>
            {isAdmin && (
              <button onClick={() => setClinicModal(true)} className="btn-primary !py-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            )}
          </div>
          {loadingClinics ? (
            <LoadingSpinner />
          ) : (clinics ?? []).length === 0 ? (
            <EmptyState title="Belum ada poliklinik" />
          ) : (
            <div className="space-y-2">
              {(clinics ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.department?.name} • <span className="font-mono">{c.code}</span>
                    </p>
                  </div>
                  <span className="badge badge-info">{c.doctors?.length ?? 0} dokter</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Doctors summary */}
      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Dokter Terdaftar</h2>
        </div>
        {loadingDoctors ? (
          <LoadingSpinner />
        ) : (doctors ?? []).length === 0 ? (
          <EmptyState title="Belum ada dokter" message="Kelola profil dokter melalui menu Dokter." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(doctors ?? []).map((d) => (
              <div key={d.id} className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-900">{d.user.fullName}</p>
                <p className="text-xs text-primary-600">{d.specialization}</p>
                <p className="text-xs text-gray-500 mt-1">{d.clinic?.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Department Modal */}
      <Modal open={deptModal} onClose={() => setDeptModal(false)} title="Tambah Departemen">
        <form onSubmit={hDept(onCreateDept)} className="space-y-4">
          <div>
            <label className="label">Kode Departemen</label>
            <input {...rDept('code')} className="input" placeholder="DEPT-MEDIS" />
            {eDept.code && <p className="mt-1 text-sm text-red-600">{eDept.code.message}</p>}
          </div>
          <div>
            <label className="label">Nama Departemen</label>
            <input {...rDept('name')} className="input" placeholder="Pelayanan Medis Rawat Jalan" />
            {eDept.name && <p className="mt-1 text-sm text-red-600">{eDept.name.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setDeptModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>

      {/* Clinic Modal */}
      <Modal open={clinicModal} onClose={() => setClinicModal(false)} title="Tambah Poliklinik">
        <form onSubmit={hClinic(onCreateClinic)} className="space-y-4">
          <div>
            <label className="label">Departemen</label>
            <select {...rClinic('departmentId')} className="input">
              <option value="">— Pilih departemen —</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {eClinic.departmentId && <p className="mt-1 text-sm text-red-600">{eClinic.departmentId.message}</p>}
          </div>
          <div>
            <label className="label">Kode Poli</label>
            <input {...rClinic('code')} className="input" placeholder="POLI-UMUM" />
            {eClinic.code && <p className="mt-1 text-sm text-red-600">{eClinic.code.message}</p>}
          </div>
          <div>
            <label className="label">Nama Poliklinik</label>
            <input {...rClinic('name')} className="input" placeholder="Poliklinik Umum" />
            {eClinic.name && <p className="mt-1 text-sm text-red-600">{eClinic.name.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setClinicModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
