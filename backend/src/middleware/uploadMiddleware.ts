import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import express from 'express';

const createUploadsDirectories = () => {
  const directories = [
    'uploads/patients',
    'uploads/users',    // ✅ ADDED for User profile images
    'uploads/scans',
    'uploads/documents',
    'uploads/temp'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};
createUploadsDirectories();

// Helper to generate safe filenames
const generateFilename = (prefix: string, id: string, file: Express.Multer.File) => {
  const timestamp = Date.now();
  const originalName = path.parse(file.originalname).name;
  const extension = path.extname(file.originalname);
  const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${prefix}_${id}_${safeName}_${timestamp}${extension}`;
};

// ✅ NEW: Storage for User Profile Images
const userStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'users')),
  filename: (req, file, cb) => {
    const userId = (req as any).user?.id || req.params.id || 'unknown';
    cb(null, generateFilename('user', userId, file));
  }
});

const patientStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'patients')),
  filename: (req, file, cb) => {
    const patientId = req.params.id || 'unknown';
    cb(null, generateFilename('patient', patientId, file));
  }
});

const scanStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'scans')),
  filename: (req, file, cb) => {
    const scanId = req.params.scanId || 'unknown';
    cb(null, generateFilename('scan', scanId, file));
  }
});

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  allowedMimes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid image type'));
};

const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  allowedMimes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid document type'));
};

// ✅ EXPORTS
export const uploadUserImage = multer({ storage: userStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('image');
export const uploadPatientImage = multer({ storage: patientStorage, fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 5 } }).array('images', 5);
export const uploadScanImages = multer({ storage: scanStorage, fileFilter: imageFileFilter, limits: { fileSize: 20 * 1024 * 1024, files: 10 } }).array('images', 10);
export const uploadDocuments = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'documents')),
    filename: (req, file, cb) => cb(null, generateFilename('doc', (req as any).user?.id || 'sys', file))
  }), 
  fileFilter: documentFileFilter, 
  limits: { fileSize: 5 * 1024 * 1024, files: 3 } 
}).array('documents', 3);

export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File too large.',
      LIMIT_FILE_COUNT: 'Too many files.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.'
    };
    res.status(400).json({ success: false, message: messages[error.code] || 'Upload error.' });
    return;
  }
  if (error.message) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }
  next(error);
};

export const getFileUrl = (filename: string, type: 'patient' | 'user' | 'scan' | 'document' = 'patient'): string => {
  return `/api/uploads/${type}/${filename}`;
};

// Static serving
export const serveUserImages = express.static(path.join(process.cwd(), 'uploads', 'users'));
export const servePatientImages = express.static(path.join(process.cwd(), 'uploads', 'patients'));
export const serveScanImages = express.static(path.join(process.cwd(), 'uploads', 'scans'));
export const serveDocuments = express.static(path.join(process.cwd(), 'uploads', 'documents'));