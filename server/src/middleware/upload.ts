import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// File size limit: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/zip',
];

// File type validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

// Configure multer for memory storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Error handler for multer errors
export const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.11',
        title: 'Payload Too Large',
        status: 413,
        detail: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      });
    }
    
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
  
  if (err) {
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
  
  return next();
};
