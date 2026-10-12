import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import type { ApiResponse, Clinic, Doctor, DoctorSchedule, Patient, PaginationMeta } from '../../types';

const registrationSchema = z.object({
  patientId: z.string().min(1, 'Pasien wajib dipilih'),
  clinicId: z.string().min(1, 'Poli wajib dipilih'),
  doctorId: z.string().min(1, 'Dokter wajib dipilih'),
  complaint: z.string().min(3, 'Keluhan wajib diisi'),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface QueueItem {
  id: string;
  queueNumber: number;
  formattedCode: string;
  status: string;
  queueDate: string;
  patient: Patient;
  doctor: Doctor;
  clinic: Clinic;
}

export function RegistrationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Pendaftaran & Antrean', active: true },
  ];

  const { data: queuesData, isLoading } = useQuery({
    queryKey: ['queues', page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<QueueItem[]>>('/registration/queues', {
        params: { page, limit },
      });
      return res.data;
    },
  });

  const { data: clinicsData } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Clinic[]>>('/master/clinics');
      return res.data?.data ?? [];
    },
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Doctor[]>>('/master/doctors');
      return res.data?.data ?? [];
    },
  });

  const { data: schedulesData } = useQuery({
    queryKey: ['schedules', 'all'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DoctorSchedule[]>>('/master/schedules');
      return res.data?.data ?? [];
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: ['patients-options'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Patient[]>>('/patients', { params: { limit: 100 } });
      return res.data?.data ?? [];
    },
  });

  const [searchPatient, setSearchPatient] = useState('');
  const filteredPatients = useMemo(() => {
    if (!patientsData) return [];
    const q = searchPatient.toLowerCase();
    return patientsData.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.medicalRecordNumber.toLowerCase().includes(q)
    );
  }, [patientsData, searchPatient]);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const watchClinicId = watch('clinicId');

  // Jadwal dokter aktif yang cocok dengan poli terpilih
  const availableSchedules = useMemo(() => {
    if (!schedulesData) return [];
    return schedulesData.filter((s) => !watchClinicId || s.clinicId === watchClinicId);
  }, [schedulesData, watchClinicId]);

  const availableDoctors = useMemo(() => {
    if (!doctorsData) return [];
    const doctorIds = new Set(availableSchedules.map((s) => s.doctorId));
    return doctorsData.filter((d) => doctorIds.has(d.id));
  }, [doctorsData, availableSchedules]);

  const onSubmit = async (data: RegistrationForm) => {
    try {
      const res = await api.post('/registration/queues', data);
      const queue = res.data?.data;
      toast('success', `Pendaftaran berhasil. Nomor antrean: ${queue?.formattedCode ?? ''}`);
      setModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Pendaftaran gagal');
    }
  };

  const updateQueueStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/registration/queues/${id}`, { status });
      toast('success', 'Status antrean diperbarui');
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal memperbarui status');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      REGISTERED: 'badge-gray',
      WAITING: 'badge-info',
      CALLED: 'badge-warning',
      IN_SERVICE: 'badge-warning',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const nextActions: Record<string, { label: string; to: string }[]> = {
    REGISTERED: [{ label: 'Tandai Menunggu', to: 'WAITING' }],
    WAITING: [{ label: 'Panggil', to: 'CALLED' }],
    CALLED: [{ label: 'Mulai Layani', to: 'IN_SERVICE' }],
    IN_SERVICE: [{ label: 'Selesai', to: 'COMPLETED' }],
  };

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendaftaran & Antrean</h1>
          <p className="text-sm text-gray-500 mt-1">Daftarkan pasien rawat jalan dan kelola status antrean harian.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Pendaftaran Baru
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !queuesData?.data || queuesData.data.length === 0 ? (
          <EmptyState title="Belum ada antrean hari ini" message="Lakukan pendaftaran untuk memulai antrean." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Antrean</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasien</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Poli</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dokter</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queuesData.data.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-semibold text-primary-700">{q.formattedCode}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{q.patient?.fullName}</p>
                        <p className="text-xs text-gray-500 font-mono">{q.patient?.medicalRecordNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{q.clinic?.name}</td>
                      <td className="px-6 py-4 text-gray-600">{q.doctor?.user?.fullName}</td>
                      <td className="px-6 py-4">{statusBadge(q.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {nextActions[q.status]?.map((a) => (
                            <button
                              key={a.to}
                              onClick={() => updateQueueStatus(q.id, a.to)}
                              className="btn-outline !px-3 !py-1 text-xs"
                            >
                              {a.label}
                            </button>
                          ))}
                          {['REGISTERED', 'WAITING'].includes(q.status) && (
                            <button
                              onClick={() => updateQueueStatus(q.id, 'CANCELLED')}
                              className="btn-danger !px-3 !py-1 text-xs"
                            >
                              <X className="h-3 w-3" /> Batal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={queuesData.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 }} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Modal Pendaftaran */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pendaftaran Pasien Rawat Jalan" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Cari Pasien</label>
            <input
              className="input"
              placeholder="Ketik nama atau nomor rekam medis..."
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
            />
            <select {...register('patientId')} className="input mt-2" size={5}>
              <option value="">— Pilih pasien —</option>
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.medicalRecordNumber} — {p.fullName}
                </option>
              ))}
            </select>
            {errors.patientId && <p className="mt-1 text-sm text-red-600">{errors.patientId.message}</p>}
          </div>

          <div>
            <label className="label">Poli / Unit Layanan</label>
            <select {...register('clinicId')} className="input">
              <option value="">— Pilih poli —</option>
              {clinicsData?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.clinicId && <p className="mt-1 text-sm text-red-600">{errors.clinicId.message}</p>}
          </div>

          <div>
            <label className="label">Dokter (sesuai jadwal aktif)</label>
            <select {...register('doctorId')} className="input">
              <option value="">— Pilih dokter —</option>
              {availableDoctors.map((d) => (
                <option key={d.id} value={d.id}>{d.user.fullName} — {d.specialization}</option>
              ))}
            </select>
            {errors.doctorId && <p className="mt-1 text-sm text-red-600">{errors.doctorId.message}</p>}
          </div>

          <div>
            <label className="label">Keluhan Utama</label>
            <textarea {...register('complaint')} rows={3} className="input" placeholder="Tuliskan keluhan pasien..." />
            {errors.complaint && <p className="mt-1 text-sm text-red-600">{errors.complaint.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Daftarkan & Ambil Nomor</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
