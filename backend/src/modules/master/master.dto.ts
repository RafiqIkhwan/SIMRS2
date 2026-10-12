import { z } from 'zod';

export const createDepartmentSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
});

export const createClinicSchema = z.object({
  departmentId: z.string().uuid(),
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
});

export const createDoctorSchema = z.object({
  userId: z.string().uuid(),
  clinicId: z.string().uuid(),
  licenseNumber: z.string().min(3).max(50),
  specialization: z.string().min(3).max(100),
});

export const createDoctorScheduleSchema = z.object({
  doctorId: z.string().uuid(),
  clinicId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam HH:MM'),
  quota: z.number().int().min(1).default(30),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateClinicInput = z.infer<typeof createClinicSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type CreateDoctorScheduleInput = z.infer<typeof createDoctorScheduleSchema>;
