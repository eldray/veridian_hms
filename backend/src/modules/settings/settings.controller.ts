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
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, phone, licenseNumber, specialization, role, isActive } = req.body;
    const userId = req.params.id;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await settingsService.updateUser(userId, updateData);

    res.json(user);
  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Email already exists') {
      return res.status(400).json({ message: error.message });
    }

    if (error.message.includes('License number is required') || 
        error.message.includes('Specialization is required')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error updating user' });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await settingsService.deactivateUser(userId);

    res.json({ message: 'User deactivated successfully', user });
  } catch (error: any) {
    console.error('Deactivate user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error deactivating user' });
  }
};

// ==========================================
// HOSPITAL DETAILS CONTROLLERS
// ==========================================

export const getHospitalDetails = async (req: Request, res: Response) => {
  try {
    const hospital = await settingsService.getHospitalDetails();
    res.json(hospital);
  } catch (error) {
    console.error('Get hospital details error:', error);
    res.status(500).json({ message: 'Server error fetching hospital details' });
  }
};

export const updateHospitalDetails = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, phone, email, imageUrl } = req.body;

    const hospital = await settingsService.updateHospitalDetails({
      name,
      address,
      phone,
      email,
      imageUrl
    });

    res.json(hospital);
  } catch (error) {
    console.error('Update hospital details error:', error);
    res.status(500).json({ message: 'Server error updating hospital details' });
  }
};

// ==========================================
// NHIS API CONFIGURATION CONTROLLERS
// ==========================================

/**
 * Update NHIS API configuration in hospital settings
 */
export const updateNHISApiConfig = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nhisApiBaseUrl,
      nhisApiClientId,
      nhisApiClientSecret,
      nhisApiTokenEndpoint,
      nhisApiEligibilityEndpoint,
      nhisApiCccEndpoint,
      nhisApiActive
    } = req.body;

    const hospital = await settingsService.getHospitalDetails();
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital configuration not found' });
    }

    const updatedHospital = await settingsService.updateHospitalDetailsAndNHISConfig({
      name: hospital.name,
      address: hospital.address,
      phone: hospital.phone,
      email: hospital.email,
      imageUrl: hospital.imageUrl || undefined,
      nhisApiBaseUrl: nhisApiBaseUrl !== undefined ? nhisApiBaseUrl : hospital.nhisApiBaseUrl,
      nhisApiClientId: nhisApiClientId !== undefined ? nhisApiClientId : hospital.nhisApiClientId,
      nhisApiClientSecret: nhisApiClientSecret !== undefined ? nhisApiClientSecret : hospital.nhisApiClientSecret,
      nhisApiTokenEndpoint: nhisApiTokenEndpoint !== undefined ? nhisApiTokenEndpoint : hospital.nhisApiTokenEndpoint,
      nhisApiEligibilityEndpoint: nhisApiEligibilityEndpoint !== undefined ? nhisApiEligibilityEndpoint : hospital.nhisApiEligibilityEndpoint,
      nhisApiCccEndpoint: nhisApiCccEndpoint !== undefined ? nhisApiCccEndpoint : hospital.nhisApiCccEndpoint,
      nhisApiActive: nhisApiActive !== undefined ? nhisApiActive : hospital.nhisApiActive
    });

    res.json({
      message: 'NHIS API configuration updated successfully',
      hospital: updatedHospital
    });
  } catch (error: any) {
    console.error('Update NHIS API config error:', error);
    res.status(500).json({ message: 'Server error updating NHIS API configuration' });
  }
};

/**
 * Get NHIS API configuration status (without exposing secrets)
 */
export const getNHISApiStatus = async (req: Request, res: Response) => {
  try {
    const hospital = await settingsService.getHospitalDetails();
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital configuration not found' });
    }

    // Return configuration status without exposing sensitive data
    res.json({
      configured: !!(hospital.nhisApiBaseUrl && hospital.nhisApiClientId),
      active: hospital.nhisApiActive || false,
      baseUrl: hospital.nhisApiBaseUrl ? '***configured***' : null,
      clientId: hospital.nhisApiClientId ? '***configured***' : null,
      tokenEndpoint: hospital.nhisApiTokenEndpoint ? '***configured***' : null,
      eligibilityEndpoint: hospital.nhisApiEligibilityEndpoint ? '***configured***' : null,
      cccEndpoint: hospital.nhisApiCccEndpoint ? '***configured***' : null,
      hasValidToken: !!(hospital.nhisApiAccessToken && hospital.nhisApiTokenExpiresAt && new Date(hospital.nhisApiTokenExpiresAt) > new Date()),
      tokenExpiresAt: hospital.nhisApiTokenExpiresAt,
      lastTokenRefresh: hospital.nhisApiLastTokenRefresh
    });
  } catch (error) {
    console.error('Get NHIS API status error:', error);
    res.status(500).json({ message: 'Server error fetching NHIS API status' });
  }
};

/**
 * Test NHIS API connection
 */
export const testNHISConnection = async (req: Request, res: Response) => {
  try {
    const result = await nhisEligibilityService.testNHISApiConnection();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Test NHIS connection error:', error);
    res.status(500).json({ message: 'Server error testing NHIS connection' });
  }
};

// ==========================================
// NHIS ELIGIBILITY VERIFICATION CONTROLLERS
// ==========================================

/**
 * Verify single patient NHIS eligibility
 */
export const verifyNHISEligibility = async (req: Request, res: Response) => {
  try {
    const { policyNumber } = req.body;

    if (!policyNumber) {
      return res.status(400).json({ message: 'Policy number is required' });
    }

    const result = await nhisEligibilityService.verifyNHISEligibility(policyNumber);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Verify NHIS eligibility error:', error);
    res.status(500).json({ message: 'Server error verifying NHIS eligibility' });
  }
};

/**
 * Bulk verify multiple patient NHIS eligibility
 */
export const bulkVerifyNHISEligibility = async (req: Request, res: Response) => {
  try {
    const { policyNumbers } = req.body;

    if (!policyNumbers || !Array.isArray(policyNumbers) || policyNumbers.length === 0) {
      return res.status(400).json({ message: 'Policy numbers array is required' });
    }

    const result = await nhisEligibilityService.bulkVerifyNHISEligibility(policyNumbers);

    res.json(result);
  } catch (error: any) {
    console.error('Bulk verify NHIS eligibility error:', error);
    res.status(500).json({ message: 'Server error bulk verifying NHIS eligibility' });
  }
};

/**
 * Generate CCC for an encounter
 */
export const generateCCC = async (req: Request, res: Response) => {
  try {
    const { policyNumber, encounterId, totalAmount } = req.body;

    if (!policyNumber || !encounterId || totalAmount === undefined) {
      return res.status(400).json({ 
        message: 'Policy number, encounter ID, and total amount are required' 
      });
    }

    const result = await nhisEligibilityService.generateCCC(
      policyNumber,
      encounterId,
      parseFloat(totalAmount.toString())
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Generate CCC error:', error);
    res.status(500).json({ message: 'Server error generating CCC' });
  }
};

