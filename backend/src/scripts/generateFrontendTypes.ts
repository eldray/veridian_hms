// src/scripts/generateFrontendTypes.ts
// npm run gen:types
import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRISMA_SCHEMA_PATH = path.resolve(__dirname, '../../prisma/schema.prisma');
const OUTPUT_FILE = path.resolve(__dirname, '../../frontend/src/types/backendTypes.ts');

// Map Prisma types to TypeScript types
const prismaToTsTypeMap: Record<string, string> = {
  'String': 'string',
  'Int': 'number',
  'Float': 'number',
  'Boolean': 'boolean',
  'DateTime': 'string', // Convert DateTime to string for frontend
  'Json': 'any',
  'Decimal': 'number',
};

/**
 * Convert Prisma field type to TypeScript type
 */
function toTypeScriptType(fieldType: string, isOptional: boolean): string {
  let tsType = prismaToTsTypeMap[fieldType] || fieldType;
  
  // Handle optional fields
  if (isOptional) {
    tsType += ' | null';
  }
  
  return tsType;
}

/**
 * Extract model definitions from Prisma schema
 */
function parsePrismaSchema(schemaContent: string): any {
  const models: Record<string, any> = {};
  let currentModel: string | null = null;
  
  const lines = schemaContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Start of model
    if (trimmed.startsWith('model ')) {
      currentModel = trimmed.split(' ')[1];
      models[currentModel] = { fields: [] };
      continue;
    }
    
    // End of model
    if (trimmed === '}' && currentModel) {
      currentModel = null;
      continue;
    }
    
    // Field definition
    if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(\s+@.*)?$/);
      if (fieldMatch) {
        const [, fieldName, fieldType, optionalMarker] = fieldMatch;
        const isOptional = optionalMarker === '?';
        
        models[currentModel].fields.push({
          name: fieldName,
          type: fieldType,
          optional: isOptional,
          raw: trimmed
        });
      }
    }
  }
  
  return models;
}

async function generateTypes(): Promise<void> {
  if (!fs.existsSync(PRISMA_SCHEMA_PATH)) {
    console.error(`❌ Prisma schema not found: ${PRISMA_SCHEMA_PATH}`);
    process.exit(1);
  }

  const schemaContent = fs.readFileSync(PRISMA_SCHEMA_PATH, 'utf-8');
  const models = parsePrismaSchema(schemaContent);

  if (Object.keys(models).length === 0) {
    console.error('❌ No models found in Prisma schema.');
    process.exit(1);
  }

  const project = new Project();
  const sourceFile = project.createSourceFile(OUTPUT_FILE, '', { overwrite: true });

  // Add header comment
  sourceFile.addStatements([
    '// AUTO-GENERATED from Prisma schema',
    '// DO NOT EDIT MANUALLY',
    '// Generated on: ' + new Date().toISOString(),
    ''
  ]);

  // Generate interfaces for each model
  for (const [modelName, modelData] of Object.entries(models)) {
    const interfaceDeclaration = sourceFile.addInterface({
      name: modelName,
      isExported: true,
      properties: []
    });

    // Add fields
    modelData.fields.forEach((field: any) => {
      // Skip relation fields that start with lowercase (handled separately if needed)
      if (field.name === field.name.toLowerCase() && !['id', 'createdAt', 'updatedAt'].includes(field.name)) {
        const tsType = toTypeScriptType(field.type, field.optional);
        
        interfaceDeclaration.addProperty({
          name: field.name,
          type: tsType,
          hasQuestionToken: field.optional
        });
      }
    });

    // Add common timestamp fields if they exist in the model
    const hasCreatedAt = modelData.fields.some((f: any) => f.name === 'createdAt');
    const hasUpdatedAt = modelData.fields.some((f: any) => f.name === 'updatedAt');
    
    if (hasCreatedAt) {
      interfaceDeclaration.addProperty({
        name: 'createdAt',
        type: 'string'
      });
    }
    
    if (hasUpdatedAt) {
      interfaceDeclaration.addProperty({
        name: 'updatedAt',
        type: 'string'
      });
    }

    sourceFile.addStatements(['']);
  }

  // Add common API response types
  sourceFile.addStatements([
    '// Common API Response Types',
    'export interface ApiResponse<T> {',
    '  success: boolean;',
    '  data: T;',
    '  message?: string;',
    '}',
    '',
    'export interface PaginatedResponse<T> {',
    '  data: T[];',
    '  pagination: {',
    '    page: number;',
    '    limit: number;',
    '    total: number;',
    '    pages: number;',
    '  };',
    '}',
    '',
    '// Common Form Data Types',
    'export interface CreatePatientData {',
    '  fullName: string;',
    '  dateOfBirth: string;',
    '  gender: string;',
    '  contact: string;',
    '  emergencyContact?: string;',
    '  address?: string;',
    '  nhisNumber?: string;',
    '}',
    '',
    'export interface CreateAdmissionData {',
    '  patientId: string;',
    '  wardId: string;',
    '  bedId: string;',
    '  reasonForAdmission: string;',
    '  diagnosis: string;',
    '  admittingDoctor: string;',
    '}',
    '',
    'export interface CreateAttendanceData {',
    '  patientId: string;',
    '  attendanceType: string;',
    '  paymentMode: string;',
    '  attendingClinician: string;',
    '  department: string;',
    '}',
    '',
    'export interface BillItemData {',
    '  description: string;',
    '  quantity: number;',
    '  unitPrice: number;',
    '  serviceItemId?: string;',
    '}',
    '',
    'export interface CreateBillData {',
    '  patientId: string;',
    '  attendanceId: string;',
    '  paymentMode: string;',
    '  items: BillItemData[];',
    '}',
    '',
    '// NHIS Specific Types',
    'export interface NHISClaimStatus {',
    '  attendanceNumber: string;',
    '  patientName: string;',
    '  isClaimReady: boolean;',
    '  validation: {',
    '    canSubmit: boolean;',
    '    errors: string[];',
    '  };',
    '  missingRequirements: {',
    '    nhisNumber: boolean;',
    '    primaryDiagnosis: boolean;',
    '    servicesWithMissingCodes: string[];',
    '  };',
    '}',
    '',
    '// Search and Filter Types',
    'export interface PatientSearchFilters {',
    '  search?: string;',
    '  gender?: string;',
    '  isActive?: boolean;',
    '}',
    '',
    'export interface AdmissionFilters {',
    '  status?: string;',
    '  wardId?: string;',
    '  startDate?: string;',
    '  endDate?: string;',
    '}',
    ''
  ]);

  await sourceFile.save();
  
  console.log(`✅ Generated ${Object.keys(models).length} interfaces from Prisma schema`);
  console.log(`📁 ${OUTPUT_FILE}`);
}

generateTypes().catch(console.error);