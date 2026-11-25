// The MIME type on a multipart part is supplied by the client, so a file named
// "scan.html" can claim image/png and still be stored as a PNG. These helpers
// read the leading bytes of the file and confirm they match the claimed type.
import fs from 'fs';

export type UploadFileType = 'jpeg' | 'png' | 'gif' | 'webp' | 'pdf' | 'doc' | 'docx';

const HEADER_BYTES = 32;

function startsWith(head: Buffer, bytes: number[]): boolean {
  if (head.length < bytes.length) return false;
  return bytes.every((byte, index) => head[index] === byte);
}

function asciiAt(head: Buffer, offset: number, text: string): boolean {
  if (head.length < offset + text.length) return false;
  return head.toString('latin1', offset, offset + text.length) === text;
}

const MIME_TYPES: Record<string, UploadFileType> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export function detectFileType(head: Buffer): UploadFileType | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (asciiAt(head, 0, 'GIF87a') || asciiAt(head, 0, 'GIF89a')) return 'gif';
  if (asciiAt(head, 0, 'RIFF') && asciiAt(head, 8, 'WEBP')) return 'webp';
  if (asciiAt(head, 0, '%PDF-')) return 'pdf';
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc';
  // Word documents are ZIP containers; the extension is always fixed by the
  // declared MIME type, so a renamed ZIP cannot be served as anything else.
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return 'docx';
  return null;
}

export function matchesDeclaredMime(head: Buffer, mimetype: string): boolean {
  const expected = MIME_TYPES[String(mimetype || '').toLowerCase()];
  return Boolean(expected) && detectFileType(head) === expected;
}

export async function verifyFileSignature(filePath: string, mimetype: string): Promise<boolean> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const head = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(head, 0, HEADER_BYTES, 0);
    return matchesDeclaredMime(head.subarray(0, bytesRead), mimetype);
  } finally {
    await handle.close();
  }
}
