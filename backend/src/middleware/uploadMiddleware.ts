import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { generateUploadFilename } from '../utils/uploadFilename';
import { verifyFileSignature } from '../utils/fileSignature';

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

// Helper to generate safe filenames. See utils/uploadFilename for why the
// extension is taken from the MIME type rather than the client filename.
const generateFilename = (prefix: string, id: string, file: Express.Multer.File) =>
  generateUploadFilename(prefix, id, file);

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
const uploadedFiles = (req: Request): Express.Multer.File[] => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return [];
};

const discardUploads = async (files: Express.Multer.File[]): Promise<void> => {
  await Promise.all(files.map(file => fs.promises.unlink(file.path).catch(() => undefined)));
};

// The MIME type comes from the client, so every stored file is checked against
// its leading bytes before the request reaches a controller. A mismatch deletes
// the whole upload so a rejected request cannot leave orphans behind.
const withFileSignatureCheck = (upload: RequestHandler): RequestHandler => (req, res, next) => {
  upload(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }

    const files = uploadedFiles(req);
    if (files.length === 0) {
      next();
      return;
    }

    void (async () => {
      for (const file of files) {
        let matches = false;
        try {
          matches = await verifyFileSignature(file.path, file.mimetype);
        } catch {
          matches = false;
        }

        if (!matches) {
          await discardUploads(files);
          const rejection = new Error('File content does not match its declared type') as Error & { statusCode?: number };
          rejection.statusCode = 400;
          next(rejection);
          return;
        }
      }
      next();
    })().catch(next);
  });
};

export const uploadUserImage = withFileSignatureCheck(multer({ storage: userStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('image'));
export const uploadPatientImage = withFileSignatureCheck(multer({ storage: patientStorage, fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 5 } }).array('images', 5));
export const uploadPatientPhoto = withFileSignatureCheck(multer({ storage: patientStorage, fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('image'));
export const uploadScanImages = withFileSignatureCheck(multer({ storage: scanStorage, fileFilter: imageFileFilter, limits: { fileSize: 20 * 1024 * 1024, files: 10 } }).array('images', 10));
export const uploadSingleDocument = withFileSignatureCheck(multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'documents')),
    filename: (req, file, cb) => cb(null, generateFilename('doc', (req as any).params?.id || (req as any).user?.id || 'sys', file))
  }),
  fileFilter: documentFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
}).single('file'));
export const uploadDocuments = withFileSignatureCheck(multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'documents')),
    filename: (req, file, cb) => cb(null, generateFilename('doc', (req as any).user?.id || 'sys', file))
  }),
  fileFilter: documentFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 }
}).array('documents', 3));

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

export const getFileUrl = (
  filename: string,
  category: 'patients' | 'users' | 'scans' | 'documents' = 'patients',
): string => {
  return `/api/uploads/${category}/${filename}`;
};