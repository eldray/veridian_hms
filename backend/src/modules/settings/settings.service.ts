// modules/settings/settings.service.ts
import { PrismaClient, Seniority } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==========================================
// USER MANAGEMENT SERVICES
// ==========================================

export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      licenseNumber: true,
      specialization: true,
      role: true,
      seniority: true,
      isActive: true,
      departmentId: true,
      department: {
        select: { id: true, name: true },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateUser = async (
  userId: string,
  updateData: {
    fullName?: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
    role?: string;
    seniority?: Seniority;
    isActive?: boolean;
    departmentId?: string;
  }
) => {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) throw new Error('User not found');

  const dataToUpdate: any = { updatedAt: new Date() };

  if (updateData.fullName !== undefined)              dataToUpdate.fullName = updateData.fullName;
  if (updateData.email !== undefined)                 dataToUpdate.email = updateData.email;
  if (updateData.phone !== undefined)                 dataToUpdate.phone = updateData.phone;
  if (updateData.licenseNumber !== undefined)         dataToUpdate.licenseNumber = updateData.licenseNumber;
  if (updateData.specialization !== undefined)        dataToUpdate.specialization = updateData.specialization;
  if (updateData.role !== undefined)                  dataToUpdate.role = updateData.role;
  if (updateData.seniority !== undefined)             dataToUpdate.seniority = updateData.seniority;
  if (updateData.isActive !== undefined)              dataToUpdate.isActive = updateData.isActive;
  if (updateData.departmentId !== undefined)          dataToUpdate.departmentId = updateData.departmentId || null;

  // Validate medical staff requirements
  const roleBeingSet = updateData.role || existingUser.role;
  const licenseBeingSet = updateData.licenseNumber ?? existingUser.licenseNumber;
  const specializationBeingSet = updateData.specialization ?? existingUser.specialization;

  if (
    ['doctor', 'nurse', 'midwife'].includes(roleBeingSet) &&
    !licenseBeingSet
  ) {
    throw new Error(`License number is required for ${roleBeingSet} role`);
  }

  if (roleBeingSet === 'doctor' && !specializationBeingSet) {
    throw new Error('Specialization is required for doctor role');
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        licenseNumber: true,
        specialization: true,
        role: true,
        seniority: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error: any) {
    if (error.code === 'P2002') throw new Error('Email already exists');
    throw error;
  }
};

// ==========================================
// TOKEN REFRESH SERVICE - NEW
// ==========================================

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export const refreshUserTokens = async (userId: string): Promise<TokenRefreshResult> => {
  // Get the updated user from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      seniority: true,
      email: true,
      phone: true,
      licenseNumber: true,
      specialization: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Delete old refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id }
  });

  // Generate new access token with updated seniority
  const accessToken = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      seniority: user.seniority,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Store the new refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user,
  };
};

export const deactivateUser = async (userId: string) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error('User not found');

  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false, updatedAt: new Date() },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      seniority: true,
      isActive: true,
      updatedAt: true,
    },
  });
};

// ==========================================
// HOSPITAL DETAILS SERVICES
// ==========================================

export const getHospitalDetails = async () => {
  return prisma.hospital.findFirst();
};

export const updateHospitalDetails = async (hospitalData: {
  name: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
}) => {
  let hospital = await prisma.hospital.findFirst();

  if (hospital) {
    return prisma.hospital.update({
      where: { id: hospital.id },
      data: { ...hospitalData, updatedAt: new Date() },
    });
  }

  return prisma.hospital.create({
    data: {
      ...hospitalData,
      nhisFacilityCode: 'PENDING',
    },
  });
};

