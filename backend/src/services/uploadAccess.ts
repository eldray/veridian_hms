import type { UserRole } from '@prisma/client';
import prisma from '../core/database/prisma.client';

// Knowing a filename must not be enough to read a clinical file. A file is
// served only when a database record still references it, and the viewer's
// role may read that kind of record.

const SUPPORTED_CATEGORIES = new Set(['patients', 'users', 'hospital', 'scans', 'documents']);

const ADMIN_ROLES = new Set<string>(['admin', 'super_admin']);

// Patient photographs and scan images are clinical records. Accounts and HR
// handle financial/employment data and have no clinical need to open them.
const CLINICAL_IMAGE_ROLES = new Set<string>([
  'doctor',
  'nurse',
  'midwife',
  'records',
  'lab_tech',
  'pharmacist',
  'sonographer',
]);

// Generated documents are scoped by their actual content, not just their parent
// encounter. Otherwise a laboratory or pharmacy role could open prescriptions,
// discharge summaries or other encounter documents unrelated to their work.
const DOCUMENT_TEMPLATE_ROLES: Record<string, Set<string>> = {
  receipt: new Set(['accounts', 'records']),
  bill_statement: new Set(['accounts', 'records']),
  referral_letter: new Set(['doctor', 'nurse', 'midwife', 'records']),
  discharge_summary: new Set(['doctor', 'nurse', 'midwife', 'records']),
  admission_letter: new Set(['doctor', 'nurse', 'midwife', 'records']),
  lab_result: new Set(['doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'sonographer']),
  scan_report: new Set(['doctor', 'nurse', 'midwife', 'records', 'sonographer']),
  prescription: new Set(['doctor', 'nurse', 'midwife', 'records', 'pharmacist']),
  nhia_claim_form: new Set(['accounts', 'records']),
};

// Fallback for older generated documents whose template relation is unavailable.
const DOCUMENT_ENTITY_ROLES: Record<string, Set<string>> = {
  bill: new Set(['accounts', 'records']),
  referral: new Set(['doctor', 'nurse', 'midwife', 'records']),
  encounter: new Set(['doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist']),
  admission: new Set(['doctor', 'nurse', 'midwife', 'records']),
};

export interface FileViewer {
  id: string;
  role: UserRole | string;
}

type UploadAccessDb = {
  patient: { findFirst: (args: any) => Promise<{ id: string } | null> };
  scan: { findFirst: (args: any) => Promise<{ id: string } | null> };
  user: { findFirst: (args: any) => Promise<{ id: string } | null> };
  hospital: { findFirst: (args: any) => Promise<{ id: string } | null> };
  document: { findFirst: (args: any) => Promise<{ staff: { userId: string } } | null> };
  generatedDocument: {
    findFirst: (args: any) => Promise<{ entityType: string; generatedById: string; template?: { templateType?: string } | null } | null>;
  };
};

function storedUrls(category: string, filename: string): string[] {
  // Controllers use both forms: /uploads/... in most modules and
  // /api/uploads/... for user photos.
  return [`/uploads/${category}/${filename}`, `/api/uploads/${category}/${filename}`];
}

export function canAccessGeneratedDocument(
  viewer: FileViewer,
  document: { entityType: string; generatedById: string; templateType?: string | null },
): boolean {
  const role = String(viewer.role || '').toLowerCase();
  if (ADMIN_ROLES.has(role)) return true;
  if (document.templateType) {
    return DOCUMENT_TEMPLATE_ROLES[document.templateType]?.has(role) ?? false;
  }
  return DOCUMENT_ENTITY_ROLES[document.entityType]?.has(role) ?? false;
}

export async function canAccessUpload(
  viewer: FileViewer,
  category: string,
  filename: string,
  db: UploadAccessDb = prisma as unknown as UploadAccessDb,
): Promise<boolean> {
  if (!viewer?.id || !SUPPORTED_CATEGORIES.has(category)) return false;

  const role = String(viewer.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.has(role);
  const urls = storedUrls(category, filename);

  switch (category) {
    case 'patients': {
      const patient = await db.patient.findFirst({
        where: { imageUrl: { in: urls } },
        select: { id: true },
      });
      return Boolean(patient) && (isAdmin || CLINICAL_IMAGE_ROLES.has(role));
    }

    case 'scans': {
      const scan = await db.scan.findFirst({
        where: { imageUrls: { hasSome: urls } },
        select: { id: true },
      });
      return Boolean(scan) && (isAdmin || CLINICAL_IMAGE_ROLES.has(role));
    }

    case 'users': {
      // Staff directory photos are not patient data; any active staff member
      // may see them, but only when the photo still belongs to a user.
      const owner = await db.user.findFirst({
        where: { imageUrl: { in: urls } },
        select: { id: true },
      });
      return Boolean(owner);
    }

    case 'hospital': {
      // The logo is branding, not patient data, but it is still served only while
      // the hospital row points at it, so a replaced logo stops resolving.
      const referenced = await db.hospital.findFirst({
        where: { imageUrl: { in: urls } },
        select: { id: true },
      });
      return Boolean(referenced);
    }

    case 'documents': {
      const [staffDocument, generated] = await Promise.all([
        db.document.findFirst({
          where: { fileUrl: { in: urls } },
          select: { staff: { select: { userId: true } } },
        }),
        db.generatedDocument.findFirst({
          where: { filePath: { in: urls } },
          select: { entityType: true, generatedById: true, template: { select: { templateType: true } } },
        }),
      ]);

      if (staffDocument) {
        return (
          isAdmin ||
          role === 'hr_officer' ||
          staffDocument.staff?.userId === viewer.id
        );
      }

      if (generated) {
        return canAccessGeneratedDocument(viewer, {
          entityType: generated.entityType,
          generatedById: generated.generatedById,
          templateType: generated.template?.templateType,
        });
      }

      return false;
    }

    default:
      return false;
  }
}
