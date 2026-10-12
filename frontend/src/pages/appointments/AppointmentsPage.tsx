import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { ApiResponse, PaginationMeta } from '../../types';

interface AppointmentItem {
  id: string;
  scheduledDate: string;
  status: string;
  complaint?: string;
  patient: any;
  doctor: any;
}

export function AppointmentsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const limit = 10;

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Kunjungan (Appointment)', active: true },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AppointmentItem[]>>('/appointments', {
        params: { page, limit },
      });
      return res.data;
    },
  });

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}`, { status });
      toast('success', 'Status kunjungan diperbarui');
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal memperbarui');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      SCHEDULED: 'badge-gray',
      CONFIRMED: 'badge-info',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div>
      <Breadcrumb items={breadcrumb} />
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Kunjungan</h1>
          <p className="text-sm text-gray-500">Jadwal kunjungan pasien poliklinik.</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.data || data.data.length === 0 ? (
          <EmptyState title="Belum ada jadwal kunjungan" message="Kunjungan akan muncul setelah pendaftaran." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasien</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dokter</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Keluhan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600">{a.scheduledDate?.split('T')[0]}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{a.patient?.fullName}</td>
                      <td className="px-6 py-4 text-gray-600">{a.doctor?.user?.fullName}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">{a.complaint || '-'}</td>
                      <td className="px-6 py-4">{statusBadge(a.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {a.status === 'SCHEDULED' && (
                          <button onClick={() => updateStatus(a.id, 'CONFIRMED')} className="btn-outline !px-3 !py-1 text-xs">
                            Konfirmasi
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 }} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}