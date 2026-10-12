import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Droplets, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { ApiResponse, Patient } from '../../types';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<Patient>>(`/patients/${id}`)
      .then((res) => {
        if (res.data?.success && res.data.data) setPatient(res.data.data);
      })
      .catch(() => toast('error', 'Gagal memuat data pasien'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  if (loading) return <LoadingSpinner />;
  if (!patient)
    return <EmptyState title="Pasien tidak ditemukan" message="Data tidak tersedia." />;

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string; icon?: any }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Beranda', to: '/' },
          { label: 'Pasien', to: '/patients' },
          { label: patient.fullName, active: true },
        ]}
      />

      <button onClick={() => navigate('/patients')} className="btn-secondary mb-4">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 text-primary-700">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{patient.fullName}</h2>
              <p className="text-sm text-primary-600 font-mono">{patient.medicalRecordNumber}</p>
            </div>
          </div>
          <InfoRow label="NIK" value={patient.nationalIdNumber} />
          <InfoRow label="Jenis Kelamin" value={patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} />
          <InfoRow label="Tanggal Lahir" value={patient.birthDate?.split('T')[0]} />
          <InfoRow label="Golongan Darah" value={patient.bloodType} icon={Droplets} />
          <InfoRow label="Telepon" value={patient.phone} icon={Phone} />
          <InfoRow label="Alamat" value={`${patient.address}, ${patient.city}`} icon={MapPin} />
          <InfoRow label="Status" value={patient.isActive ? 'Aktif' : 'Nonaktif'} />
        </div>

        {/* Alergi & Kontak Darurat */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Riwayat Alergi
            </h3>
            <p className="text-sm text-gray-700">{patient.allergies || 'Tidak ada riwayat alergi'}</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Kontak Darurat</h3>
            {patient.emergencyContacts && patient.emergencyContacts.length > 0 ? (
              patient.emergencyContacts.map((c) => (
                <div key={c.id} className="text-sm py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-gray-500">{c.relationship} — {c.phone}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Belum ada kontak darurat.</p>
            )}
          </div>
        </div>

        {/* Riwayat */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Riwayat Kunjungan</h3>
          {(patient as any).queues?.length > 0 ? (
            <div className="space-y-2">
              {(patient as any).queues.map((q: any) => (
                <div key={q.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{q.clinic?.name}</p>
                    <p className="text-gray-500">{q.doctor?.user?.fullName}</p>
                  </div>
                  <span className="text-gray-400 text-xs">{q.queueDate?.split('T')[0]}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada kunjungan" message="Riwayat kunjungan akan muncul di sini." />
          )}
        </div>
      </div>
    </div>
  );
}
