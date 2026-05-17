// modules/settings/settings.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// USER MANAGEMENT SERVICES
// ==========================================

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      licenseNumber: true,
      specialization: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return users;
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
    isActive?: boolean;
  }
) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Prepare update data
  const dataToUpdate: any = { updatedAt: new Date() };
  if (updateData.fullName) dataToUpdate.fullName = updateData.fullName;
  if (updateData.email) dataToUpdate.email = updateData.email;
  if (updateData.phone) dataToUpdate.phone = updateData.phone;
  if (updateData.licenseNumber !== undefined) dataToUpdate.licenseNumber = updateData.licenseNumber;
  if (updateData.specialization !== undefined) dataToUpdate.specialization = updateData.specialization;
  if (updateData.role) dataToUpdate.role = updateData.role;
  if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;

  // Validate medical staff requirements
  if (updateData.role && ['doctor', 'nurse', 'midwife'].includes(updateData.role) && !dataToUpdate.licenseNumber) {
    throw new Error(`License number is required for ${updateData.role} role`);
  }

  if (updateData.role === 'doctor' && !dataToUpdate.specialization) {
    throw new Error('Specialization is required for doctor role');
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        licenseNumber: true,
        specialization: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  } catch (error: any) {
    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

export const deactivateUser = async (userId: string) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      updatedAt: new Date()
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      licenseNumber: true,
      specialization: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return user;
};

// ==========================================
// HOSPITAL DETAILS SERVICES
// ==========================================

export const getHospitalDetails = async () => {
  const hospital = await prisma.hospital.findFirst();
  return hospital;
};

export const updateHospitalDetails = async (
  hospitalData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    imageUrl?: string;
  }
) => {
  let hospital = await prisma.hospital.findFirst();

  if (hospital) {
    hospital = await prisma.hospital.update({
      where: { id: hospital.id },
      data: {
        ...hospitalData,
        updatedAt: new Date()
      }
    });
  } else {
    hospital = await prisma.hospital.create({
      data: hospitalData
    });
  }

  return hospital;
};

/**
 * Update hospital details including NHIS API configuration
 */
export const updateHospitalDetailsAndNHISConfig = async (
  hospitalData: {
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
  }
) => {
  let hospital = await prisma.hospital.findFirst();

  const updateData: any = {
    name: hospitalData.name,
    address: hospitalData.address,
    phone: hospitalData.phone,
    email: hospitalData.email,
    imageUrl: hospitalData.imageUrl || null,
    updatedAt: new Date()
  };

  // Add NHIS API fields if provided
  if (hospitalData.nhisApiBaseUrl !== undefined) updateData.nhisApiBaseUrl = hospitalData.nhisApiBaseUrl;
  if (hospitalData.nhisApiClientId !== undefined) updateData.nhisApiClientId = hospitalData.nhisApiClientId;
  if (hospitalData.nhisApiClientSecret !== undefined) updateData.nhisApiClientSecret = hospitalData.nhisApiClientSecret;
  if (hospitalData.nhisApiTokenEndpoint !== undefined) updateData.nhisApiTokenEndpoint = hospitalData.nhisApiTokenEndpoint;
  if (hospitalData.nhisApiEligibilityEndpoint !== undefined) updateData.nhisApiEligibilityEndpoint = hospitalData.nhisApiEligibilityEndpoint;
  if (hospitalData.nhisApiCccEndpoint !== undefined) updateData.nhisApiCccEndpoint = hospitalData.nhisApiCccEndpoint;
  if (hospitalData.nhisApiActive !== undefined) updateData.nhisApiActive = hospitalData.nhisApiActive;

  if (hospital) {
    hospital = await prisma.hospital.update({
      where: { id: hospital.id },
      data: updateData
    });
  } else {
    hospital = await prisma.hospital.create({
      data: updateData
    });
  }

  return hospital;
};
