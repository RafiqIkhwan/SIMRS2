import { User, Mail, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

export function ProfilePage() {
  const { user } = useAuth();

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Profil Saya', active: true },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumb} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>

      <div className="card max-w-2xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 text-primary-700">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.fullName}</h2>
            <p className="text-sm text-gray-500">@{user?.username}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-900">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {user?.roles.map((r) => (
                  <span key={r} className="badge badge-info">
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Hak Akses (Permission)</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {user?.permissions.length ? (
                  user.permissions.map((p) => (
                    <span key={p} className="badge badge-gray font-mono text-[10px]">
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">Mengikuti hak akses role</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
