// middleware/uploadMiddleware.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';


// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'patients');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const patientId = req.params.id;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `patient-${patientId}-${timestamp}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Middleware to serve static files
export const servePatientImages = express.static(uploadsDir);