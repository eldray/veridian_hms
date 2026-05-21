// modules/settings/settings.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as settingsService from './settings.service';
import * as nhisEligibilityService from './nhis-eligibility.service';

// ==========================================
// USER MANAGEMENT CONTROLLERS
// ==========================================

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await settingsService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      fullName, email, phone, licenseNumber,
      specialization, role, isActive, departmentId,
    } = req.body;

    const updateData: any = {};
    if (fullName !== undefined)       updateData.fullName = fullName;
    if (email !== undefined)          updateData.email = email;
    if (phone !== undefined)          updateData.phone = phone;
    if (licenseNumber !== undefined)  updateData.licenseNumber = licenseNumber;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (role !== undefined)           updateData.role = role;
    if (isActive !== undefined)       updateData.isActive = isActive;
    if (departmentId !== undefined)   updateData.departmentId = departmentId;

    const user = await settingsService.updateUser(req.params.id, updateData);
    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.message === 'User not found')
      return res.status(404).json({ success: false, message: error.message });

    if (error.message === 'Email already exists')
      return res.status(400).json({ success: false, message: error.message });

    if (
      error.message.includes('License number is required') ||
      error.message.includes('Specialization is required')
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Server error updating user' });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const user = await settingsService.deactivateUser(req.params.id);
    res.json({ success: true, message: 'User deactivated successfully', data: user });
  } catch (error: any) {
    console.error('Deactivate user error:', error);
    if (error.message === 'User not found')
      return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error deactivating user' });
  }
};

// ==========================================
// HOSPITAL DETAILS CONTROLLERS
// ==========================================

export const getHospitalDetails = async (req: Request, res: Response) => {
  try {
    const hospital = await settingsService.getHospitalDetails();
    if (!hospital)
      return res.status(404).json({ success: false, message: 'Hospital not configured' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    console.error('Get hospital details error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching hospital details' });
  }
};

export const updateHospitalDetails = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { name, address, phone, email, imageUrl } = req.body;
    const hospital = await settingsService.updateHospitalDetails({
      name, address, phone, email, imageUrl,
    });
    res.json({ success: true, data: hospital });
  } catch (error) {
    console.error('Update hospital details error:', error);
    res.status(500).json({ success: false, message: 'Server error updating hospital details' });
  }
};

// ==========================================
// NHIS API CONFIGURATION CONTROLLERS
// ==========================================

export const getNHISApiStatus = async (req: Request, res: Response) => {
  try {
    const hospital = await settingsService.getHospitalDetails();
    if (!hospital)
      return res.status(404).json({ success: false, message: 'Hospital configuration not found' });

    const now = new Date();
    const tokenValid =
      !!hospital.nhisApiAccessToken &&
      !!hospital.nhisApiTokenExpiresAt &&
      new Date(hospital.nhisApiTokenExpiresAt) > now;

    res.json({
      success: true,
      data: {
        configured: !!(hospital.nhisApiBaseUrl && hospital.nhisApiClientId),
        active: hospital.nhisApiActive || false,
        // Never expose actual credentials
        hasBaseUrl: !!hospital.nhisApiBaseUrl,
        hasClientId: !!hospital.nhisApiClientId,
        hasClientSecret: !!hospital.nhisApiClientSecret,
        hasTokenEndpoint: !!hospital.nhisApiTokenEndpoint,
        hasEligibilityEndpoint: !!hospital.nhisApiEligibilityEndpoint,
        hasCccEndpoint: !!hospital.nhisApiCccEndpoint,
        hasValidToken: tokenValid,
        tokenExpiresAt: hospital.nhisApiTokenExpiresAt,
        lastTokenRefresh: hospital.nhisApiLastTokenRefresh,
        // Facility info (safe to expose)
        nhisFacilityCode: hospital.nhisFacilityCode,
        nhisFacilityType: hospital.nhisFacilityType,
        nhisAccreditationNumber: hospital.nhisAccreditationNumber,
        nhisContactPerson: hospital.nhisContactPerson,
        nhisContactPhone: hospital.nhisContactPhone,
        nhisContactEmail: hospital.nhisContactEmail,
      },
    });
  } catch (error) {
    console.error('Get NHIS API status error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching NHIS API status' });
  }
};

export const updateNHISApiConfig = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const {
      nhisApiBaseUrl, nhisApiClientId, nhisApiClientSecret,
      nhisApiTokenEndpoint, nhisApiEligibilityEndpoint, nhisApiCccEndpoint,
      nhisApiActive,
      // Also allow updating facility fields in same call
      nhisFacilityCode, nhisFacilityType, nhisAccreditationNumber,
      nhisContactPerson, nhisContactPhone, nhisContactEmail,
    } = req.body;

    const updated = await settingsService.updateNHISSettings({
      nhisApiBaseUrl, nhisApiClientId, nhisApiClientSecret,
      nhisApiTokenEndpoint, nhisApiEligibilityEndpoint, nhisApiCccEndpoint,
      nhisApiActive,
      nhisFacilityCode, nhisFacilityType, nhisAccreditationNumber,
      nhisContactPerson, nhisContactPhone, nhisContactEmail,
    });

    res.json({
      success: true,
      message: 'NHIS API configuration updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Update NHIS API config error:', error);
    if (error.message === 'Hospital configuration not found')
      return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error updating NHIS API configuration' });
  }
};

export const testNHISConnection = async (req: Request, res: Response) => {
  try {
    const result = await nhisEligibilityService.testNHISApiConnection();
    res.status(result.success ? 200 : 400).json({ success: result.success, message: result.message });
  } catch (error: any) {
    console.error('Test NHIS connection error:', error);
    res.status(500).json({ success: false, message: 'Server error testing NHIS connection' });
  }
};

// ==========================================
// NHIS ELIGIBILITY VERIFICATION CONTROLLERS
// ==========================================

export const verifyNHISEligibility = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { policyNumber } = req.body;
    const result = await nhisEligibilityService.verifyNHISEligibility(policyNumber);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Verify NHIS eligibility error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying NHIS eligibility' });
  }
};

export const bulkVerifyNHISEligibility = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { policyNumbers } = req.body;

    if (policyNumbers.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 policy numbers per bulk verification request',
      });
    }

    const result = await nhisEligibilityService.bulkVerifyNHISEligibility(policyNumbers);
    res.json(result);
  } catch (error: any) {
    console.error('Bulk verify NHIS eligibility error:', error);
    res.status(500).json({ success: false, message: 'Server error bulk verifying NHIS eligibility' });
  }
};

export const generateCCC = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { policyNumber, encounterId, totalAmount } = req.body;
    const result = await nhisEligibilityService.generateCCC(
      policyNumber,
      encounterId,
      parseFloat(totalAmount.toString())
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Generate CCC error:', error);
    res.status(500).json({ success: false, message: 'Server error generating CCC' });
  }
};