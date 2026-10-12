import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Stethoscope, CalendarDays } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import type { ApiResponse, Doctor, Clinic, DoctorSchedule } from '../../types';

const doctorSchema = z.object({
  userId: z.string().uuid('ID pengguna tidak valid'),
  clinicId: z.string().min(1, 'Poli wajib dipilih'),
  licenseNumber: z.string().min(3, 'Nomor izin wajib diisi'),
  specialization: z.string().min(3, 'Spesialisasi wajib diisi'),
});

type DoctorForm = z.infer<typeof doctorSchema>;

const scheduleSchema = z.object({
  doctorId: z.string().uuid(),
  clinicId: z.string().min(1, 'Poli wajib dipilih'),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  quota: z.coerce.number().int().min(1),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function DoctorsPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [doctorModal, setDoctorModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const isAdmin = hasRole('SUPER_ADMIN', 'HOSPITAL_ADMIN');

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Dokter', active: true },
  ];

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Doctor[]>>('/master/doctors');
      return res.data?.data ?? [];
    },
  });

  const { data: clinics } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Clinic[]>>('/master/clinics');
      return res.data?.data ?? [];
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ['schedules-all'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DoctorSchedule[]>>('/master/schedules');
      return res.data?.data ?? [];
    },
  });

  // Buat list pengguna non-dokter untuk dipilih saat buat profil dokter
  const { data: users } = useQuery({
    queryKey: ['users-doctor-candidates'],
    queryFn: async () => {
      const res = await api.get<any>('/users', { params: { limit: 100, role: 'DOCTOR' } });
      return res.data?.data ?? [];
    },
    enabled: isAdmin,
  });

  const {
    register: rDoctor,
    handleSubmit: hDoctor,
    reset: resetDoctor,
    formState: { errors: eDoctor },
  } = useForm<DoctorForm>({ resolver: zodResolver(doctorSchema) });

  const {
    register: rSchedule,
    handleSubmit: hSchedule,
    reset: resetSchedule,
    formState: { errors: eSchedule },
  } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { dayOfWeek: 1, quota: 30, startTime: '08:00', endTime: '12:00' },
  });

  const onCreateDoctor = async (data: DoctorForm) => {
    try {
      await api.post('/master/doctors', data);
      toast('success', 'Profil dokter berhasil dibuat');
      setDoctorModal(false);
      resetDoctor();
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menambah dokter');
    }
  };

  const openScheduleModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    resetSchedule({
      doctorId: doctor.id,
      clinicId: doctor.clinicId,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '12:00',
      quota: 30,
    });
    setScheduleModal(true);
  };

  const onCreateSchedule = async (data: ScheduleForm) => {
    try {
      await api.post('/master/schedules', data);
      toast('success', 'Jadwal berhasil dibuat');
      setScheduleModal(false);
      queryClient.invalidateQueries({ queryKey: ['schedules-all'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menambah jadwal');
    }
  };

  const getDoctorSchedules = (doctorId: string) =>
    (schedules ?? []).filter((s) => s.doctorId === doctorId);

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Dokter</h1>
            <p className="text-sm text-gray-500">Manajemen profil dokter, spesialisasi, dan jadwal praktik.</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setDoctorModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Tambah Dokter
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !doctors || doctors.length === 0 ? (
        <EmptyState title="Belum ada data dokter" message="Tambahkan profil dokter beserta jadwal praktiknya." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => (
            <div key={d.id} className="card">
              <h3 className="font-semibold text-gray-900">{d.user.fullName}</h3>
              <p className="text-sm text-primary-600">{d.specialization}</p>
              <p className="text-xs text-gray-500 mt-1">SIP: {d.licenseNumber}</p>
              <p className="text-xs text-gray-500">Poli: {d.clinic?.name}</p>

              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> Jadwal Aktif
                </p>
                {getDoctorSchedules(d.id).length === 0 ? (
                  <p className="text-xs text-gray-400 mt-1">Belum ada jadwal aktif.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {getDoctorSchedules(d.id).map((s) => (
                      <li key={s.id} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 flex justify-between">
                        <span>
                          {DAYS[s.dayOfWeek]} {s.startTime}-{s.endTime}
                        </span>
                        <span className="text-gray-400">Kuota {s.quota}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isAdmin && (
                <button
                  onClick={() => openScheduleModal(d)}
                  className="btn-outline w-full mt-3 !py-1.5 text-xs"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Tambah Jadwal
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Dokter */}
      <Modal open={doctorModal} onClose={() => setDoctorModal(false)} title="Tambah Profil Dokter">
        <form onSubmit={hDoctor(onCreateDoctor)} className="space-y-4">
          <div>
            <label className="label">ID Pengguna (UUID)</label>
            <input {...rDoctor('userId')} className="input" placeholder="UUID pengguna dengan role DOCTOR" />
            {eDoctor.userId && <p className="mt-1 text-sm text-red-600">{eDoctor.userId.message}</p>}
            {users?.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Calon pengguna tersedia:{' '}
                {users.map((u: any) => `${u.fullName} (${u.username})`).join(', ')}
              </p>
            )}
          </div>
          <div>
            <label className="label">Poliklinik</label>
            <select {...rDoctor('clinicId')} className="input">
              <option value="">— Pilih poli —</option>
              {clinics?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {eDoctor.clinicId && <p className="mt-1 text-sm text-red-600">{eDoctor.clinicId.message}</p>}
          </div>
          <div>
            <label className="label">Nomor Izin Praktik (SIP)</label>
            <input {...rDoctor('licenseNumber')} className="input" placeholder="SIP-503/001/DINKES/2026" />
            {eDoctor.licenseNumber && <p className="mt-1 text-sm text-red-600">{eDoctor.licenseNumber.message}</p>}
          </div>
          <div>
            <label className="label">Spesialisasi</label>
            <input {...rDoctor('specialization')} className="input" placeholder="Dokter Spesialis Penyakit Dalam" />
            {eDoctor.specialization && <p className="mt-1 text-sm text-red-600">{eDoctor.specialization.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setDoctorModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah Jadwal */}
      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title={`Tambah Jadwal — ${selectedDoctor?.user.fullName ?? ''}`}>
        <form onSubmit={hSchedule(onCreateSchedule)} className="space-y-4">
          <div>
            <label className="label">Poliklinik</label>
            <select {...rSchedule('clinicId')} className="input">
              <option value="">— Pilih poli —</option>
              {clinics?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {eSchedule.clinicId && <p className="mt-1 text-sm text-red-600">{eSchedule.clinicId.message as string}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Hari</label>
              <select {...rSchedule('dayOfWeek')} className="input">
                {DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
              {eSchedule.dayOfWeek && <p className="mt-1 text-sm text-red-600">{eSchedule.dayOfWeek.message as string}</p>}
            </div>
            <div>
              <label className="label">Kuota Pasien</label>
              <input {...rSchedule('quota')} type="number" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Jam Mulai (HH:MM)</label>
              <input {...rSchedule('startTime')} className="input" placeholder="08:00" />
              {eSchedule.startTime && <p className="mt-1 text-sm text-red-600">{eSchedule.startTime.message as string}</p>}
            </div>
            <div>
              <label className="label">Jam Selesai (HH:MM)</label>
              <input {...rSchedule('endTime')} className="input" placeholder="12:00" />
              {eSchedule.endTime && <p className="mt-1 text-sm text-red-600">{eSchedule.endTime.message as string}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setScheduleModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Simpan Jadwal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
