import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, FileText, Search, Plus, Edit, Trash } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ConfirmModal, Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import type { ApiResponse } from '../../types';

interface MedicalRecordItem {
  id: string;
  recordNumber: string;
  visitDate: string;
  status: string;
  patient: any;
  doctor: any;
  queue: any;
  _count: { clinicalNotes: number; diagnoses: number; prescriptions: number };
}

interface ClinicalNote {
  id: string;
  authorId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  bodyTemp?: number;
  weightKg?: number;
  heightCm?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface UuidOption {
  id: string;
  label: string;
  detail: string;
}

interface PatientOption {
  id: string;
  fullName: string;
  medicalRecordNumber: string;
}

interface DoctorOption {
  id: string;
  licenseNumber: string;
  specialization: string;
  user: { fullName: string };
}

interface QueueOption {
  id: string;
  formattedCode: string;
  patient: { fullName: string; medicalRecordNumber: string };
  doctor: { user: { fullName: string } };
  clinic: { name: string };
}

function useDebouncedValue(value: string, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function rankOptions(options: UuidOption[], search: string): UuidOption[] {
  const term = search.trim().toLocaleLowerCase();
  const rank = (option: UuidOption) => {
    const values = [option.id, option.label, option.detail].map((value) => value.toLocaleLowerCase());
    if (values.some((value) => value === term)) return 0;
    if (values.some((value) => value.startsWith(term))) return 1;
    return 2;
  };

  return [...options].sort((left, right) => rank(left) - rank(right));
}

function UuidSuggestionField({
  label,
  placeholder,
  search,
  selected,
  options,
  isLoading,
  error,
  onSearch,
  onSelect,
}: {
  label: string;
  placeholder: string;
  search: string;
  selected: UuidOption | null;
  options: UuidOption[];
  isLoading: boolean;
  error?: string;
  onSearch: (value: string) => void;
  onSelect: (option: UuidOption) => void;
}) {
  const showOptions = !selected && search.trim().length >= 2;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        autoComplete="off"
        className="input w-full"
        placeholder={placeholder}
        value={selected ? `${selected.label} — ${selected.id}` : search}
        aria-autocomplete="list"
        aria-expanded={showOptions}
        onChange={(event) => onSearch(event.target.value)}
      />
      {showOptions && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-gray-500">Mencari...</p>
          ) : error ? (
            <p className="px-3 py-2 text-sm text-red-600">{error}</p>
          ) : options.length ? (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="block w-full border-b border-gray-100 px-3 py-2 text-left last:border-0 hover:bg-primary-50"
                onClick={() => onSelect(option)}
              >
                <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                <span className="block truncate font-mono text-xs text-gray-500">{option.id}</span>
                {option.detail && <span className="block text-xs text-gray-500">{option.detail}</span>}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-gray-500">Tidak ada data yang cocok.</p>
          )}
        </div>
      )}
      {selected && <p className="mt-1 text-xs text-green-700">ID terpilih: {selected.id}</p>}
      {!selected && search.trim().length === 1 && (
        <p className="mt-1 text-xs text-gray-500">Ketik minimal 2 karakter untuk melihat saran.</p>
      )}
    </div>
  );
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: 'badge-warning',
    FINAL: 'badge-success',
    AMENDED: 'badge-info',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
};

