import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Receipt, Plus, Banknote } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import type { ApiResponse, PaginationMeta } from '../../types';
import { useState } from 'react';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Jumlah pembayaran wajib diisi'),
  paymentMethod: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'BPJS', 'INSURANCE']),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  paidAmount: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  patient: any;
  items: any[];
  payments: any[];
}

const statusMap: Record<string, string> = {
  UNPAID: 'Belum Dibayar',
  PARTIALLY_PAID: 'Dibayar Sebagian',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dikembalikan',
};

const badgeMap: Record<string, string> = {
  UNPAID: 'badge-danger',
  PARTIALLY_PAID: 'badge-warning',
  PAID: 'badge-success',
  CANCELLED: 'badge-gray',
  REFUNDED: 'badge-info',
};

const methodMap: Record<string, string> = {
  CASH: 'Tunai',
  DEBIT_CARD: 'Kartu Debit',
  CREDIT_CARD: 'Kartu Kredit',
  BANK_TRANSFER: 'Transfer Bank',
  BPJS: 'BPJS',
  INSURANCE: 'Asuransi',
};

export function BillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [paymentModal, setPaymentModal] = useState<InvoiceItem | null>(null);

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Billing & Pembayaran', active: true },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<InvoiceItem[]>>('/billing/invoices', {
        params: { page, limit },
      });
      return res.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: 'CASH' },
  });

  const onPayment = async (data: PaymentForm) => {
    if (!paymentModal) return;
    try {
      await api.post(`/billing/invoices/${paymentModal.id}/payments`, data);
      toast('success', 'Pembayaran berhasil dicatat');
      setPaymentModal(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Pembayaran gagal');
    }
  };

  const remaining = (inv: InvoiceItem) =>
    Number(inv.totalAmount) - Number(inv.paidAmount);

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Pembayaran</h1>
            <p className="text-sm text-gray-500">Tagihan layanan, obat, dan pencatatan pembayaran.</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.data || data.data.length === 0 ? (
          <EmptyState title="Belum ada tagihan" message="Tagihan dibuat otomatis dari layanan tercatat." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Tagihan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasien</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dibayar</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sisa</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium text-primary-700">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{inv.patient?.fullName}</td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        Rp {Number(inv.totalAmount).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        Rp {Number(inv.paidAmount).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-red-600 font-medium">
                        Rp {remaining(inv).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${badgeMap[inv.status] || 'badge-gray'}`}>
                          {statusMap[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {remaining(inv) > 0 && !['CANCELLED', 'REFUNDED'].includes(inv.status) && (
                          <button
                            onClick={() => setPaymentModal(inv)}
                            className="btn-primary !px-3 !py-1 text-xs"
                          >
                            <Banknote className="h-3.5 w-3.5" /> Bayar
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

      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title={`Pembayaran — ${paymentModal?.invoiceNumber ?? ''}`}
        maxWidth="max-w-md"
      >
        {paymentModal && (
          <>
            <div className="rounded-lg bg-gray-50 p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Total Tagihan</span>
                <span className="font-medium">Rp {Number(paymentModal.totalAmount).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Sudah Dibayar</span>
                <span>Rp {Number(paymentModal.paidAmount).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-red-600 border-t border-gray-200 pt-2">
                <span>Sisa Tagihan</span>
                <span>Rp {remaining(paymentModal).toLocaleString('id-ID')}</span>
              </div>
            </div>
            <form onSubmit={handleSubmit(onPayment)} className="space-y-4">
              <div>
                <label className="label">Jumlah Pembayaran (Rp)</label>
                <input type="number" {...register('amount')} className="input" placeholder="0" />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="label">Metode Pembayaran</label>
                <select {...register('paymentMethod')} className="input">
                  {Object.entries(methodMap).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Catatan (opsional)</label>
                <input {...register('notes')} className="input" placeholder="Contoh: Pembayaran tunai" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setPaymentModal(null)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary">Catat Pembayaran</button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}