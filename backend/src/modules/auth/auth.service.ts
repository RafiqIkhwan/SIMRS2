import { prisma } from '../../config/prisma.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { LoginInput, ChangePasswordInput } from './auth.dto.js';

export const authService = {
  async authenticateUser(input: LoginInput) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.username },
        ],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        doctor: true,
      },
    });

    if (!user) {
      return null;
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    if (!user.isActive) {
      return { inactive: true, user: null };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roleNames = user.roles.map((r) => r.role.name as string);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission.code)
        )
      )
    );

    return {
      inactive: false,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: roleNames,
        permissions,
        doctorId: user.doctor?.id,
      },
    };
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const isValid = await comparePassword(input.oldPassword, user.passwordHash);
    if (!isValid) {
      return false;
    }

    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return true;
  },
};
