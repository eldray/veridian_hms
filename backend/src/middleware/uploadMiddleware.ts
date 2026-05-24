// backend/middleware/uploadMiddleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express'; // ✅ Added Response, NextFunction
import { AuthRequest } from './authMiddleware';

// Ensure uploads directory structure exists
const createUploadsDirectories = () => {
  const directories = [
    'uploads/patients',
    'uploads/scans',
    'uploads/documents',
    'uploads/temp'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created upload directory: ${fullPath}`);
    }
  });
};

// Initialize directories on module load
createUploadsDirectories();

// Storage configuration for patient images
const patientStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'patients');
    cb(null, uploadPath);
  },
  filename: (req: Request, file, cb) => {
    const patientId = req.params.id || 'unknown';
    const timestamp = Date.now();
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `patient_${patientId}_${safeName}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// Storage configuration for scan images
const scanStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'scans');
    cb(null, uploadPath);
  },
  filename: (req: Request, file, cb) => {
    const scanId = req.params.scanId || 'unknown';
    const timestamp = Date.now();
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `scan_${scanId}_${safeName}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// File filter for images
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`));
  }
};

// File filter for documents
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid document type. Allowed types: PDF, Word, JPEG, PNG`));
  }
};

// Multer configuration for patient images
export const uploadPatientImage = multer({
  storage: patientStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// Multer configuration for scan images
export const uploadScanImages = multer({
  storage: scanStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for scans
    files: 10 // Maximum 10 files
  }
});

// Multer configuration for documents
export const uploadDocuments = multer({
  storage: multer.diskStorage({
    destination: (req: Request, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads', 'documents');
      cb(null, uploadPath);
    },
    filename: (req: Request, file, cb) => {
      const timestamp = Date.now();
      const originalName = path.parse(file.originalname).name;
      const extension = path.extname(file.originalname);
      const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `doc_${safeName}_${timestamp}${extension}`;
      cb(null, filename);
    }
  }),
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for documents
    files: 3 // Maximum 3 files
  }
});

// Single file upload (for profile pictures)
export const uploadSingle = multer({
  storage: patientStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
}).single('image');

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File too large. Please upload a smaller file.'
      });
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        message: 'Too many files. Please upload fewer files.'
      });
      return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
      return;
    }
  }

  if (error.message && error.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      message: error.message
    });
    return;
  }

  console.error('Upload error:', error);
  res.status(500).json({
    success: false,
    message: 'File upload failed'
  });
};

// Utility function to delete uploaded files
export const deleteUploadedFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        resolve(false);
      } else {
        console.log('✅ File deleted:', filePath);
        resolve(true);
      }
    });
  });
};

// Utility function to get file URL
export const getFileUrl = (filename: string, type: 'patient' | 'scan' | 'document' = 'patient'): string => {
  return `/api/uploads/${type}/${filename}`;
};

// Serve static files with proper security
import express from 'express';

export const servePatientImages = express.static(
  path.join(process.cwd(), 'uploads', 'patients'),
  {
    setHeaders: (res, path) => {
      // Security headers for uploaded files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    }
  }
);

export const serveScanImages = express.static(
  path.join(process.cwd(), 'uploads', 'scans'),
  {
    setHeaders: (res, path) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
);

export const serveDocuments = express.static(
  path.join(process.cwd(), 'uploads', 'documents'),
  {
    setHeaders: (res, path) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
);