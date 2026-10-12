import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FlaskConical, Plus, TestTubeDiagonal } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import type { ApiResponse } from '../../types';

const labOrderSchema = z.object({
  medicalRecordId: z.string().uuid('ID rekam medis tidak valid'),
  labTestTypeId: z.string().min(1, 'Jenis pemeriksaan wajib dipilih'),
});

type LabOrderForm = z.infer<typeof labOrderSchema>;

interface LabOrderItem {
  id: string;
  orderNumber: string;
  status: string;
  requestedAt: string;
  medicalRecordId: string;
  patient: any;
  labTestTypes: any[];
}

interface LabTestType {
  id: string;
  code: string;
  name: string;
  price: string;
}

const statusMap: Record<string, string> = {
  PENDING: 'Belum Diproses',
  SAMPLE_COLLECTED: 'Sampel Diambil',
  IN_PROGRESS: 'Dalam Proses',
  COMPLETED: 'Selesai',
  VALIDATED: 'Tervalidasi',
  CANCELLED: 'Dibatalkan',
};

const badgeMap: Record<string, string> = {
  PENDING: 'badge-warning',
  SAMPLE_COLLECTED: 'badge-info',
  IN_PROGRESS: 'badge-warning',
  COMPLETED: 'badge-success',
  VALIDATED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export function LaboratoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderModal, setOrderModal] = useState(false);

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Laboratorium', active: true },
  ];

  const { data: orders, isLoading } = useQuery({
    queryKey: ['lab-orders'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<LabOrderItem[]>>('/laboratory/orders');
      return res.data?.data ?? [];
    },
  });

  const { data: testTypes } = useQuery({
    queryKey: ['lab-test-types'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<LabTestType[]>>('/laboratory/test-types');
      return res.data?.data ?? [];
    },
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-lab'],
    queryFn: async () => {
      const res = await api.get<any>('/patients', { params: { limit: 100 } });
      return res.data?.data ?? [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LabOrderForm>({
    resolver: zodResolver(labOrderSchema),
  });

  const onCreateOrder = async (data: LabOrderForm) => {
    try {
      await api.post('/laboratory/orders', data);
      toast('success', 'Permintaan pemeriksaan berhasil dibuat');
      setOrderModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal membuat permintaan');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.post(`/laboratory/orders/${id}/results`, { status });
      toast('success', 'Status permintaan diperbarui');
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal memperbarui status');
    }
  };

  const getTestTypesString = (types: any[]) => types?.map((t) => t.name).join(', ') || '-';

  return (
    <div>
      <Breadcrumb items={breadcrumb} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laboratorium</h1>
            <p className="text-sm text-gray-500">Kelola permintaan pemeriksaan dan hasil laboratorium.</p>
          </div>
        </div>
        <button onClick={() => setOrderModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Buat Permintaan
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !orders || orders.length === 0 ? (
          <EmptyState title="Belum ada permintaan laboratorium" message="Permintaan baru akan tampil di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Permintaan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasien</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Jenis Pemeriksaan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tgl Pemeriksaan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-primary-700">{o.orderNumber}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{o.patient?.fullName}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{getTestTypesString(o.labTestTypes)}</td>
                    <td className="px-6 py-4 text-gray-600">{o.requestedAt?.split('T')[0]}</td>
                    <td className="px-6 py-4">{badgeMap[o.status] ? <span className={`badge ${badgeMap[o.status]}`}>{statusMap[o.status] || o.status}</span> : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {['PENDING', 'SAMPLE_COLLECTED'].includes(o.status) && (
                        <button
                          onClick={() => updateStatus(o.id, 'IN_PROGRESS')}
                          className="btn-outline !px-3 !py-1 text-xs"
                        >
                          Proses
                        </button>
                      )}
                      {['IN_PROGRESS'].includes(o.status) && (
                        <button
                          onClick={() => updateStatus(o.id, 'COMPLETED')}
                          className="btn-outline !px-3 !py-1 text-xs"
                        >
                          Selesaikan
                        </button>
                      )}
                      {['COMPLETED'].includes(o.status) && (
                        <button
                          onClick={() => updateStatus(o.id, 'VALIDATED')}
                          className="btn-outline !px-3 !py-1 text-xs"
                        >
                          Validasi
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

      <Modal open={orderModal} onClose={() => setOrderModal(false)} title="Buat Permintaan Pemeriksaan">
        <form onSubmit={handleSubmit(onCreateOrder)} className="space-y-4">
          <div>
            <label className="label">Pasien</label>
            <select {...register('medicalRecordId')} className="input">
              <option value="">— Pilih pasien —</option>
              {patients?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.medicalRecordNumber} — {p.fullName}</option>
              ))}
            </select>
            {errors.medicalRecordId && <p className="mt-1 text-sm text-red-600">{errors.medicalRecordId.message}</p>}
          </div>
          <div>
            <label className="label">Jenis Pemeriksaan</label>
            <select {...register('labTestTypeId')} className="input">
              <option value="">— Pilih jenis pemeriksaan —</option>
              {testTypes?.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code}) — Rp {t.price}</option>
              ))}
            </select>
            {errors.labTestTypeId && <p className="mt-1 text-sm text-red-600">{errors.labTestTypeId.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setOrderModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Buat Permintaan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
