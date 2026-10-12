import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BedDouble, Plus, LogOut, BedSingle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import type { ApiResponse } from '../../types';

const admissionSchema = z.object({
  patientId: z.string().uuid('ID pasien tidak valid'),
  bedId: z.string().uuid('Tempat tidur wajib dipilih'),
  admitDiagnosis: z.string().min(3, 'Diagnosis masuk wajib diisi'),
});

type AdmissionForm = z.infer<typeof admissionSchema>;

interface AdmissionItem {
  id: string;
  admissionNumber: string;
  admittedAt: string;
  status: string;
  admitDiagnosis: string;
  patient: any;
  bed: any;
}

interface BedItem {
  id: string;
  bedNumber: string;
  status: string;
  dailyRate: string;
  room?: any;
}

const statusMap: Record<string, string> = {
  AVAILABLE: 'Tersedia',
  OCCUPIED: 'Terisi',
  CLEANING: 'Dibersihkan',
  MAINTENANCE: 'Perbaikan',
  OUT_OF_SERVICE: 'Tidak Aktif',
};

const badgeMap: Record<string, string> = {
  AVAILABLE: 'badge-success',
  OCCUPIED: 'badge-danger',
  CLEANING: 'badge-warning',
  MAINTENANCE: 'badge-warning',
  OUT_OF_SERVICE: 'badge-gray',
};

export function InpatientPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Rawat Inap', active: true },
  ];

  const { data: admissions, isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdmissionItem[]>>('/inpatient/admissions');
      return res.data?.data ?? [];
    },
  });

  const { data: beds } = useQuery({
    queryKey: ['beds'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BedItem[]>>('/inpatient/beds');
      return res.data?.data ?? [];
    },
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-admission'],
    queryFn: async () => {
      const res = await api.get<any>('/patients', { params: { limit: 100 } });
      return res.data?.data ?? [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdmissionForm>({
    resolver: zodResolver(admissionSchema),
  });

  const availableBeds = (beds ?? []).filter((b) => b.status === 'AVAILABLE');

  const onAdmit = async (data: AdmissionForm) => {
    try {
      await api.post('/inpatient/admissions', data);
      toast('success', 'Pasien berhasil diterima rawat inap');
      setModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['admissions', 'beds'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menerima pasien');
    }
  };

  const onDischarge = async (id: string) => {
    try {
      await api.post(`/inpatient/admissions/${id}/discharge`, { dischargeReason: 'Pemulangan sesuai rencana' });
      toast('success', 'Pasien telah dipulangkan');
      queryClient.invalidateQueries({ queryKey: ['admissions', 'beds'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal memproses pemulangan');
    }
  };

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BedDouble className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rawat Inap</h1>
            <p className="text-sm text-gray-500">Kelola kamar, tempat tidur, dan pasien yang dirawat.</p>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Terima Pasien
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard title="Total Tempat Tidur" value={beds?.length ?? 0} icon={BedDouble} color="blue" />
        <StatCard title="Tempat Tidur Tersedia" value={availableBeds.length} icon={BedSingle} color="green" />
        <StatCard title="Pasien Dirawat" value={(admissions ?? []).length} icon={BedDouble} color="teal" />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Pasien Selama Dirawat</h2>
      <div className="card overflow-hidden p-0 mb-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : (admissions ?? []).length === 0 ? (
          <EmptyState title="Tidak ada pasien rawat inap" message="Pasien yang diterima akan tampil di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Admisi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasien</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kamar</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tgl Masuk</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Diagnosis</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(admissions ?? []).map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-primary-700">{a.admissionNumber}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{a.patient?.fullName}</td>
                    <td className="px-6 py-4 text-gray-600">{a.bed?.room?.roomNumber} / {a.bed?.bedNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{a.admittedAt?.split('T')[0]}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">{a.admitDiagnosis}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onDischarge(a.id)} className="btn-outline !px-3 !py-1 text-xs">
                        <LogOut className="h-3.5 w-3.5" /> Pulangkan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Status Tempat Tidur</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {(beds ?? []).map((b) => (
          <div key={b.id} className="card !p-4">
            <p className="text-sm font-medium text-gray-900">
              {b.room?.roomNumber ?? '-'} / {b.bedNumber}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Rp {Number(b.dailyRate).toLocaleString('id-ID')}/hari
            </p>
            <span className={`badge ${badgeMap[b.status] || 'badge-gray'} mt-2`}>
              {statusMap[b.status] || b.status}
            </span>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Terima Pasien Rawat Inap">
        <form onSubmit={handleSubmit(onAdmit)} className="space-y-4">
          <div>
            <label className="label">Pasien</label>
            <select {...register('patientId')} className="input">
              <option value="">— Pilih pasien —</option>
              {patients?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.medicalRecordNumber} — {p.fullName}</option>
              ))}
            </select>
            {errors.patientId && <p className="mt-1 text-sm text-red-600">{errors.patientId.message}</p>}
          </div>
          <div>
            <label className="label">Tempat Tidur Tersedia</label>
            <select {...register('bedId')} className="input">
              <option value="">— Pilih tempat tidur —</option>
              {availableBeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.room?.roomNumber ?? '-'} / {b.bedNumber} — Rp {Number(b.dailyRate).toLocaleString('id-ID')}/hari
                </option>
              ))}
            </select>
            {errors.bedId && <p className="mt-1 text-sm text-red-600">{errors.bedId.message}</p>}
          </div>
          <div>
            <label className="label">Diagnosis Masuk</label>
            <textarea {...register('admitDiagnosis')} rows={3} className="input" placeholder="Diagnosis awal pasien rawat inap" />
            {errors.admitDiagnosis && <p className="mt-1 text-sm text-red-600">{errors.admitDiagnosis.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Terima Pasien</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
