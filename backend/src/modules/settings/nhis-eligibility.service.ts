// modules/settings/nhis-eligibility.service.ts
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

import prisma from '../../core/database/prisma.client';

// ==========================================
// NHIS API INTERFACES
// ==========================================

interface NHISApiConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  eligibilityEndpoint: string;
  cccEndpoint: string;
}

interface NHISTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface NHISEligibilityResponse {
  success: boolean;
  message?: string;
  data?: {
    policyNumber: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    isActive: boolean;
    expiryDate?: string;
    schemeType?: string;
    lastRenewalDate?: string;
    facilityLevel?: string;
    isEligible: boolean;
    reason?: string;
  };
}

interface NHISCCCResponse {
  success: boolean;
  message?: string;
  data?: {
    cccCode: string;
    policyNumber: string;
    generatedAt: string;
    validUntil?: string;
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get NHIS API configuration from hospital settings
 */
const getNHISApiConfig = async (): Promise<NHISApiConfig | null> => {
  const hospital = await prisma.hospital.findFirst({
    where: { nhisApiActive: true },
  });

  if (
    !hospital ||
    !hospital.nhisApiBaseUrl ||
    !hospital.nhisApiClientId ||
    !process.env.NHIS_API_CLIENT_SECRET
  ) {
    return null;
  }

  return {
    baseUrl: hospital.nhisApiBaseUrl,
    clientId: hospital.nhisApiClientId,
    clientSecret: process.env.NHIS_API_CLIENT_SECRET as string,
    tokenEndpoint:
      hospital.nhisApiTokenEndpoint ||
      `${hospital.nhisApiBaseUrl}/oauth/token`,
    eligibilityEndpoint:
      hospital.nhisApiEligibilityEndpoint ||
      `${hospital.nhisApiBaseUrl}/api/v1/eligibility`,
    cccEndpoint:
      hospital.nhisApiCccEndpoint ||
      `${hospital.nhisApiBaseUrl}/api/v1/ccc/generate`,
  };
};

/**
 * Get or refresh NHIS API access token with caching
 */
// The access token is deliberately NOT stored in the database (see schema.prisma), so it is
// cached here in memory. Only its expiry time is saved on the hospital record.
let cachedNhisToken: { token: string; expiresAt: Date } | null = null;

/** True when a token is cached and still valid (used by the settings status screen). */
export const hasValidNHISToken = (): boolean => !!cachedNhisToken && cachedNhisToken.expiresAt > new Date();

export const getNHISAccessToken = async (): Promise<string | null> => {
  const hospital = await prisma.hospital.findFirst({
    where: { nhisApiActive: true },
  });

  if (!hospital) return null;

  // Return cached token if still valid (with 5-minute buffer)
  const now = new Date();
  if (cachedNhisToken) {
    const expiryWithBuffer = new Date(cachedNhisToken.expiresAt.getTime() - 5 * 60 * 1000);
    if (now < expiryWithBuffer) {
      return cachedNhisToken.token;
    }
  }

  const config = await getNHISApiConfig();
  if (!config) return null;

  try {
    const response = await axios.post<NHISTokenResponse>(
      config.tokenEndpoint,
      {
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const { access_token, expires_in } = response.data;
    const expiresAt = new Date(now.getTime() + expires_in * 1000);

    cachedNhisToken = { token: access_token, expiresAt };

    await prisma.hospital.updateMany({
      where: { nhisApiActive: true },
      data: {
        nhisApiTokenExpiresAt: expiresAt,
        nhisApiLastTokenRefresh: now,
      },
    });

    return access_token;
  } catch (error: any) {
    console.error(
      'Failed to get NHIS access token:',
      error.response?.data || error.message
    );
    return null;
  }
};

// ==========================================
// ELIGIBILITY VERIFICATION
// ==========================================

/**
 * Verify patient NHIS eligibility in real-time.
 * Uses Patient.nhisNumber (the NHIS membership card number) for lookup,
 * then updates Patient.nhisExpiryDate and Patient.nhisActive on success.
 */
const recordUnresolvedMembership = async (
  policyNumber: string,
  checkedById: string,
  rawResponse: unknown,
): Promise<void> => {
  const patient = await prisma.patient.findFirst({
    where: { nhisNumber: policyNumber },
  });
  if (!patient) return;

  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: patient.id },
      data: { nhisActive: false, updatedAt: new Date() },
    });
    await tx.nHISEligibilityCheck.create({
      data: {
        patientId: patient.id,
        membershipId: policyNumber,
        checkMethod: 'nhia_portal',
        status: 'not_found',
        membershipExpiry: null,
        rawResponse: JSON.parse(JSON.stringify(rawResponse ?? {})),
        checkedById,
      },
    });
  });
};

