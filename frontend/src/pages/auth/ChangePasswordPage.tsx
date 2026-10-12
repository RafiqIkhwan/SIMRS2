import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { authApi } from '../../services/auth';
import { useToast } from '../../hooks/useToast';

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Kata sandi lama wajib diisi'),
    newPassword: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });

type Form = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authApi.changePassword(data.oldPassword, data.newPassword);
      toast('success', 'Kata sandi berhasil diperbarui');
      navigate('/');
    } catch (err: any) {
      toast(
        'error',
        err.response?.data?.error?.message || 'Gagal memperbarui kata sandi'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Ubah Kata Sandi</h1>
              <p className="text-sm text-gray-500">Perbarui kata sandi akun Anda.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Kata Sandi Lama</label>
              <input type="password" {...register('oldPassword')} className="input" />
              {errors.oldPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.oldPassword.message}</p>
              )}
            </div>
            <div>
              <label className="label">Kata Sandi Baru</label>
              <input type="password" {...register('newPassword')} className="input" />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="label">Konfirmasi Kata Sandi Baru</label>
              <input type="password" {...register('confirmPassword')} className="input" />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary flex-1"
              >
                <ArrowLeft className="h-4 w-4" /> Kembali
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Memproses...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
