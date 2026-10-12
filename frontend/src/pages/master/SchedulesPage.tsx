import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { ApiResponse, DoctorSchedule, Clinic } from '../../types';
import { useState } from 'react';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function SchedulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterClinic, setFilterClinic] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Jadwal Dokter', active: true },
  ];

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules-page', filterClinic, filterDay],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterClinic) params.clinicId = filterClinic;
      if (filterDay !== '') params.dayOfWeek = filterDay;
      const res = await api.get<ApiResponse<DoctorSchedule[]>>('/master/schedules', { params });
      return res.data?.data ?? [];
    },
  });

  const { data: clinics } = useQuery({
    queryKey: ['clinics-filter'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Clinic[]>>('/master/clinics');
      return res.data?.data ?? [];
    },
  });

  const grouped = (schedules ?? []).reduce<Record<number, DoctorSchedule[]>>((acc, s) => {
    (acc[s.dayOfWeek] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <Breadcrumb items={breadcrumb} />
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jadwal Dokter</h1>
          <p className="text-sm text-gray-500">Jadwal praktik aktif untuk pendaftaran pasien.</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Filter Poli</label>
            <select value={filterClinic} onChange={(e) => setFilterClinic(e.target.value)} className="input">
              <option value="">Semua Poli</option>
              {clinics?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Filter Hari</label>
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="input">
              <option value="">Semua Hari</option>
              {DAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (schedules ?? []).length === 0 ? (
        <EmptyState title="Belum ada jadwal aktif" message="Jadwal praktik akan tampil di sini." />
      ) : (
        <div className="space-y-4">
          {Object.keys(grouped)
            .map(Number)
            .sort()
            .map((day) => (
              <div key={day} className="card">
                <h2 className="font-semibold text-gray-900 mb-3">{DAYS[day]}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {grouped[day].map((s) => (
                    <div key={s.id} className="flex justify-between items-center rounded-lg border border-gray-100 p-3 bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.doctor?.user?.fullName}</p>
                        <p className="text-xs text-gray-500">{s.clinic?.name}</p>
                        <p className="text-xs text-primary-600 font-mono">{s.startTime} – {s.endTime} • Kuota {s.quota}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