export const verifyNHISEligibility = async (
  policyNumber: string,
  checkedById: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const normalizedPolicyNumber = String(policyNumber ?? '').trim();
    if (!normalizedPolicyNumber) return { success: false, message: 'NHIS membership number is required', data: null };
    const config = await getNHISApiConfig();

    if (!config) {
      return {
        success: false,
        message:
          'NHIS API is not configured. Please configure NHIS API settings in Hospital Settings.',
      };
    }

    const accessToken = await getNHISAccessToken();

    if (!accessToken) {
      return {
        success: false,
        message:
          'Failed to obtain NHIS API access token. Please check your API credentials.',
      };
    }

    const response = await axios.get<NHISEligibilityResponse>(
      `${config.eligibilityEndpoint}/${encodeURIComponent(normalizedPolicyNumber)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const result = response.data;

    if (!result.success || !result.data) {
      await recordUnresolvedMembership(
        normalizedPolicyNumber,
        checkedById,
        result,
      );
      return {
        success: false,
        message: result.message || 'Policy not found or inactive',
        data: null,
      };
    }

    const eligibilityData = result.data;

    // Persist the NHIA response as the authoritative verification record. Patient.nhisActive
    // alone is not proof: registration can set it from coverage dates without an NHIA check.
    const patient = await prisma.patient.findFirst({
      where: { nhisNumber: normalizedPolicyNumber },
    });

    if (patient) {
      const parsedExpiry = eligibilityData.expiryDate ? new Date(eligibilityData.expiryDate) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryIsValid = !!parsedExpiry &&
        !Number.isNaN(parsedExpiry.getTime()) &&
        parsedExpiry >= today;
      const eligible = eligibilityData.isActive === true &&
        eligibilityData.isEligible === true &&
        expiryIsValid;
      const status = eligible
        ? 'active'
        : eligibilityData.isActive !== true
          ? 'suspended'
          : !expiryIsValid
            ? 'expired'
            : String(eligibilityData.reason || '').toLowerCase().includes('facility')
              ? 'referred_facility_mismatch'
              : 'suspended';

      await prisma.$transaction(async (tx) => {
        await tx.patient.update({
          where: { id: patient.id },
          data: {
            nhisExpiryDate: parsedExpiry && !Number.isNaN(parsedExpiry.getTime())
              ? parsedExpiry
              : null,
            nhisActive: eligible,
            updatedAt: new Date(),
          },
        });
        await tx.nHISEligibilityCheck.create({
          data: {
            patientId: patient.id,
            membershipId: normalizedPolicyNumber,
            checkMethod: 'nhia_portal',
            status,
            memberName: eligibilityData.fullName || null,
            membershipExpiry: parsedExpiry && !Number.isNaN(parsedExpiry.getTime())
              ? parsedExpiry
              : null,
            responseReference: null,
            rawResponse: JSON.parse(JSON.stringify(eligibilityData)),
            checkedById,
          },
        });
      });
    }

    return {
      success: true,
      message: eligibilityData.isEligible
        ? 'Patient is eligible for NHIS coverage'
        : 'Patient has NHIS but coverage restrictions apply',
      data: eligibilityData,
    };
  } catch (error: any) {
    console.error(
      'NHIS eligibility verification failed:',
      error.response?.data || error.message
    );

    if (error.response?.status === 404) {
      await recordUnresolvedMembership(
        String(policyNumber ?? '').trim(),
        checkedById,
        error.response?.data || { message: 'Policy number not found in NHIS database' },
      );
      return {
        success: false,
        message: 'Policy number not found in NHIS database',
        data: null,
      };
    }

    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'Invalid NHIS API credentials',
        data: null,
      };
    }

    return {
      success: false,
      message: `NHIS API error: ${error.response?.data?.message || error.message}`,
      data: null,
    };
  }
};

/**
 * Generate CCC (Claim Control Code) for an encounter.
 * Updates Attendance.nhisCCCCode, nhisCCCGeneratedAt, nhisCCCValidUntil on success.
 */
export const generateCCC = async (
  policyNumber: string,
  encounterId: string,
  totalAmount: number,
  checkedById: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    // Verify eligibility first
    const eligibilityResult = await verifyNHISEligibility(policyNumber, checkedById);

    if (!eligibilityResult.success || !eligibilityResult.data?.isEligible) {
      return {
        success: false,
        message:
          'Cannot generate CCC: Patient is not eligible for NHIS coverage',
        data: eligibilityResult.data,
      };
    }

    const config = await getNHISApiConfig();
    if (!config) {
      return { success: false, message: 'NHIS API is not configured' };
    }

    const accessToken = await getNHISAccessToken();
    if (!accessToken) {
      return {
        success: false,
        message: 'Failed to obtain NHIS API access token',
      };
    }

    const hospital = await prisma.hospital.findFirst({
      where: { nhisApiActive: true },
    });

    if (!hospital) {
      return { success: false, message: 'Hospital configuration not found' };
    }

    const cccRequest = {
      policyNumber,
      facilityCode: hospital.nhisFacilityCode,
      encounterId,
      totalAmount,
      generatedAt: new Date().toISOString(),
    };

    const response = await axios.post<NHISCCCResponse>(
      config.cccEndpoint,
      cccRequest,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const result = response.data;

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || 'Failed to generate CCC',
        data: null,
      };
    }

    // ✅ ALIGNED: Attendance has nhisCCCCode, nhisCCCGeneratedAt, nhisCCCValidUntil
    await prisma.attendance.update({
      where: { id: encounterId },
      data: {
        nhisCCCCode: result.data.cccCode,
        nhisCCCGeneratedAt: new Date(),
        nhisCCCValidUntil: result.data.validUntil
          ? new Date(result.data.validUntil)
          : null,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'CCC generated successfully',
      data: result.data,
    };
  } catch (error: any) {
    console.error(
      'CCC generation failed:',
      error.response?.data || error.message
    );
    return {
      success: false,
      message: `CCC generation error: ${error.response?.data?.message || error.message}`,
      data: null,
    };
  }
};

/**
 * Bulk eligibility verification for multiple patients
 */
export const bulkVerifyNHISEligibility = async (
  policyNumbers: string[],
  checkedById: string
): Promise<{
  success: boolean;
  message: string;
  data: Array<{
    policyNumber: string;
    success: boolean;
    message: string;
    data?: any;
  }>;
}> => {
  const results = [];

  for (const policyNumber of policyNumbers) {
    const result = await verifyNHISEligibility(policyNumber, checkedById);
    results.push({ policyNumber, ...result });
  }

  const successfulCount = results.filter((r) => r.success).length;

  return {
    success: successfulCount > 0,
    message: `Verified ${successfulCount} of ${policyNumbers.length} policies`,
    data: results,
  };
};

/**
 * Test NHIS API connection
 */
export const testNHISApiConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const config = await getNHISApiConfig();

    if (!config) {
      return { success: false, message: 'NHIS API is not configured' };
    }

    const accessToken = await getNHISAccessToken();

    if (!accessToken) {
      return {
        success: false,
        message: 'Failed to obtain access token. Check your credentials.',
      };
    }

    // Ping the eligibility endpoint with a test path
    await axios.get(`${config.eligibilityEndpoint}/test`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });

    return { success: true, message: 'NHIS API connection successful' };
  } catch (error: any) {
    // A 404 from the test path still means the API is reachable and auth works
    if (error.response?.status === 404) {
      return { success: true, message: 'NHIS API connection successful' };
    }
    return {
      success: false,
      message: `Connection failed: ${error.response?.data?.message || error.message}`,
    };
  }
};