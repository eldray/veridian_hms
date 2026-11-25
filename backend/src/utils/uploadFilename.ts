// Uploaded file names are built on the server. The extension comes from the
// accepted MIME type, never from the client filename: otherwise "report.html"
// submitted as image/png would be stored as .html and later served as
// executable HTML from the application origin.
export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export function sanitizeFilenameSegment(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'unknown';
}

export function generateUploadFilename(
  prefix: string,
  id: string,
  file: { originalname: string; mimetype: string },
  timestamp: number = Date.now(),
): string {
  const extension = MIME_EXTENSIONS[file.mimetype];
  if (!extension) throw new Error('Unsupported file type');

  const originalName = file.originalname.replace(/\.[^.]*$/, '');
  const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60) || 'file';
  return `${sanitizeFilenameSegment(prefix)}_${sanitizeFilenameSegment(id)}_${safeName}_${timestamp}${extension}`;
}
