import { describe, expect, it } from 'vitest';
import { generateUploadFilename } from '../src/utils/uploadFilename';

describe('upload filenames', () => {
  it('uses the accepted MIME type instead of the client extension', () => {
    const name = generateUploadFilename('patient', 'p1', {
      originalname: 'report.html',
      mimetype: 'image/png',
    }, 1000);

    expect(name).toBe('patient_p1_report_1000.png');
  });

  it('normalizes equivalent image types', () => {
    const name = generateUploadFilename('user', 'u1', {
      originalname: 'avatar.jpeg',
      mimetype: 'image/jpeg',
    }, 5);

    expect(name).toBe('user_u1_avatar_5.jpg');
  });

  it('keeps PDF and Word documents in their safe extensions', () => {
    expect(generateUploadFilename('doc', 'd1', {
      originalname: 'result.pdf',
      mimetype: 'application/pdf',
    }, 1)).toBe('doc_d1_result_1.pdf');

    expect(generateUploadFilename('doc', 'd1', {
      originalname: 'letter.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }, 1)).toBe('doc_d1_letter_1.docx');
  });

  it('strips path separators and unsafe characters from the id', () => {
    const name = generateUploadFilename('scan', '../../etc/passwd', {
      originalname: 'img.png',
      mimetype: 'image/png',
    }, 7);

    expect(name).toBe('scan_______etc_passwd_img_7.png');
    expect(name).not.toContain('/');
    expect(name).not.toContain('..');
  });

  it('rejects a MIME type that was not accepted by the upload filter', () => {
    expect(() => generateUploadFilename('patient', 'p1', {
      originalname: 'payload.svg',
      mimetype: 'image/svg+xml',
    })).toThrow('Unsupported file type');
  });
});
