// modules/document/DocumentRepository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentRepository {
  
  // ============================================
  // DOCUMENT (GeneratedDocument) METHODS
  // ============================================
  
  async createDocument(data: {
    templateId: string;
    entityType: string;
    entityId: string;
    filePath: string;
    generatedById: string;
  }) {
    return prisma.generatedDocument.create({
      data: {
        templateId: data.templateId,
        entityType: data.entityType,
        entityId: data.entityId,
        filePath: data.filePath,
        generatedById: data.generatedById,
        generatedAt: new Date()
      }
    });
  }

  async findDocumentsByEntity(entityType: string, entityId: string) {
    return prisma.generatedDocument.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        template: true,
        generatedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      },
      orderBy: { generatedAt: 'desc' }
    });
  }

  async findDocumentById(id: string) {
    return prisma.generatedDocument.findUnique({
      where: { id },
      include: {
        template: true,
        generatedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
  }

  // ============================================
  // TEMPLATE METHODS
  // ============================================
  
  async findAllTemplates() {
    return prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findTemplateById(id: string) {
    return prisma.documentTemplate.findUnique({
      where: { id }
    });
  }

  async findTemplateByCode(code: string) {
    return prisma.documentTemplate.findFirst({
      where: { code }
    });
  }

  async createTemplate(data: {
    name: string;
    code: string;
    templateType: string;
    content: string;
    isDefault: boolean;
    createdById: string;
  }) {
    return prisma.documentTemplate.create({
      data: {
        name: data.name,
        code: data.code,
        templateType: data.templateType as any,
        content: data.content,
        isDefault: data.isDefault,
        isActive: true,
        createdById: data.createdById
      }
    });
  }

  async updateTemplate(id: string, data: {
    name?: string;
    content?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }) {
    return prisma.documentTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async deleteTemplate(id: string) {
    return prisma.documentTemplate.delete({
      where: { id }
    });
  }

  async getDefaultTemplate(templateType: string) {
    return prisma.documentTemplate.findFirst({
      where: {
        templateType: templateType as any,
        isDefault: true,
        isActive: true
      }
    });
  }
}