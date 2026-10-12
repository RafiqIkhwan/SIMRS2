import { PrismaClient, RoleName, Gender, MaritalStatus, BedStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('--- Memulai Seeding Database SIMRS ---');

  // 1. Roles & Permissions Seed
  const roleNames: RoleName[] = [
    RoleName.SUPER_ADMIN,
    RoleName.HOSPITAL_ADMIN,
    RoleName.REGISTRATION_STAFF,
    RoleName.DOCTOR,
    RoleName.NURSE,
    RoleName.PHARMACIST,
    RoleName.LAB_STAFF,
    RoleName.CASHIER,
    RoleName.MEDICAL_RECORD_STAFF,
    RoleName.MANAGEMENT,
  ];

  const roleMap = new Map<RoleName, string>();

  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Peran pengguna untuk ${name.replace(/_/g, ' ')}`,
      },
    });
    roleMap.set(name, role.id);
  }

  // 2. Standard Permissions
  const permissionsData = [
    { code: 'users:manage', description: 'Mengelola akun staf dan role' },
    { code: 'patients:create', description: 'Registrasi pasien baru' },
    { code: 'patients:read', description: 'Melihat data profil pasien' },
    { code: 'patients:update', description: 'Memperbarui data identitas pasien' },
    { code: 'queues:manage', description: 'Mengelola nomor antrean pendaftaran' },
    { code: 'emr:write', description: 'Mencatat rekam medis dan SOAP' },
    { code: 'emr:finalize', description: 'Memfinalisasi rekam medis' },
    { code: 'pharmacy:dispense', description: 'Memproses dan menyerahkan resep obat' },
    { code: 'pharmacy:inventory', description: 'Mengelola stok dan batch obat' },
    { code: 'lab:order', description: 'Membuat permintaan uji laboratorium' },
    { code: 'lab:validate', description: 'Memvalidasi hasil uji laboratorium' },
    { code: 'inpatient:manage', description: 'Mengelola tempat tidur dan rawat inap' },
    { code: 'billing:create', description: 'Menerbitkan tagihan dan kasir' },
    { code: 'reports:view', description: 'Melihat laporan dan statistik operasional' },
    { code: 'audit:view', description: 'Melihat riwayat aktivitas audit log' },
  ];

  const permMap = new Map<string, string>();
  for (const perm of permissionsData) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
    permMap.set(perm.code, p.id);
  }

  // Role -> Permissions mapping
  const rolePerms: Record<RoleName, string[]> = {
    SUPER_ADMIN: permissionsData.map((p) => p.code),
    HOSPITAL_ADMIN: [
      'users:manage',
      'patients:create',
      'patients:read',
      'patients:update',
      'queues:manage',
      'reports:view',
      'audit:view',
    ],
    REGISTRATION_STAFF: [
      'patients:create',
      'patients:read',
      'patients:update',
      'queues:manage',
    ],
    DOCTOR: [
      'patients:read',
      'emr:write',
      'emr:finalize',
      'lab:order',
      'pharmacy:dispense',
    ],
    NURSE: [
      'patients:read',
      'emr:write',
      'queues:manage',
      'pharmacy:dispense',
      'lab:order',
    ],
    PHARMACIST: [
      'patients:read',
      'pharmacy:dispense',
      'pharmacy:inventory',
    ],
    LAB_STAFF: [
      'patients:read',
      'lab:order',
      'lab:validate',
    ],
    CASHIER: [
      'patients:read',
      'billing:create',
      'reports:view',
    ],
    MEDICAL_RECORD_STAFF: [
      'patients:read',
      'reports:view',
    ],
    MANAGEMENT: [
      'reports:view',
      'audit:view',
    ],
  };

  for (const [roleName, permCodes] of Object.entries(rolePerms)) {
    const roleId = roleMap.get(roleName as RoleName);
    if (!roleId) continue;
    for (const code of permCodes) {
      const permId = permMap.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: permId },
          },
          update: {},
          create: { roleId, permissionId: permId },
        });
      }
    }
  }

  // 3. Departments & Clinics
  const deptMedis = await prisma.department.upsert({
    where: { code: 'DEPT-MEDIS' },
    update: {},
    create: {
      code: 'DEPT-MEDIS',
      name: 'Pelayanan Medis Rawat Jalan',
    },
  });

  const deptInpatient = await prisma.department.upsert({
    where: { code: 'DEPT-INPATIENT' },
    update: {},
    create: {
      code: 'DEPT-INPATIENT',
      name: 'Pelayanan Rawat Inap',
    },
  });

  const clinicUmum = await prisma.clinic.upsert({
    where: { code: 'POLI-UMUM' },
    update: {},
    create: {
      departmentId: deptMedis.id,
      code: 'POLI-UMUM',
      name: 'Poliklinik Umum',
    },
  });

  const clinicGigi = await prisma.clinic.upsert({
    where: { code: 'POLI-GIGI' },
    update: {},
    create: {
      departmentId: deptMedis.id,
      code: 'POLI-GIGI',
      name: 'Poliklinik Gigi & Mulut',
    },
  });

  // 4. Default Accounts (Semua password default: SimrsAdmin2026!)
  const defaultPasswordHash = await bcrypt.hash('SimrsAdmin2026!', SALT_ROUNDS);

  const staffAccounts = [
    {
      username: 'superadmin',
      email: 'superadmin@simrs-dev.internal',
      fullName: 'Super Administrator Utama',
      role: RoleName.SUPER_ADMIN,
    },
    {
      username: 'adminrs',
      email: 'adminrs@simrs-dev.internal',
      fullName: 'Administrator Rumah Sakit',
      role: RoleName.HOSPITAL_ADMIN,
    },
    {
      username: 'petugas.pendaftaran',
      email: 'pendaftaran@simrs-dev.internal',
      fullName: 'Rina Kartika (Pendaftaran)',
      role: RoleName.REGISTRATION_STAFF,
    },
    {
      username: 'dr.budi',
      email: 'dr.budi@simrs-dev.internal',
      fullName: 'dr. Budi Santoso, Sp.PD',
      role: RoleName.DOCTOR,
    },
    {
      username: 'perawat.siti',
      email: 'perawat.siti@simrs-dev.internal',
      fullName: 'Ns. Siti Rahayu, S.Kep',
      role: RoleName.NURSE,
    },
    {
      username: 'apoteker.ani',
      email: 'apoteker.ani@simrs-dev.internal',
      fullName: 'Apt. Ani Marlina, S.Farm',
      role: RoleName.PHARMACIST,
    },
    {
      username: 'petugas.lab',
      email: 'lab@simrs-dev.internal',
      fullName: 'Hendra Wijaya, A.Md.AK',
      role: RoleName.LAB_STAFF,
    },
    {
      username: 'kasir.dewi',
      email: 'kasir.dewi@simrs-dev.internal',
      fullName: 'Dewi Anggraini (Kasir)',
      role: RoleName.CASHIER,
    },
    {
      username: 'petugas.rm',
      email: 'rekammedis@simrs-dev.internal',
      fullName: 'Farhan Maulana, A.Md.RMIK',
      role: RoleName.MEDICAL_RECORD_STAFF,
    },
    {
      username: 'manajemen.rs',
      email: 'direksi@simrs-dev.internal',
      fullName: 'dr. Irwan Setiawan, M.M. (Direktur)',
      role: RoleName.MANAGEMENT,
    },
  ];

  let doctorUserId = '';

  for (const staff of staffAccounts) {
    const user = await prisma.user.upsert({
      where: { username: staff.username },
      update: {},
      create: {
        username: staff.username,
        email: staff.email,
        fullName: staff.fullName,
        passwordHash: defaultPasswordHash,
        roles: {
          create: [{ roleId: roleMap.get(staff.role)! }],
        },
      },
    });

    if (staff.role === RoleName.DOCTOR) {
      doctorUserId = user.id;
    }
  }

  // 5. Doctor Profile & Schedule
  if (doctorUserId) {
    const doctorProfile = await prisma.doctor.upsert({
      where: { userId: doctorUserId },
      update: {},
      create: {
        userId: doctorUserId,
        clinicId: clinicUmum.id,
        licenseNumber: 'SIP-503/001/DINKES/2026',
        specialization: 'Dokter Spesialis Penyakit Dalam',
      },
    });

    // Buat jadwal Senin & Rabu
    await prisma.doctorSchedule.upsert({
      where: {
        doctorId_clinicId_dayOfWeek_startTime: {
          doctorId: doctorProfile.id,
          clinicId: clinicUmum.id,
          dayOfWeek: 1, // Senin
          startTime: '08:00',
        },
      },
      update: {},
      create: {
        doctorId: doctorProfile.id,
        clinicId: clinicUmum.id,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '12:00',
        quota: 30,
      },
    });
  }

  // 6. Test Synthetic Patients (Data Fiktif Pengujian)
  const syntheticPatients = [
    {
      medicalRecordNumber: 'RM-202610-0001',
      nationalIdNumber: '3201010101900001',
      fullName: 'Pasien Uji Satu (Fiktif)',
      gender: Gender.MALE,
      birthDate: new Date('1990-01-01'),
      birthPlace: 'Jakarta',
      bloodType: 'O',
      maritalStatus: MaritalStatus.MARRIED,
      address: 'Jl. Uji Klinis No. 12, Kel. Sehat',
      city: 'Jakarta Selatan',
      phone: '081234567801',
      allergies: 'Penisilin, Seafood',
    },
    {
      medicalRecordNumber: 'RM-202610-0002',
      nationalIdNumber: '3201010202950002',
      fullName: 'Pasien Uji Dua (Fiktif)',
      gender: Gender.FEMALE,
      birthDate: new Date('1995-02-02'),
      birthPlace: 'Bandung',
      bloodType: 'B',
      maritalStatus: MaritalStatus.SINGLE,
      address: 'Jl. Simulasi Medis Blok B No. 4',
      city: 'Jakarta Timur',
      phone: '081234567802',
      allergies: 'Tidak ada riwayat alergi',
    },
  ];

  for (const patient of syntheticPatients) {
    await prisma.patient.upsert({
      where: { medicalRecordNumber: patient.medicalRecordNumber },
      update: {},
      create: patient,
    });
  }

  // 7. Wards & Beds
  const wardMawar = await prisma.ward.upsert({
    where: { code: 'BANGSAL-MAWAR' },
    update: {},
    create: {
      code: 'BANGSAL-MAWAR',
      name: 'Bangsal Rawat Inap Mawar',
      classTier: 'Kelas 1',
    },
  });

  const roomMawar101 = await prisma.room.upsert({
    where: {
      wardId_roomNumber: {
        wardId: wardMawar.id,
        roomNumber: '101',
      },
    },
    update: {},
    create: {
      wardId: wardMawar.id,
      roomNumber: '101',
    },
  });

  await prisma.bed.upsert({
    where: {
      roomId_bedNumber: {
        roomId: roomMawar101.id,
        bedNumber: 'A',
      },
    },
    update: {},
    create: {
      roomId: roomMawar101.id,
      bedNumber: 'A',
      dailyRate: 350000,
      status: BedStatus.AVAILABLE,
    },
  });

  // 8. Medications Master & Batch
  const paracetamol = await prisma.medication.upsert({
    where: { code: 'OBAT-PCT-500' },
    update: {},
    create: {
      code: 'OBAT-PCT-500',
      name: 'Paracetamol 500mg',
      category: 'Analgesik & Antipiretik',
      dosageForm: 'Tablet',
      unit: 'Strip',
      minStock: 20,
      currentStock: 100,
      pricePerUnit: 12500,
    },
  });

  await prisma.medicationBatch.upsert({
    where: {
      medicationId_batchNumber: {
        medicationId: paracetamol.id,
        batchNumber: 'BATCH-PCT-2026A',
      },
    },
    update: {},
    create: {
      medicationId: paracetamol.id,
      batchNumber: 'BATCH-PCT-2026A',
      expiryDate: new Date('2028-12-31'),
      initialQty: 100,
      currentQty: 100,
      purchasePrice: 9000,
    },
  });

  // 9. Master Lab Tests
  await prisma.labTestType.upsert({
    where: { code: 'LAB-DRH-LGKP' },
    update: {},
    create: {
      code: 'LAB-DRH-LGKP',
      name: 'Darah Lengkap (Hematologi Rutin)',
      category: 'Hematologi',
      refRange: 'Hb: 13.5-17.5 g/dL, Leukosit: 4.5-11.0 10^3/uL',
      unit: 'Panel',
      price: 150000,
    },
  });

  console.log('--- Seeding Selesai Berhasil ---');
  console.log('Semua akun pengujian memiliki password: SimrsAdmin2026!');
}

main()
  .catch((e) => {
    console.error('Error saat seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
