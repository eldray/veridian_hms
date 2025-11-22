import { Router } from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  uploadPatientImage,
  uploadPatientImageBase64,
} from '../controllers/patientController';
import {
  protect,
  requireRole,
  requireMedicalStaff,
  requireRecordsStaff,
  requireAdmin,
  requirePatientManagement
} from '../middleware/authMiddleware';
import { uploadPatientImage as uploadMiddleware, handleUploadError } from '../middleware/uploadMiddleware';
import { body, validationResult } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

// Patient management routes - accessible by medical staff, records, and admin
router.get('/', requirePatientManagement, getPatients);
router.get('/:id', requirePatientManagement, getPatientById);

// Validation middleware - UPDATED FOR SURNAME AND OTHER NAMES
const validateCreatePatient = [
  body('surname').notEmpty().withMessage('Surname is required').trim().escape(),
  body('otherNames').notEmpty().withMessage('Other names are required').trim().escape(),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('dateOfBirth').isISO8601().toDate().withMessage('Invalid date of birth (use ISO format)'),
  body('contact').notEmpty().withMessage('Contact is required').trim(),
  body('address').notEmpty().withMessage('Address is required').trim().escape(),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance']).withMessage('Invalid payment mode'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

// Validation middleware for updates
const validateUpdatePatient = [
  body('surname').optional().notEmpty().withMessage('Surname cannot be empty').trim().escape(),
  body('otherNames').optional().notEmpty().withMessage('Other names cannot be empty').trim().escape(),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('dateOfBirth').optional().isISO8601().toDate().withMessage('Invalid date of birth (use ISO format)'),
  body('contact').optional().notEmpty().withMessage('Contact cannot be empty').trim(),
  body('address').optional().notEmpty().withMessage('Address cannot be empty').trim().escape(),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance']).withMessage('Invalid payment mode'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

// Routes
router.post(
  '/',
  requirePatientManagement,
  ...validateCreatePatient,
  createPatient
);

router.put(
  '/:id', 
  requirePatientManagement, 
  ...validateUpdatePatient,
  updatePatient
);

router.delete('/:id', requireAdmin, deletePatient); // Only admin can delete patients

// Image upload routes
router.post('/:id/upload-image', 
  requirePatientManagement,
  uploadMiddleware.single('image'),
  handleUploadError,
  uploadPatientImage
);

router.post('/:id/upload-image-base64', 
  requirePatientManagement,
  uploadPatientImageBase64
);

export default router;