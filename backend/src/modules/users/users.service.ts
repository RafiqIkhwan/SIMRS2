import { prisma } from '../../config/prisma.js';
import { hashPassword } from '../../utils/password.js';
import {
  CreateUserInput,
  UpdateUserInput,
  UserQueryInput,
  ResetPasswordInput,
} from './users.dto.js';

export const usersService = {
  async listUsers(query: UserQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.roles = {
        some: {
          role: {
            name: query.role,
          },
        },
      };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
          doctor: {
            select: {
              id: true,
              licenseNumber: true,
              specialization: true,
            },
          },
        },
      }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        roles: u.roles.map((r) => r.role),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: {
                  select: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        doctor: {
          include: {
            clinic: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      ...user,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
        description: r.role.description,
        permissions: r.role.permissions.map((p) => p.permission),
      })),
    };
  },

  async createUser(input: CreateUserInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.email }],
      },
    });

    if (existing) {
      throw new Error('Username atau Email sudah terdaftar');
    }

    const passwordHash = await hashPassword(input.password);

    // Get role IDs
    const roles = await prisma.role.findMany({
      where: { name: { in: input.roles } },
    });

    return prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        passwordHash,
        roles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async updateUser(id: string, input: UpdateUserInput) {
    return prisma.$transaction(async (tx) => {
      if (input.roles && input.roles.length > 0) {
        // Hapus role lama lalu pasang role baru
        await tx.userRole.deleteMany({ where: { userId: id } });
        const roles = await tx.role.findMany({
          where: { name: { in: input.roles } },
        });
        await tx.userRole.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id })),
        });
      }

      const updateData: any = {};
      if (input.fullName !== undefined) updateData.fullName = input.fullName;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      return tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          updatedAt: true,
        },
      });
    });
  },

  async resetPassword(id: string, input: ResetPasswordInput) {
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },
};
