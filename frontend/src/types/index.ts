export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: Role[];
  doctor?: DoctorProfile;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  doctorId?: string;
}

export interface LoginResponse {
  user: AuthUser;
  csrfToken: string;
}

export interface DoctorProfile {
  id: string;
  licenseNumber: string;
  specialization: string;
  clinic?: Clinic;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  clinics?: Clinic[];
}

export interface Clinic {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  department?: Department;
}

export interface Doctor {
  id: string;
  userId: string;
  clinicId: string;
  licenseNumber: string;
  specialization: string;
  user: { fullName: string; email?: string; phone?: string; isActive?: boolean };
  clinic: Clinic;
  schedules?: DoctorSchedule[];
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  clinicId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  quota: number;
  isActive: boolean;
  doctor?: Doctor;
  clinic?: Clinic;
}

export interface Patient {
  id: string;
  medicalRecordNumber: string;
  nationalIdNumber: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthPlace?: string;
  bloodType?: string;
  maritalStatus?: string;
  address: string;
  city: string;
  phone: string;
  allergies?: string;
  isActive: boolean;
  createdAt: string;
  emergencyContacts?: EmergencyContact[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  address?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { username: string; fullName: string };
}
