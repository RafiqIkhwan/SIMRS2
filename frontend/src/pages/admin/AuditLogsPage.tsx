import { useQuery } from '@tanstack/react-query';
import { Activity, Search } from 'lucide-react';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { useState } from 'react';
import type { ApiResponse, AuditLog, PaginationMeta } from '../../types';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [filter, setFilter] = useState({ action: '', entity: '', userId: '' });

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Admin', to: '/admin/users' },
    { label: 'Audit Log', active: true },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filter],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (filter.action) params.action = filter.action;
      if (filter.entity) params.entity = filter.entity;
      if (filter.userId) params.userId = filter.userId;
      const res = await api.get<ApiResponse<AuditLog[]>>('/admin/audit-logs', { params });
      return res.data;
    },
  });

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex items-center gap-3 mb-6">
        <Activity className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">Riwayat aktivitas sistem untuk keperluan audit dan keamanan.</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter aksi (contoh: AUTH_LOGIN, PATIENT_CREATE)..."
              className="input pl-10"
              value={filter.action}
              onChange={(e) => setFilter((prev) => ({ ...prev, action: e.target.value }))}
            />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter entitas (contoh: User, Patient, MedicalRecord)..."
              className="input pl-10"
              value={filter.entity}
              onChange={(e) => setFilter((prev) => ({ ...prev, entity: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.data || data.data.length === 0 ? (
          <EmptyState title="Belum ada log aktivitas" message="Log akan muncul setelah ada aktivitas sistem." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Waktu</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pengguna</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entitas</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID Entitas</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {log.user?.fullName || 'Sistem'}
                        <span className="text-gray-400 text-xs ml-2">({log.user?.username || '-'})</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-700">{log.action}</td>
                      <td className="px-6 py-4 text-gray-600">{log.entity}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{log.entityId || '-'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{log.ipAddress || '-'}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 }} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}