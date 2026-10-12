import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CalendarCheck,
  BedDouble,
  Pill,
  FlaskConical,
  Receipt,
  UserPlus,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { PageLoading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { ApiResponse } from '../../types';

interface DashboardStats {
  todayVisits: number;
  totalPatients: number;
  waitingQueue: number;
  admittedPatients: number;
  bedsAvailable: number;
  bedsTotal: number;
  pendingPrescriptions: number;
  pendingLabOrders: number;
  unpaidInvoices: number;
}

interface VisitTrend {
  date: string;
  count: number;
}

export function DashboardPage() {
  const { user } = useAuth();

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Dashboard' },
  ];

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>('/reports/dashboard');
      return res.data?.data ?? null;
    },
  });

  const { data: trend } = useQuery({
    queryKey: ['visits-trend'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VisitTrend[]>>('/reports/visits');
      return res.data?.data ?? [];
    },
  });

  if (loadingStats) return <PageLoading />;

  const maxCount = Math.max(...(trend ?? []).map((t) => t.count), 1);

  const cards = [
    {
      title: 'Kunjungan Hari Ini',
      value: stats?.todayVisits ?? 0,
      icon: CalendarCheck,
      color: 'blue' as const,
      to: '/registration',
    },
    {
      title: 'Total Pasien Terdaftar',
      value: stats?.totalPatients ?? 0,
      icon: Users,
      color: 'teal' as const,
      to: '/patients',
    },
    {
      title: 'Menunggu Panggilan',
      value: stats?.waitingQueue ?? 0,
      icon: Activity,
      color: 'yellow' as const,
      to: '/registration',
    },
    {
      title: 'Pasien Rawat Inap',
      value: stats?.admittedPatients ?? 0,
      icon: BedDouble,
      color: 'purple' as const,
      to: '/inpatient',
    },
  ];

  const workload = [
    {
      label: 'Tempat Tidur Tersedia',
      value: stats?.bedsAvailable ?? 0,
      suffix: `/ ${stats?.bedsTotal ?? 0}`,
      icon: BedDouble,
      to: '/inpatient',
    },
    {
      label: 'Resep Menunggu Diproses',
      value: stats?.pendingPrescriptions ?? 0,
      icon: Pill,
      to: '/pharmacy',
    },
    {
      label: 'Permintaan Lab Tertunda',
      value: stats?.pendingLabOrders ?? 0,
      icon: FlaskConical,
      to: '/laboratory',
    },
    {
      label: 'Tagihan Belum Lunas',
      value: stats?.unpaidInvoices ?? 0,
      icon: Receipt,
      to: '/billing',
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {user?.fullName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan operasional rumah sakit per {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} color={c.color} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Visit trend chart */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tren Kunjungan</h2>
              <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                Laporan lengkap <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {(trend ?? []).length === 0 ? (
              <EmptyState title="Belum ada data kunjungan" message="Grafik muncul setelah ada kunjungan tercatat." />
            ) : (
              <div className="flex items-end gap-2 h-56">
                {(trend ?? []).map((t) => (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.count}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-md hover:from-primary-700 hover:to-primary-500 transition-colors"
                      style={{ height: `${Math.max((t.count / maxCount) * 100, 2)}%` }}
                    />
                    <span className="text-[10px] text-gray-500 text-center leading-tight">
                      {new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workload / actionable counters */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Tindak Lanjut</h2>
          {workload.map((w) => (
            <Link
              key={w.label}
              to={w.to}
              className="card !p-4 flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 text-gray-600 flex-shrink-0">
                <w.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 truncate">{w.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {w.value}
                  {w.suffix && <span className="text-sm font-normal text-gray-400">{w.suffix}</span>}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}

          {user?.roles.some((r) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'].includes(r)) && (
            <Link to="/registration" className="btn-primary w-full">
              <UserPlus className="h-4 w-4" /> Pendaftaran Pasien Baru
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}