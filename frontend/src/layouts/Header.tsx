import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  LogOut,
  KeyRound,
} from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onMobileMenuToggle: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar, onMobileMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = user?.roles
    .map((r) => r.replace(/_/g, ' '))
    .join(', ');

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-700">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {user?.fullName}
            </p>
            <p className="text-[11px] text-gray-500 capitalize">{roleLabel}</p>
          </div>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
              <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">{roleLabel}</p>
            </div>
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/change-password');
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <KeyRound className="h-4 w-4" />
              Ubah Kata Sandi
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
