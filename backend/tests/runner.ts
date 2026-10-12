import assert from 'node:assert/strict';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { loginSchema, changePasswordSchema } from '../src/modules/auth/auth.dto.js';
import { createPatientSchema } from '../src/modules/patients/patients.dto.js';
import { createUserSchema } from '../src/modules/users/users.dto.js';
import { RoleName } from '@prisma/client';

async function runTests() {
  console.log('--- Menjalankan Backend Unit & Logic Tests ---');

  // Test 1: Password Hash & Compare
  {
    const plain = 'SimrsSecretPassword2026!';
    const hashed = await hashPassword(plain);
    assert.notEqual(plain, hashed, 'Password hash tidak boleh sama dengan plain text');
    const valid = await comparePassword(plain, hashed);
    assert.equal(valid, true, 'Password yang benar harus menghasilkan true');
    const invalid = await comparePassword('WrongPassword', hashed);
    assert.equal(invalid, false, 'Password yang salah harus menghasilkan false');
    console.log('✓ Test 1: Password Hashing & Verification lolos');
  }

  // Test 2: Login Input Validation (Zod)
  {
    const validLogin = loginSchema.safeParse({
      username: 'superadmin',
      password: 'password123',
    });
    assert.equal(validLogin.success, true, 'Input login valid harus diterima');

    const invalidShortUser = loginSchema.safeParse({
      username: 'ab',
      password: 'password123',
    });
    assert.equal(invalidShortUser.success, false, 'Username < 3 karakter harus ditolak');

    const invalidShortPass = loginSchema.safeParse({
      username: 'superadmin',
      password: '123',
    });
    assert.equal(invalidShortPass.success, false, 'Password < 6 karakter harus ditolak');
    console.log('✓ Test 2: Login Zod Validation lolos');
  }

  // Test 3: Change Password Validation
  {
    const validChange = changePasswordSchema.safeParse({
      oldPassword: 'oldpassword',
      newPassword: 'newsecurepassword',
    });
    assert.equal(validChange.success, true);

    const invalidChange = changePasswordSchema.safeParse({
      oldPassword: 'oldpassword',
      newPassword: 'short',
    });
    assert.equal(invalidChange.success, false, 'Password baru < 8 karakter harus ditolak');
    console.log('✓ Test 3: Change Password Zod Validation lolos');
  }

  // Test 4: Patient Registration Validation (16 Digit NIK check)
  {
    const validPatient = createPatientSchema.safeParse({
      nationalIdNumber: '3201010101900001',
      fullName: 'Ahmad Dahlan',
      gender: 'MALE',
      birthDate: '1990-05-15',
      address: 'Jl. Merdeka No. 45',
      city: 'Jakarta',
      phone: '081298765432',
    });
    assert.equal(validPatient.success, true, 'Data pasien valid harus lolos');

    const invalidNikLength = createPatientSchema.safeParse({
      nationalIdNumber: '12345', // kurang dari 16 digit
      fullName: 'Ahmad Dahlan',
      gender: 'MALE',
      birthDate: '1990-05-15',
      address: 'Jl. Merdeka No. 45',
      city: 'Jakarta',
      phone: '081298765432',
    });
    assert.equal(invalidNikLength.success, false, 'NIK bukan 16 digit harus ditolak');

    const invalidNikNonDigit = createPatientSchema.safeParse({
      nationalIdNumber: '320101010190000X', // ada huruf
      fullName: 'Ahmad Dahlan',
      gender: 'MALE',
      birthDate: '1990-05-15',
      address: 'Jl. Merdeka No. 45',
      city: 'Jakarta',
      phone: '081298765432',
    });
    assert.equal(invalidNikNonDigit.success, false, 'NIK berhuruf harus ditolak');
    console.log('✓ Test 4: NIK 16-Digit Strict Validation lolos');
  }

  // Test 5: RBAC Role Enum Validation
  {
    const validUser = createUserSchema.safeParse({
      username: 'dokter.ahmad',
      email: 'ahmad@simrs.id',
      password: 'passwordAman123',
      fullName: 'dr. Ahmad Sp.A',
      roles: [RoleName.DOCTOR],
    });
    assert.equal(validUser.success, true, 'Role DOCTOR valid harus diterima');

    const invalidRole = createUserSchema.safeParse({
      username: 'dokter.ahmad',
      email: 'ahmad@simrs.id',
      password: 'passwordAman123',
      fullName: 'dr. Ahmad Sp.A',
      roles: ['HACKER_ROLE' as any],
    });
    assert.equal(invalidRole.success, false, 'Role di luar RoleName enum harus ditolak');
    console.log('✓ Test 5: RBAC Role Enum Strictness lolos');
  }

  console.log('--- Semua 5 Suite Test Berhasil 100% ---');
}

runTests().catch((err) => {
  console.error('Test gagal:', err);
  process.exit(1);
});
