import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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