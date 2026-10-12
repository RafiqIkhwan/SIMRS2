import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';
import { X, Activity } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  ClipboardList,
  BedDouble,
  Pill,
  FlaskConical,
  Receipt,
  BarChart3,
  Shield,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  {
    label: 'Pasien',
    to: '/patients',
    icon: Users,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF', 'DOCTOR', 'NURSE', 'MEDICAL_RECORD_STAFF'],
  },
  {
    label: 'Pendaftaran',
    to: '/registration',
    icon: UserPlus,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'],
  },
  {
    label: 'Jadwal Dokter',
    to: '/schedules',
    icon: CalendarDays,
  },
  {
    label: 'Dokter',
    to: '/doctors',
    icon: Stethoscope,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'],
  },
  {
    label: 'Rekam Medis',
    to: '/medical-records',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'MEDICAL_RECORD_STAFF'],
  },
  {
    label: 'Rawat Inap',
    to: '/inpatient',
    icon: BedDouble,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'],
  },
  {
    label: 'Farmasi',
    to: '/pharmacy',
    icon: Pill,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR'],
  },
  {
    label: 'Laboratorium',
    to: '/laboratory',
    icon: FlaskConical,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF', 'DOCTOR'],
  },
  {
    label: 'Billing',
    to: '/billing',
    icon: Receipt,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CASHIER'],
  },
  {
    label: 'Laporan',
    to: '/reports',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGEMENT'],
  },
  {
    label: 'Pengguna',
    to: '/admin/users',
    icon: Shield,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'],
  },
  {
    label: 'Audit Log',
    to: '/admin/audit-logs',
    icon: Activity,
    roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'],
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { hasRole } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.roles || hasRole(...item.roles)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-800/30">
        <div className="flex items-center justify-center w-9 h-9 bg-white/10 rounded-lg">
          <Activity className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white leading-tight">SIMRS</h1>
            <p className="text-[10px] text-primary-200 truncate">Sistem Informasi Rumah Sakit</p>
          </div>
        )}
        {/* Mobile close */}
        <button onClick={onMobileClose} className="ml-auto lg:hidden text-white/70 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col bg-gradient-to-b from-primary-800 to-primary-900 transition-all duration-200',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gradient-to-b from-primary-800 to-primary-900 transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