export const updateHospitalDetailsAndNHISConfig = async (hospitalData: {
  name: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  nhisApiBaseUrl?: string | null;
  nhisApiClientId?: string | null;
  nhisApiClientSecret?: string | null;
  nhisApiTokenEndpoint?: string | null;
  nhisApiEligibilityEndpoint?: string | null;
  nhisApiCccEndpoint?: string | null;
  nhisApiActive?: boolean;
}) => {
  const hospital = await prisma.hospital.findFirst();

  const updateData: any = {
    name: hospitalData.name,
    address: hospitalData.address,
    phone: hospitalData.phone,
    email: hospitalData.email,
    imageUrl: hospitalData.imageUrl || null,
    updatedAt: new Date(),
  };

  if (hospitalData.nhisApiBaseUrl !== undefined)
    updateData.nhisApiBaseUrl = hospitalData.nhisApiBaseUrl;
  if (hospitalData.nhisApiClientId !== undefined)
    updateData.nhisApiClientId = hospitalData.nhisApiClientId;
  if (hospitalData.nhisApiClientSecret !== undefined)
    updateData.nhisApiClientSecret = hospitalData.nhisApiClientSecret;
  if (hospitalData.nhisApiTokenEndpoint !== undefined)
    updateData.nhisApiTokenEndpoint = hospitalData.nhisApiTokenEndpoint;
  if (hospitalData.nhisApiEligibilityEndpoint !== undefined)
    updateData.nhisApiEligibilityEndpoint = hospitalData.nhisApiEligibilityEndpoint;
  if (hospitalData.nhisApiCccEndpoint !== undefined)
    updateData.nhisApiCccEndpoint = hospitalData.nhisApiCccEndpoint;
  if (hospitalData.nhisApiActive !== undefined)
    updateData.nhisApiActive = hospitalData.nhisApiActive;

  if (hospital) {
    return prisma.hospital.update({ where: { id: hospital.id }, data: updateData });
  }

  return prisma.hospital.create({
    data: { ...updateData, nhisFacilityCode: 'PENDING' },
  });
};

export const updateNHISSettings = async (nhisData: {
  nhisApiBaseUrl?: string | null;
  nhisApiClientId?: string | null;
  nhisApiClientSecret?: string | null;
  nhisApiTokenEndpoint?: string | null;
  nhisApiEligibilityEndpoint?: string | null;
  nhisApiCccEndpoint?: string | null;
  nhisApiActive?: boolean;
  nhisFacilityCode?: string;
  nhisFacilityType?: string;
  nhisAccreditationNumber?: string;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
}) => {
  const hospital = await prisma.hospital.findFirst();
  if (!hospital) throw new Error('Hospital configuration not found');

  const updateData: any = { updatedAt: new Date() };

  if (nhisData.nhisApiBaseUrl !== undefined) updateData.nhisApiBaseUrl = nhisData.nhisApiBaseUrl;
  if (nhisData.nhisApiClientId !== undefined) updateData.nhisApiClientId = nhisData.nhisApiClientId;
  if (nhisData.nhisApiClientSecret !== undefined) updateData.nhisApiClientSecret = nhisData.nhisApiClientSecret;
  if (nhisData.nhisApiTokenEndpoint !== undefined) updateData.nhisApiTokenEndpoint = nhisData.nhisApiTokenEndpoint;
  if (nhisData.nhisApiEligibilityEndpoint !== undefined) updateData.nhisApiEligibilityEndpoint = nhisData.nhisApiEligibilityEndpoint;
  if (nhisData.nhisApiCccEndpoint !== undefined) updateData.nhisApiCccEndpoint = nhisData.nhisApiCccEndpoint;
  if (nhisData.nhisApiActive !== undefined) updateData.nhisApiActive = nhisData.nhisApiActive;

  if (nhisData.nhisFacilityCode) updateData.nhisFacilityCode = nhisData.nhisFacilityCode;
  if (nhisData.nhisFacilityType) updateData.nhisFacilityType = nhisData.nhisFacilityType;
  if (nhisData.nhisAccreditationNumber) updateData.nhisAccreditationNumber = nhisData.nhisAccreditationNumber;
  if (nhisData.nhisContactPerson) updateData.nhisContactPerson = nhisData.nhisContactPerson;
  if (nhisData.nhisContactPhone) updateData.nhisContactPhone = nhisData.nhisContactPhone;
  if (nhisData.nhisContactEmail) updateData.nhisContactEmail = nhisData.nhisContactEmail;

  return prisma.hospital.update({ where: { id: hospital.id }, data: updateData });
};