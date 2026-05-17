// modules/settings/nhis-eligibility.service.ts
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

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
    where: { nhisApiActive: true }
  });

  if (!hospital || !hospital.nhisApiBaseUrl || !hospital.nhisApiClientId || !hospital.nhisApiClientSecret) {
    return null;
  }

  return {
    baseUrl: hospital.nhisApiBaseUrl,
    clientId: hospital.nhisApiClientId,
    clientSecret: hospital.nhisApiClientSecret,
    tokenEndpoint: hospital.nhisApiTokenEndpoint || `${hospital.nhisApiBaseUrl}/oauth/token`,
    eligibilityEndpoint: hospital.nhisApiEligibilityEndpoint || `${hospital.nhisApiBaseUrl}/api/v1/eligibility`,
    cccEndpoint: hospital.nhisApiCccEndpoint || `${hospital.nhisApiBaseUrl}/api/v1/ccc/generate`
  };
};

/**
 * Get or refresh NHIS API access token
 * Implements token caching to avoid unnecessary API calls
 */
export const getNHISAccessToken = async (): Promise<string | null> => {
  const hospital = await prisma.hospital.findFirst({
    where: { nhisApiActive: true }
  });

  if (!hospital) {
    return null;
  }

  // Check if we have a valid cached token
  const now = new Date();
  if (hospital.nhisApiAccessToken && hospital.nhisApiTokenExpiresAt) {
    // Token is still valid (with 5 minute buffer)
    const expiryWithBuffer = new Date(hospital.nhisApiTokenExpiresAt.getTime() - 5 * 60 * 1000);
    if (now < expiryWithBuffer) {
      return hospital.nhisApiAccessToken;
    }
  }

  // Need to refresh token
  const config = await getNHISApiConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await axios.post<NHISTokenResponse>(
      config.tokenEndpoint,
      {
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache the token in database
    const expiresAt = new Date(now.getTime() + expires_in * 1000);
    await prisma.hospital.updateMany({
      where: { nhisApiActive: true },
      data: {
        nhisApiAccessToken: access_token,
        nhisApiTokenExpiresAt: expiresAt,
        nhisApiLastTokenRefresh: now
      }
    });

    return access_token;
  } catch (error: any) {
    console.error('Failed to get NHIS access token:', error.response?.data || error.message);
    return null;
  }
};

// ==========================================
// ELIGIBILITY VERIFICATION SERVICES
// ==========================================

/**
 * Verify patient NHIS eligibility in real-time
 * @param policyNumber - NHIS policy number to verify
 * @returns Eligibility status and patient details
 */
export const verifyNHISEligibility = async (
  policyNumber: string
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    const config = await getNHISApiConfig();
    
    if (!config) {
      return {
        success: false,
        message: 'NHIS API is not configured. Please configure NHIS API settings in Hospital Settings.'
      };
    }

    const accessToken = await getNHISAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Failed to obtain NHIS API access token. Please check your API credentials.'
      };
    }

    // Call NHIS eligibility API
    const response = await axios.get<NHISEligibilityResponse>(
      `${config.eligibilityEndpoint}/${encodeURIComponent(policyNumber)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const result = response.data;

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || 'Policy not found or inactive',
        data: null
      };
    }

    // Update patient record with NHIS details if exists
    const patient = await prisma.patient.findFirst({
      where: { nhisPolicyNumber: policyNumber }
    });

    if (patient && result.data.isActive) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          nhisExpiryDate: result.data.expiryDate ? new Date(result.data.expiryDate) : null,
          nhisActive: true,
          updatedAt: new Date()
        }
      });
    }

    return {
      success: true,
      message: result.data.isEligible ? 'Patient is eligible for NHIS coverage' : 'Patient has NHIS but coverage restrictions apply',
      data: result.data
    };
  } catch (error: any) {
    console.error('NHIS eligibility verification failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return {
        success: false,
        message: 'Policy number not found in NHIS database',
        data: null
      };
    }

    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'Invalid NHIS API credentials',
        data: null
      };
    }

    return {
      success: false,
      message: `NHIS API error: ${error.response?.data?.message || error.message}`,
      data: null
    };
  }
};

/**
 * Generate CCC (Claim Control Code) for an encounter
 * @param policyNumber - Patient's NHIS policy number
 * @param encounterId - Encounter/Attendance ID
 * @param totalAmount - Total bill amount
 * @returns CCC code and details
 */
export const generateCCC = async (
  policyNumber: string,
  encounterId: string,
  totalAmount: number
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    // First verify eligibility
    const eligibilityResult = await verifyNHISEligibility(policyNumber);
    
    if (!eligibilityResult.success || !eligibilityResult.data?.isEligible) {
      return {
        success: false,
        message: 'Cannot generate CCC: Patient is not eligible for NHIS coverage',
        data: eligibilityResult.data
      };
    }

    const config = await getNHISApiConfig();
    
    if (!config) {
      return {
        success: false,
        message: 'NHIS API is not configured'
      };
    }

    const accessToken = await getNHISAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Failed to obtain NHIS API access token'
      };
    }

    // Get hospital details
    const hospital = await prisma.hospital.findFirst({
      where: { nhisApiActive: true }
    });

    if (!hospital) {
      return {
        success: false,
        message: 'Hospital configuration not found'
      };
    }

    // Prepare CCC generation request
    const cccRequest = {
      policyNumber: policyNumber,
      facilityCode: hospital.nhisFacilityCode,
      encounterId: encounterId,
      totalAmount: totalAmount,
      generatedAt: new Date().toISOString()
    };

    // Call NHIS CCC generation API
    const response = await axios.post<NHISCCCResponse>(
      config.cccEndpoint,
      cccRequest,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const result = response.data;

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || 'Failed to generate CCC',
        data: null
      };
    }

    // Update encounter/attendance with CCC code
    await prisma.attendance.update({
      where: { id: encounterId },
      data: {
        nhisCCCCode: result.data.cccCode,
        nhisCCCGeneratedAt: new Date(),
        nhisCCCValidUntil: result.data.validUntil ? new Date(result.data.validUntil) : null,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: 'CCC generated successfully',
      data: result.data
    };
  } catch (error: any) {
    console.error('CCC generation failed:', error.response?.data || error.message);
    
    return {
      success: false,
      message: `CCC generation error: ${error.response?.data?.message || error.message}`,
      data: null
    };
  }
};

/**
 * Bulk eligibility verification for multiple patients
 * @param policyNumbers - Array of policy numbers to verify
 * @returns Array of eligibility results
 */
export const bulkVerifyNHISEligibility = async (
  policyNumbers: string[]
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
    const result = await verifyNHISEligibility(policyNumber);
    results.push({
      policyNumber,
      ...result
    });
  }

  const successfulCount = results.filter(r => r.success).length;

  return {
    success: successfulCount > 0,
    message: `Verified ${successfulCount} of ${policyNumbers.length} policies`,
    data: results
  };
};

/**
 * Test NHIS API connection
 * @returns Connection status
 */
export const testNHISApiConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const config = await getNHISApiConfig();
    
    if (!config) {
      return {
        success: false,
        message: 'NHIS API is not configured'
      };
    }

    const accessToken = await getNHISAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Failed to obtain access token. Check your credentials.'
      };
    }

    // Simple test request to eligibility endpoint
    await axios.get(
      `${config.eligibilityEndpoint}/test`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      message: 'NHIS API connection successful'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.response?.data?.message || error.message}`
    };
  }
};
