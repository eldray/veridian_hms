import { PrismaClient } from '@prisma/client';

import prisma from '../../core/database/prisma.client';
import {
  PAYER_MODES,
  normaliseComponents,
  normaliseTaxConfiguration,
  publicTaxConfiguration,
  invalidateTaxConfigurationCache,
} from '../../utils/tax';

// ==========================================
// HOSPITAL DETAILS SERVICES
// ==========================================

export const getHospitalDetails = async () => {
  // Full record is retained for admin-only NHIS configuration controllers.
  return prisma.hospital.findFirst();
};

export const getHospitalProfileForStaff = async () => {
  // Facility identity and accreditation fields only; never expose banking or NHIS API settings.
  return prisma.hospital.findFirst({
    select: {
      id: true, name: true, address: true, phone: true, email: true, imageUrl: true,
      nhisFacilityCode: true, nhisFacilityType: true, nhisAccreditationNumber: true,
      nhisAccreditationDate: true, nhisAccreditationExpiry: true, nhisContactPerson: true,
      nhisContactPhone: true, nhisContactEmail: true, ghsDistrictCode: true, ghaHFCode: true,
      isActive: true, createdAt: true, updatedAt: true,
    },
  });
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

  if (nhisData.nhisApiClientSecret && nhisData.nhisApiClientSecret.trim()) {
    process.env.NHIS_API_CLIENT_SECRET = nhisData.nhisApiClientSecret.trim();
  }

  const updateData: any = { updatedAt: new Date() };

  if (nhisData.nhisApiBaseUrl !== undefined) updateData.nhisApiBaseUrl = nhisData.nhisApiBaseUrl;
  if (nhisData.nhisApiClientId !== undefined) updateData.nhisApiClientId = nhisData.nhisApiClientId;
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
// ==========================================
// TAX CONFIGURATION SERVICES
// ==========================================

export const getTaxConfiguration = async () => {
  const row = await prisma.taxConfiguration.findUnique({ where: { id: 'default' } });
  return publicTaxConfiguration(normaliseTaxConfiguration(row));
};

export interface TaxConfigurationInput {
  isEnabled?: boolean;
  defaultExempt?: boolean;
  taxId?: string | null;
  payerModes?: string[];
  components?: unknown;
}

export const updateTaxConfiguration = async (data: TaxConfigurationInput, userId?: string) => {
  const isEnabled = data.isEnabled === true;
  const components = normaliseComponents(data.components);

  const seen = new Set<string>();
  for (const component of components) {
    if (seen.has(component.code)) throw new Error(`Duplicate tax component code: ${component.code}`);
    seen.add(component.code);
  }

  if (isEnabled) {
    if (components.length === 0) throw new Error('Add at least one tax component before enabling tax');
    if (!components.some((component) => component.active !== false && component.rate > 0)) {
      throw new Error('At least one active tax component needs a rate above zero');
    }
  }

  const payerModes = Array.isArray(data.payerModes)
    ? data.payerModes
        .map((mode) => String(mode))
        .filter((mode, index, list) => (PAYER_MODES as readonly string[]).includes(mode) && list.indexOf(mode) === index)
    : [];
  if (isEnabled && payerModes.length === 0) {
    throw new Error('Choose at least one payer type that tax applies to');
  }

  const payload = {
    isEnabled,
    defaultExempt: data.defaultExempt !== false,
    taxId: data.taxId ? String(data.taxId).trim().slice(0, 50) : null,
    payerModes: payerModes.length > 0 ? payerModes : ['cash'],
    components,
    updatedById: userId ?? null,
  };

  const row = await prisma.taxConfiguration.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...payload },
    update: payload,
  });

  invalidateTaxConfigurationCache();
  return publicTaxConfiguration(normaliseTaxConfiguration(row));
};
