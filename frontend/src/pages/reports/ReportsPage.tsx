import { BarChart3, Download, CalendarDays, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Card, StatCard } from '../../components/ui/StatCard';
import { useState } from 'react';
import type { ApiResponse } from '../../types';

const reportTypes = [
  { id: 'visits', label: 'Kunjungan Pasien', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'revenue', label: 'Pendapatan', icon: <FileText className="h-5 w-5" /> },
  { id: 'bed-occupancy', label: 'Hunian Tempat Tidur', icon: <CalendarDays className="h-5 w-5" /> },
  { id: 'medication-stock', label: 'Stok Obat & Kedaluwarsa', icon: <FileText className="h-5 w-5" /> },
  { id: 'lab-activity', label: 'Aktivitas Laboratorium', icon: <FileText className="h-5 w-5" /> },
];

export function ReportsPage() {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState('visits');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Laporan & Statistik', active: true },
  ];

  const exportReport = async (type: string) => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set('start', dateRange.start);
      if (dateRange.end) params.set('end', dateRange.end);

      const res = await api.get(`/reports/${type}`, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('success', 'Laporan berhasil diekspor');
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Ekspor gagal');
    }
  };

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan & Statistik</h1>
          <p className="text-sm text-gray-500">Laporan operasional rumah sakit yang dapat diekspor ke CSV/PDF.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {reportTypes.map((r) => (
          <div
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`card cursor-pointer transition-all border-2 ${
              activeReport === r.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${activeReport === r.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                {r.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{r.label}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border-b border-gray-200">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label">Tanggal Mulai</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Tanggal Akhir</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => exportReport(activeReport)} className="btn-primary">
              <Download className="h-4 w-4" /> Ekspor CSV
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeReport === 'visits' && (
            <VisitsReport dateRange={dateRange} />
          )}
          {activeReport === 'revenue' && (
            <RevenueReport dateRange={dateRange} />
          )}
          {activeReport === 'bed-occupancy' && (
            <BedOccupancyReport dateRange={dateRange} />
          )}
          {activeReport === 'medication-stock' && (
            <MedicationStockReport dateRange={dateRange} />
          )}
          {activeReport === 'lab-activity' && (
            <LabActivityReport dateRange={dateRange} />
          )}
        </div>
      </div>
    </div>
  );
}

function VisitsReport({ dateRange }: { dateRange: { start: string; end: string } }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    setLoading(true);
    api
      .get<any>(`/reports/visits`, { params: dateRange })
      .then((res) => {
        if (res.data?.success) setData(res.data.data ?? []);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  });

  if (loading) return <LoadingSpinner />;
  if (!data.length) return <EmptyState title="Belum ada data kunjungan" message="Data akan muncul sesuai filter." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Jumlah Kunjungan</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Poli</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Dokter</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((d, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-600">{d.date}</td>
              <td className="px-4 py-2 font-medium text-gray-900">{d.count}</td>
              <td className="px-4 py-2 text-gray-600">{d.clinic || '-'}</td>
              <td className="px-4 py-2 text-gray-600">{d.doctor || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevenueReport({ dateRange }: { dateRange: { start: string; end: string } }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    setLoading(true);
    api
      .get<any>(`/reports/revenue`, { params: dateRange })
      .then((res) => {
        if (res.data?.success) setData(res.data.data ?? []);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  });

  if (loading) return <LoadingSpinner />;
  if (!data.length) return <EmptyState title="Belum ada data pendapatan" message="Data akan muncul sesuai filter." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Periode</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Jasa Medis</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Obat</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Lab</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rawat Inap</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((d, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-600">{d.period}</td>
              <td className="px-4 py-2 text-gray-600">Rp {Number(d.medical || 0).toLocaleString()}</td>
              <td className="px-4 py-2 text-gray-600">Rp {Number(d.medication || 0).toLocaleString()}</td>
              <td className="px-4 py-2 text-gray-600">Rp {Number(d.lab || 0).toLocaleString()}</td>
              <td className="px-4 py-2 text-gray-600">Rp {Number(d.inpatient || 0).toLocaleString()}</td>
              <td className="px-4 py-2 font-medium text-gray-900">Rp {Number(d.total || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BedOccupancyReport({ dateRange }: { dateRange: { start: string; end: string } }) {
  return <EmptyState title="Laporan Hunian Tempat Tidur" message="Data akan tersedia setelah implementasi endpoint backend." />;
}

function MedicationStockReport({ dateRange }: { dateRange: { start: string; end: string } }) {
  return <EmptyState title="Laporan Stok Obat" message="Data akan tersedia setelah implementasi endpoint backend." />;
}

function LabActivityReport({ dateRange }: { dateRange: { start: string; end: string } }) {
  return <EmptyState title="Laporan Aktivitas Lab" message="Data akan tersedia setelah implementasi endpoint backend." />;
}