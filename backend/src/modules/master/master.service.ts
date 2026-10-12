import { prisma } from '../../config/prisma.js';
import {
  CreateDepartmentInput,
  CreateClinicInput,
  CreateDoctorInput,
  CreateDoctorScheduleInput,
} from './master.dto.js';

export const masterService = {
  async listDepartments() {
    return prisma.department.findMany({
      include: {
        clinics: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async createDepartment(input: CreateDepartmentInput) {
    return prisma.department.create({
      data: input,
    });
  },

  async listClinics() {
    return prisma.clinic.findMany({
      include: {
        department: true,
        doctors: {
          include: {
            user: {
              select: { fullName: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  async createClinic(input: CreateClinicInput) {
    return prisma.clinic.create({
      data: input,
    });
  },

  async listDoctors() {
    return prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        clinic: {
          include: {
            department: true,
          },
        },
        schedules: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createDoctor(input: CreateDoctorInput) {
    return prisma.doctor.create({
      data: input,
      include: {
        user: {
          select: { fullName: true },
        },
        clinic: true,
      },
    });
  },

  async listSchedules(clinicId?: string, dayOfWeek?: number) {
    const where: any = { isActive: true };
    if (clinicId) where.clinicId = clinicId;
    if (dayOfWeek !== undefined) where.dayOfWeek = dayOfWeek;

    return prisma.doctorSchedule.findMany({
      where,
      include: {
        doctor: {
          include: {
            user: {
              select: { fullName: true },
            },
          },
        },
        clinic: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  },

  async createSchedule(input: CreateDoctorScheduleInput) {
    const existing = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId: input.doctorId,
        dayOfWeek: input.dayOfWeek,
        isActive: true,
        OR: [
          {
            AND: [
              { startTime: { lte: input.startTime } },
              { endTime: { gt: input.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: input.endTime } },
              { endTime: { gte: input.endTime } },
            ],
          },
        ],
      },
    });

    if (existing) {
      throw new Error('Jadwal dokter bentrok dengan jadwal lain yang sudah aktif');
    }

    return prisma.doctorSchedule.create({
      data: input,
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        clinic: true,
      },
    });
  },
};
