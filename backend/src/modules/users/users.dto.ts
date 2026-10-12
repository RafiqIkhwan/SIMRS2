import { z } from 'zod';
import { RoleName } from '@prisma/client';

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  fullName: z.string().min(3).max(150),
  phone: z.string().optional(),
  roles: z.array(z.nativeEnum(RoleName)).min(1, 'Minimal satu role harus dipilih'),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(3).max(150).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.nativeEnum(RoleName)).optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export const userQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  role: z.nativeEnum(RoleName).optional(),
isActive: z
  .string()
  .optional()
  .transform((val) =>
    val === undefined ? undefined : val === 'true'
  ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
