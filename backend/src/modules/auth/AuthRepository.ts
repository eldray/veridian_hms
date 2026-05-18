// modules/auth/AuthRepository.ts
import { PrismaClient } from '@prisma/client';

export class AuthRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async createUser(data: { username: string; passwordHash: string; fullName: string; role: string; email?: string; phone?: string; licenseNumber?: string; specialization?: string; departmentId?: string }) {
    return this.prisma.user.create({
      data: {
        username: data.username,
        password: data.passwordHash,
        fullName: data.fullName,
        role: data.role as any,
        email: data.email,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        specialization: data.specialization,
        departmentId: data.departmentId,
        isActive: true,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });
  }

  async storeRefreshToken(userId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.upsert({
      where: { userId },
      update: {
        token: refreshToken,
        expiresAt,
      },
      create: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
  }

  async validateRefreshToken(refreshToken: string): Promise<{ userId: string; valid: boolean }> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      return { userId: '', valid: false };
    }

    const isValid = tokenRecord.expiresAt > new Date() && tokenRecord.user.isActive;

    return {
      userId: tokenRecord.userId,
      valid: isValid,
    };
  }

  async deleteRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token: refreshToken },
    }).catch(() => {
      // Token might not exist, ignore error
    });
  }

  async changePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash },
    });
  }

  async usernameExists(username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    return !!user;
  }
}