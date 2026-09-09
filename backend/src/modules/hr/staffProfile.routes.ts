import { Router } from 'express';
import { PrismaClient, EmploymentType } from '@prisma/client';
import { StaffProfileService } from './staffProfile.service.js';
import { protect, requireRole } from '../../middleware/authMiddleware.js';

const HR_ROLES = ['super_admin', 'admin', 'hr_officer'] as const;

export function createStaffProfileRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const staffService = new StaffProfileService(prisma);

  router.use(protect);

  // ── Static route MUST come before /:id ──────────────────
  router.get('/promotions/eligible', requireRole([...HR_ROLES]), async (req, res) => {
    try {
      const eligible = await staffService.getEligibleForPromotion();
      res.json(eligible);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/', requireRole([...HR_ROLES]), async (req, res) => {
    try {
      const { departmentId, employmentType, search, skip, take } = req.query;
      const result = await staffService.getAllProfiles({
        departmentId: departmentId as string | undefined,
        employmentType: employmentType as string | undefined,
        search: search as string | undefined,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', requireRole([...HR_ROLES]), async (req, res) => {
    try {
      const profile = await staffService.getProfileById(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Staff profile not found' });
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', requireRole([...HR_ROLES]), async (req, res) => {
    try {
      const {
        userId, employeeId, dateJoined, employmentType,
        departmentId, jobGradeId, salaryStepId,
        bio, nextOfKinName, nextOfKinPhone,
      } = req.body;

      if (!userId || !dateJoined || !employmentType) {
        return res.status(400).json({ error: 'userId, dateJoined, employmentType are required' });
      }

      if (!Object.values(EmploymentType).includes(employmentType)) {
        return res.status(400).json({
          error: `Invalid employmentType. Must be one of: ${Object.values(EmploymentType).join(', ')}`,
        });
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

  router.patch('/:id', requireRole([...HR_ROLES]), async (req, res) => {
    try {
      const {
        departmentId, jobGradeId, salaryStepId,
        bio, nextOfKinName, nextOfKinPhone, employmentType,
      } = req.body;

      const profile = await staffService.updateProfile(req.params.id, {
        departmentId, jobGradeId, salaryStepId,
        bio, nextOfKinName, nextOfKinPhone, employmentType,
      });

      res.json(profile);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Staff profile not found' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}