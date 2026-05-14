import { body, param, query, ValidationChain } from 'express-validator';

// Common validation patterns
export const emailValidation: ValidationChain = body('email')
  .optional()
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

export const phoneValidation: ValidationChain = body('phone')
  .optional()
  .matches(/^\+?[\d\s-]{10,}$/)
  .withMessage('Please provide a valid phone number');

export const dateValidation: ValidationChain = body('date')
  .optional()
  .isISO8601()
  .withMessage('Please provide a valid date in ISO format');

export const positiveNumberValidation: ValidationChain = body('amount')
  .optional()
  .isFloat({ min: 0 })
  .withMessage('Amount must be a positive number');

// Patient validations
export const createPatientValidator: ValidationChain[] = [
  body('firstName')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name is required (2-50 characters)'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name is required (2-50 characters)'),
  
  body('dateOfBirth')
    .notEmpty()
    .isISO8601()
    .toDate()
    .withMessage('Valid date of birth is required'),
  
  body('gender')
    .notEmpty()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  emailValidation,
  phoneValidation
];

export const updatePatientValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Valid patient ID is required'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid date of birth is required'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  emailValidation,
  phoneValidation
];

// Authentication validations
export const loginValidator: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

export const registerValidator: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 alphanumeric characters'),
  
  body('password')
    .notEmpty()
    .isLength({ min: 8, max: 100 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  
  body('fullName')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name is required (2-100 characters)'),
  
  body('email')
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('role')
    .optional()
    .isIn(['admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer'])
    .withMessage('Invalid role')
];

// Billing validations
export const createBillValidator: ValidationChain[] = [
  param('patientId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid patient ID is required'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one bill item is required'),
  
  body('items.*.serviceId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid service ID is required'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Appointment validations
export const createAppointmentValidator: ValidationChain[] = [
  body('patientId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid patient ID is required'),
  
  body('departmentId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid department ID is required'),
  
  body('appointmentDate')
    .notEmpty()
    .isISO8601()
    .toDate()
    .withMessage('Valid appointment date is required'),
  
  body('appointmentTime')
    .notEmpty()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Valid appointment time is required (HH:MM)'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// Admission validations
export const createAdmissionValidator: ValidationChain[] = [
  body('patientId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid patient ID is required'),
  
  body('wardId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid ward ID is required'),
  
  body('bedId')
    .optional()
    .isUUID()
    .withMessage('Valid bed ID is required'),
  
  body('admissionDate')
    .notEmpty()
    .isISO8601()
    .toDate()
    .withMessage('Valid admission date is required'),
  
  body('diagnosis')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Diagnosis cannot exceed 500 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Generic ID validator
export const idParamValidator: ValidationChain = param('id')
  .notEmpty()
  .isUUID()
  .withMessage('Valid ID is required');

// Pagination validator
export const paginationValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid sort field'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc')
];
