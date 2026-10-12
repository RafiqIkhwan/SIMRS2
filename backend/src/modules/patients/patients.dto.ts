import { z } from 'zod';
import { Gender, MaritalStatus } from '@prisma/client';

export const createPatientSchema = z.object({
  nationalIdNumber: z
    .string()
    .length(16, 'NIK harus tepat 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka'),
  fullName: z.string().min(3).max(150),
  gender: z.nativeEnum(Gender),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  birthPlace: z.string().max(100).optional(),
  bloodType: z.string().max(5).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  address: z.string().min(5),
  city: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  allergies: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string().min(3),
      relationship: z.string().min(2),
      phone: z.string().min(8),
      address: z.string().optional(),
    })
    .optional(),
});

export const updatePatientSchema = z.object({
  fullName: z.string().min(3).max(150).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  allergies: z.string().optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  isActive: z.boolean().optional(),
});

export const patientQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
