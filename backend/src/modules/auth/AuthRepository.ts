import { PrismaClient } from '@prisma/client';

export class AuthRepository {
  private prisma: PrismaClient;

  // ✅ DRY: Centralized selection fields
  private userSelect = {
    id: true,
    username: true,
    password: true,
    fullName: true,
    role: true,
    seniority: true,
    email: true,
    phone: true,
    imageUrl: true, // ✅ NEW: Profile image
    licenseNumber: true,
    specialization: true,
    departmentId: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    department: { select: { id: true, name: true } },
    // ✅ NEW: Fetch Dynamic RBAC Permissions
    roles: {
      include: {
        permissions: {
          select: { permission: { select: { name: true } } }
        }
      }
    }
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ✅ Helper to flatten nested permissions into a simple string array
  public mapUserPermissions(user: any): string[] {
    if (!user.roles) return [];
    const perms = new Set<string>();
    user.roles.forEach((role: any) => {
      role.permissions.forEach((rp: any) => {
        perms.add(rp.permission.name);
      });
    });
    return Array.from(perms);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: this.userSelect,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
  }

  async createUser(data: any) {
    return this.prisma.user.create({
      data: {
        username: data.username,
        password: data.passwordHash,
        fullName: data.fullName,
        role: data.role,
        seniority: data.seniority || 'JUNIOR',
        email: data.email,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        specialization: data.specialization,
        departmentId: data.departmentId,
        isActive: true,
      },
      select: this.userSelect,
    });
  }

  async updateUser(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.userSelect,
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
      update: { token: refreshToken, expiresAt },
      create: { userId, token: refreshToken, expiresAt },
    });
  }

  async validateRefreshToken(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { isActive: true } } },
    });
    if (!tokenRecord) return { userId: '', valid: false };
    return { userId: tokenRecord.userId, valid: tokenRecord.expiresAt > new Date() && tokenRecord.user.isActive };
  }

  async deleteRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
  }

  async usernameExists(username: string): Promise<boolean> {
    return !!(await this.prisma.user.findUnique({ where: { username } }));
  }
}