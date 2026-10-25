import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectFileType, matchesDeclaredMime, verifyFileSignature } from '../src/utils/fileSignature';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF = Buffer.from('GIF89a\x01\x00', 'latin1');
const WEBP = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from('WEBPVP8 ', 'latin1')]);
const PDF = Buffer.from('%PDF-1.7\n', 'latin1');
const DOC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>', 'latin1');

describe('upload file signatures', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects the file types the upload filters accept', () => {
    expect(detectFileType(PNG)).toBe('png');
    expect(detectFileType(JPEG)).toBe('jpeg');
    expect(detectFileType(GIF)).toBe('gif');
    expect(detectFileType(WEBP)).toBe('webp');
    expect(detectFileType(PDF)).toBe('pdf');
    expect(detectFileType(DOC)).toBe('doc');
    expect(detectFileType(DOCX)).toBe('docx');
  });

  it('accepts content that matches the declared MIME type', () => {
    expect(matchesDeclaredMime(PNG, 'image/png')).toBe(true);
    expect(matchesDeclaredMime(JPEG, 'image/jpeg')).toBe(true);
    expect(matchesDeclaredMime(JPEG, 'image/jpg')).toBe(true);
    expect(matchesDeclaredMime(PDF, 'application/pdf')).toBe(true);
    expect(matchesDeclaredMime(DOCX, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
  });

  it('rejects HTML renamed to an accepted type', () => {
    expect(detectFileType(HTML)).toBeNull();
    expect(matchesDeclaredMime(HTML, 'image/png')).toBe(false);
    expect(matchesDeclaredMime(HTML, 'application/pdf')).toBe(false);
  });

  it('rejects a real image declared as a different type', () => {
    expect(matchesDeclaredMime(PNG, 'image/jpeg')).toBe(false);
    expect(matchesDeclaredMime(PDF, 'image/png')).toBe(false);
  });

  it('rejects unknown or missing MIME types even when the bytes are valid', () => {
    expect(matchesDeclaredMime(PNG, 'image/svg+xml')).toBe(false);
    expect(matchesDeclaredMime(PNG, '')).toBe(false);
  });

  it('rejects truncated files that are shorter than the signature', () => {
    expect(matchesDeclaredMime(Buffer.from([0x89, 0x50]), 'image/png')).toBe(false);
    expect(matchesDeclaredMime(Buffer.alloc(0), 'image/png')).toBe(false);
  });

  it('reads the signature from a file on disk', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hms-signature-'));
    tempDirs.push(dir);

    const good = path.join(dir, 'photo.png');
    fs.writeFileSync(good, PNG);
    await expect(verifyFileSignature(good, 'image/png')).resolves.toBe(true);

    const bad = path.join(dir, 'photo.png.html');
    fs.writeFileSync(bad, HTML);
    await expect(verifyFileSignature(bad, 'image/png')).resolves.toBe(false);
  });

  it('rejects a file that disappeared before the check', async () => {
    await expect(verifyFileSignature(path.join(os.tmpdir(), 'hms-missing-file.png'), 'image/png')).rejects.toThrow();
  });
});
