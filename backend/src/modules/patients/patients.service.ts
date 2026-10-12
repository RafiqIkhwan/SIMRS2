import { prisma } from '../../config/prisma.js';
import {
  CreatePatientInput,
  UpdatePatientInput,
  PatientQueryInput,
} from './patients.dto.js';

export const patientsService = {
  async generateMedicalRecordNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `RM-${yearMonth}-`;

    const lastPatient = await prisma.patient.findFirst({
      where: {
        medicalRecordNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        medicalRecordNumber: 'desc',
      },
      select: {
        medicalRecordNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastPatient) {
      const parts = lastPatient.medicalRecordNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  },

  async listPatients(query: PatientQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { medicalRecordNumber: { contains: query.search, mode: 'insensitive' } },
        { nationalIdNumber: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          medicalRecordNumber: true,
          nationalIdNumber: true,
          fullName: true,
          gender: true,
          birthDate: true,
          phone: true,
          city: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      patients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getPatientById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        emergencyContacts: true,
        queues: {
          take: 5,
          orderBy: { queueDate: 'desc' },
          include: {
            clinic: true,
            doctor: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
        medicalRecords: {
          take: 5,
          orderBy: { visitDate: 'desc' },
          select: {
            id: true,
            recordNumber: true,
            visitDate: true,
            status: true,
            doctor: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
    });
  },

  async createPatient(input: CreatePatientInput) {
    const existingNik = await prisma.patient.findUnique({
      where: { nationalIdNumber: input.nationalIdNumber },
    });

    if (existingNik) {
      throw new Error('Pasien dengan NIK tersebut sudah terdaftar');
    }

    const mrNumber = await this.generateMedicalRecordNumber();

    const { emergencyContact, ...patientData } = input;

    return prisma.patient.create({
      data: {
        ...patientData,
        birthDate: new Date(patientData.birthDate),
        medicalRecordNumber: mrNumber,
        emergencyContacts: emergencyContact
          ? {
              create: [emergencyContact],
            }
          : undefined,
      },
    });
  },

  async updatePatient(id: string, input: UpdatePatientInput) {
    return prisma.patient.update({
      where: { id },
      data: input,
    });
  },
};