export function MedicalRecordsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<UuidOption | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<UuidOption | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<UuidOption | null>(null);
  const [noteModal, setNoteModal] = useState<{ open: boolean; recordId?: string; onClose?: () => void }>({ open: false });
  const [form, setForm] = useState<Partial<ClinicalNote>>({});
  const [saving, setSaving] = useState(false);
  const debouncedPatientSearch = useDebouncedValue(patientSearch);
  const debouncedDoctorSearch = useDebouncedValue(doctorSearch);
  const debouncedQueueSearch = useDebouncedValue(queueSearch);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['medical-records', page, search],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MedicalRecordItem[]>>('/medical-records', {
        params: { page, limit: 10, search },
      });
      return res.data;
    },
  });

  const { data: patientOptions = [], isLoading: patientsLoading, isError: patientsError } = useQuery({
    queryKey: ['medical-record-patient-options', debouncedPatientSearch],
    enabled: createOpen && debouncedPatientSearch.trim().length >= 2 && !selectedPatient,
    queryFn: async () => {
      const res = await api.get<ApiResponse<PatientOption[]>>('/patients', {
        params: { page: 1, limit: 8, search: debouncedPatientSearch.trim() },
      });
      return (res.data?.data ?? []).map((patient) => ({
        id: patient.id,
        label: patient.fullName,
        detail: patient.medicalRecordNumber,
      }));
    },
  });

  const { data: doctors = [], isLoading: doctorsLoading, isError: doctorsError } = useQuery({
    queryKey: ['medical-record-doctor-options'],
    enabled: createOpen,
    queryFn: async () => {
      const res = await api.get<ApiResponse<DoctorOption[]>>('/master/doctors');
      return res.data?.data ?? [];
    },
  });

  const { data: queueOptions = [], isLoading: queuesLoading, isError: queuesError } = useQuery({
    queryKey: ['medical-record-queue-options', debouncedQueueSearch],
    enabled: createOpen && debouncedQueueSearch.trim().length >= 2 && !selectedQueue,
    queryFn: async () => {
      const res = await api.get<ApiResponse<QueueOption[]>>('/medical-records/queue-options', {
        params: { search: debouncedQueueSearch.trim() },
      });
      return (res.data?.data ?? []).map((queue) => ({
        id: queue.id,
        label: `${queue.formattedCode} — ${queue.patient.fullName}`,
        detail: `${queue.patient.medicalRecordNumber} · ${queue.doctor.user.fullName} · ${queue.clinic.name}`,
      }));
    },
  });

  const doctorOptions = useMemo(() => {
    const search = debouncedDoctorSearch.trim().toLocaleLowerCase();
    if (search.length < 2 || selectedDoctor) return [];

    const matches = doctors
      .filter((doctor) =>
        [doctor.id, doctor.user.fullName, doctor.licenseNumber, doctor.specialization]
          .some((value) => value.toLocaleLowerCase().includes(search))
      )
      .map((doctor) => ({
        id: doctor.id,
        label: doctor.user.fullName,
        detail: `${doctor.specialization} · SIP ${doctor.licenseNumber}`,
      }));

    return rankOptions(matches, search).slice(0, 8);
  }, [debouncedDoctorSearch, doctors, selectedDoctor]);

  const rankedPatientOptions = useMemo(
    () => rankOptions(patientOptions, debouncedPatientSearch).slice(0, 8),
    [patientOptions, debouncedPatientSearch]
  );

  const rankedQueueOptions = useMemo(
    () => rankOptions(queueOptions, debouncedQueueSearch).slice(0, 8),
    [queueOptions, debouncedQueueSearch]
  );

  const resetCreateForm = () => {
    setCreateOpen(false);
    setPatientSearch('');
    setDoctorSearch('');
    setQueueSearch('');
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedQueue(null);
  };

  const submitCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor) {
      toast('error', 'Pilih pasien dan dokter dari daftar saran terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      await api.post('/medical-records', {
        patientId: selectedPatient.id,
        doctorId: selectedDoctor.id,
        queueId: selectedQueue?.id,
      });
      toast('success', 'Rekam medis berhasil dibuat');
      resetCreateForm();
      setPage(1);
      await refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal membuat rekam medis');
    } finally {
      setSaving(false);
    }
  };

  const submitNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!noteModal.recordId) return;
    const formData = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await api.post('/medical-records/clinical-notes', {
        medicalRecordId: noteModal.recordId,
        subjective: formData.get('subjective'),
        objective: formData.get('objective'),
        assessment: formData.get('assessment'),
        plan: formData.get('plan'),
        systolicBP: formData.get('systolicBP') ? parseInt(formData.get('systolicBP') as string) : undefined,
        diastolicBP: formData.get('diastolicBP') ? parseInt(formData.get('diastolicBP') as string) : undefined,
        heartRate: formData.get('heartRate') ? parseInt(formData.get('heartRate') as string) : undefined,
        respiratoryRate: formData.get('respiratoryRate') ? parseInt(formData.get('respiratoryRate') as string) : undefined,
        bodyTemp: formData.get('bodyTemp') ? parseFloat(formData.get('bodyTemp') as string) : undefined,
        weightKg: formData.get('weightKg') ? parseFloat(formData.get('weightKg') as string) : undefined,
        heightCm: formData.get('heightCm') ? parseFloat(formData.get('heightCm') as string) : undefined,
        status: formData.get('status'),
      });
      toast('success', 'Catatan klinis berhasil disimpan');
      setNoteModal({ open: false });
      await refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal menyimpan catatan klinis');
    } finally {
      setSaving(false);
    }
  };

  const finalizeRecord = async (id: string) => {
    const confirm = window.confirm('Finalisasi rekam medis ini? Tindakan tidak dapat dibatalkan tanpa amend.');
    if (!confirm) return;
    setSaving(true);
    try {
      await api.post(`/medical-records/${id}/finalize`);
      toast('success', 'Rekam medis berhasil difinalisasi');
      await refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error?.message || 'Gagal finalisasi');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumb = [
    { label: 'Beranda', to: '/' },
    { label: 'Rekam Medis', active: true },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rekam Medis Elektronik</h1>
            <p className="text-sm text-gray-500">Daftar kunjungan dan catatan medis pasien.</p>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor rekam medis atau nama pasien..."
            className="input pl-10 w-64"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button className="btn-primary flex items-center gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Buat Rekam Medis
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.data || data.data.length === 0 ? (
          <EmptyState title="Belum ada rekam medis" message="Data akan muncul setelah pemeriksaan pasien." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. Rekam Medis</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal Kunjungan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasien</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dokter</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Catatan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium text-primary-700">{m.recordNumber}</td>
                      <td className="px-6 py-4 text-gray-500">{m.visitDate?.split('T')[0]}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{m.patient?.fullName}</td>
                      <td className="px-6 py-4 text-gray-500">{m.doctor?.user?.fullName}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {m._count?.clinicalNotes ?? 0} catatan, {m._count?.diagnoses ?? 0} diagnosa
                      </td>
                      <td className="px-6 py-4">{statusBadge(m.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                            title="Tambah Catatan Klinis"
                            onClick={() => setNoteModal({ open: true, recordId: m.id })}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          {m.status === 'DRAFT' && user?.roles.includes('SUPER_ADMIN') && (
                            <button
                              className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                              title="Finalisasi Rekam Medis"
                              onClick={() => finalizeRecord(m.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="p-2 text-gray-400 hover:text-gray-400 rounded-lg hover:bg-gray-100"
                            title="Lihat Detail"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </div>
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

      {/* Create Medical Record Modal */}
      <Modal
        open={createOpen}
        onClose={resetCreateForm}
        title="Buat Rekam Medis Baru"
        maxWidth="max-w-lg"
      >
        <form onSubmit={submitCreate}>
          <div className="space-y-4">
            <UuidSuggestionField
              label="Pasien"
              placeholder="Cari nama, nomor rekam medis, atau UUID pasien..."
              search={patientSearch}
              selected={selectedPatient}
              options={rankedPatientOptions}
              isLoading={patientsLoading}
              error={patientsError ? 'Gagal memuat daftar pasien.' : undefined}
              onSearch={(value) => { setPatientSearch(value); setSelectedPatient(null); }}
              onSelect={(option) => { setSelectedPatient(option); setPatientSearch(''); }}
            />
            <UuidSuggestionField
              label="Dokter"
              placeholder="Cari nama, spesialisasi, atau UUID dokter..."
              search={doctorSearch}
              selected={selectedDoctor}
              options={doctorOptions}
              isLoading={doctorsLoading}
              error={doctorsError ? 'Gagal memuat daftar dokter.' : undefined}
              onSearch={(value) => { setDoctorSearch(value); setSelectedDoctor(null); }}
              onSelect={(option) => { setSelectedDoctor(option); setDoctorSearch(''); }}
            />
            <UuidSuggestionField
              label="Antrean (opsional)"
              placeholder="Cari kode antrean, nama pasien, atau UUID antrean..."
              search={queueSearch}
              selected={selectedQueue}
              options={rankedQueueOptions}
              isLoading={queuesLoading}
              error={queuesError ? 'Gagal memuat daftar antrean.' : undefined}
              onSearch={(value) => { setQueueSearch(value); setSelectedQueue(null); }}
              onSelect={(option) => { setSelectedQueue(option); setQueueSearch(''); }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="btn-secondary" disabled={saving} onClick={resetCreateForm}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Rekam Medis'}</button>
          </div>
        </form>
      </Modal>

      {/* Clinical Note Modal (SOAP form) */}
      <Modal
        open={noteModal.open}
        onClose={() => setNoteModal({ open: false })}
        title="Tambah Catatan Klinis (SOAP)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitNote}>
          <div className="space-y-4">
            {/* Vital Signs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500">Systolic BP (mmHg)</label>
                <input name="systolicBP" type="number" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Diastolic BP (mmHg)</label>
                <input name="diastolicBP" type="number" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Heart Rate (bpm)</label>
                <input name="heartRate" type="number" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Body Temp (C)</label>
                <input name="bodyTemp" type="number" step="0.1" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Respiratory Rate</label>
                <input name="respiratoryRate" type="number" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Weight (kg)</label>
                <input name="weightKg" type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Height (cm)</label>
                <input name="heightCm" type="number" step="0.1" className="input w-full" />
              </div>
            </div>

            {/* SOAP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjective (Keluhan Pasien)</label>
              <textarea name="subjective" required minLength={3} rows={3} className="input w-full resize-y"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objective (Pemeriksaan Fisik)</label>
              <textarea name="objective" required minLength={3} rows={3} className="input w-full resize-y"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment (Diagnosa)</label>
              <textarea name="assessment" required minLength={3} rows={3} className="input w-full resize-y"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan (Rencana Penanganan)</label>
              <textarea name="plan" required minLength={3} rows={3} className="input w-full resize-y"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Catatan</label>
              <select name="status" className="input w-full">
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setNoteModal({ open: false })}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Catatan'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
