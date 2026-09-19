import { Router } from 'express';
import { StaffProfileService } from '../staffProfile.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

const router = Router();
const staffService = new StaffProfileService();

// Get all staff profiles
router.get('/', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'HR_OFFICER']), async (req, res) => {
  try {
    const { departmentId, employmentType, search, skip, take } = req.query;
    
    const result = await staffService.getAllProfiles({
      departmentId: departmentId as string,
      employmentType: employmentType as string,
      search: search as string,
      skip: skip ? parseInt(skip as string) : undefined,
      take: take ? parseInt(take as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single staff profile
router.get('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'HR_OFFICER']), async (req, res) => {
  try {
    const profile = await staffService.getProfileById(req.params.id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Staff profile not found' });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create staff profile
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'HR_OFFICER']), async (req, res) => {
  try {
    const { userId, employeeId, dateJoined, employmentType, departmentId, jobGradeId, salaryStepId, bio, nextOfKinName, nextOfKinPhone } = req.body;

    // Validate required fields
    if (!userId || !employeeId || !dateJoined || !employmentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profile = await staffService.createProfile({
      userId,
      employeeId,
      dateJoined: new Date(dateJoined),
      employmentType,
      departmentId,
      jobGradeId,
      salaryStepId,
      bio,
      nextOfKinName,
      nextOfKinPhone,
    });

    res.status(201).json(profile);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Employee ID already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update staff profile
router.patch('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'HR_OFFICER']), async (req, res) => {
  try {
    const { departmentId, jobGradeId, salaryStepId, bio, nextOfKinName, nextOfKinPhone, employmentType } = req.body;

    const profile = await staffService.updateProfile(req.params.id, {
      departmentId,
      jobGradeId,
      salaryStepId,
      bio,
      nextOfKinName,
      nextOfKinPhone,
      employmentType,
    });

    res.json(profile);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Staff profile not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get staff eligible for promotion
router.get('/promotions/eligible', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'HR_OFFICER']), async (req, res) => {
  try {
    const eligible = await staffService.getEligibleForPromotion();
    res.json(eligible);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
