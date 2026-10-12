import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pill, Package, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { StatCard } from '../../components/ui/StatCard';
import type { ApiResponse } from '../../types';

interface MedicationItem {
  id: string;
  code: string;
  name: string;
  category: string;
  dosageForm: string;
  unit: string;
  minStock: number;
  currentStock: number;
  pricePerUnit: string;
  batches?: any[];
}

interface PrescriptionItem {
  id: string;
  rxNumber: string;
  status: string;
  createdAt: string;
  medicalRecordId: string;
  items: any[];
}

const rxStatusMap: Record<string, string> = {
  PENDING: 'Menunggu',
  PROCESSING: 'Diproses',
  DISPENSED: 'Diserahkan',
  CANCELLED: 'Dibatalkan',
};

const rxBadgeMap: Record<string, string> = {
  PENDING: 'badge-warning',
  PROCESSING: 'badge-info',
  DISPENSED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export function PharmacyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Farmasi', active: true },
  ];

  const { data: medications, isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MedicationItem[]>>('/pharmacy/medications');
      return res.data?.data ?? [];
    },
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PrescriptionItem[]>>('/pharmacy/prescriptions');
      return res.data?.data ?? [];
    },
  });

  const updateRxStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/pharmacy/prescriptions/${id}`, { status });
      toast('success', 'Status resep diperbarui');
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal memperbarui status');
    }
  };

  const lowStock = (medications ?? []).filter((m) => m.currentStock <= m.minStock);
  const nearExpiry = (medications ?? []).filter(
    (m) =>
      m.batches?.some(
        (b) => new Date(b.expiryDate).getTime() - Date.now() < 90 * 24 * 3600 * 1000
      )
  );

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex items-center gap-3 mb-6">
        <Pill className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farmasi</h1>
          <p className="text-sm text-gray-500">Kelola stok obat, batch, dan penyerahan resep.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Obat" value={medications?.length ?? 0} icon={Package} color="blue" />
        <StatCard title="Stok Menipis" value={lowStock.length} icon={AlertTriangle} color="yellow" />
        <StatCard title="Mendekati Kedaluwarsa" value={nearExpiry.length} icon={Clock} color="red" />
        <StatCard title="Resep Menunggu" value={(prescriptions ?? []).filter((p) => p.status === 'PENDING').length} icon={Pill} color="teal" />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Master Obat</h2>
      <div className="card overflow-hidden p-0 mb-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : (medications ?? []).length === 0 ? (
          <EmptyState title="Belum ada data obat" message="Master obat akan tampil di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kode</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama Obat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bentuk</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stok</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Harga</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(medications ?? []).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-primary-700 font-medium">{m.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-gray-600">{m.category}</td>
                    <td className="px-6 py-4 text-gray-600">{m.dosageForm}</td>
                    <td className="px-6 py-4">
                      <span className={m.currentStock <= m.minStock ? 'font-semibold text-yellow-600' : 'text-gray-900'}>
                        {m.currentStock} {m.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      Rp {Number(m.pricePerUnit).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      {m.currentStock <= m.minStock ? (
                        <span className="badge-warning">Menipis</span>
                      ) : (
                        <span className="badge-success">Tersedia</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Daftar Resep Masuk</h2>
      <div className="card overflow-hidden p-0">
        {(prescriptions ?? []).length === 0 ? (
          <EmptyState title="Belum ada resep masuk" message="Resep dari dokter akan tampil di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Resep</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tgl Dibuat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Jumlah Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(prescriptions ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-primary-700">{p.rxNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{p.createdAt?.split('T')[0]}</td>
                    <td className="px-6 py-4 text-gray-600">{p.items?.length ?? 0} item</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${rxBadgeMap[p.status] || 'badge-gray'}`}>
                        {rxStatusMap[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'PENDING' && (
                        <button
                          onClick={() => updateRxStatus(p.id, 'PROCESSING')}
                          className="btn-outline !px-3 !py-1 text-xs"
                        >
                          Proses
                        </button>
                      )}
                      {p.status === 'PROCESSING' && (
                        <button
                          onClick={() => updateRxStatus(p.id, 'DISPENSED')}
                          className="btn-primary !px-3 !py-1 text-xs"
                        >
                          Serahkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}