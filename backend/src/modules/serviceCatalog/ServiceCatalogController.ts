/**
 * Service Catalog Controller
 * Aligned with Prisma schema — ServicePricing: cashPrice, nhisPrice, insurancePrice, corporatePrice
 */

import { Response } from 'express';
import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';
import { BaseController } from '../../shared/base/BaseController';

const prisma = new PrismaClient();

export class ServiceCatalogController extends BaseController {

  // ==============================================
  // SHARED INCLUDE HELPERS
  // ==============================================
  private get fullInclude() {
    return {
      pricing: {
        select: {
          id: true,
          cashPrice: true,
          nhisPrice: true,
          insurancePrice: true,
          corporatePrice: true,
          vatRate: true,
          isTaxable: true,
          isActive: true,
          effectiveDate: true,
          expiryDate: true,
        },
      },
      Diagnosis: {
        select: { id: true, name: true, icdCode: true, description: true, isActive: true },
      },
      LabTestTemplate: {
        select: { id: true, name: true, investigationCode: true, category: true, specimenType: true },
      },
      ProcedureTemplate: {
        select: { id: true, name: true, procedureCode: true, category: true, department: true },
      },
      ScanTemplate: {
        select: { id: true, name: true, scanCode: true, category: true, bodyPart: true },
      },
      StockItem: {
        select: { id: true, name: true, drugCode: true, strength: true, category: true, currentStock: true, unitOfMeasure: true },
      },
      Ward: {
        select: { id: true, wardName: true, wardType: true, totalBeds: true, occupiedBeds: true },
      },
      ConsultationType: {
        select: { id: true, name: true, code: true },
      },
      User: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    };
  }

  private get listInclude() {
    return {
      pricing: {
        select: {
          id: true,
          cashPrice: true,
          nhisPrice: true,
          insurancePrice: true,
          corporatePrice: true,
          vatRate: true,
          isTaxable: true,
          isActive: true,
          effectiveDate: true,
        },
      },
      Diagnosis: { select: { id: true, name: true, icdCode: true } },
      LabTestTemplate: { select: { id: true, name: true, investigationCode: true, category: true } },
      ProcedureTemplate: { select: { id: true, name: true, procedureCode: true, category: true } },
      ScanTemplate: { select: { id: true, name: true, scanCode: true, category: true } },
      StockItem: { select: { id: true, name: true, drugCode: true, strength: true, currentStock: true } },
      Ward: { select: { id: true, wardName: true, wardType: true } },
      ConsultationType: { select: { id: true, name: true, code: true } },
      User: { select: { id: true, fullName: true, username: true } },
      _count: {
        select: {
          ServiceRendered: true,
          BillLineItem: true,
          labTests: true,
          scans: true,
          procedures: true,
          medications: true,
        },
      },
    };
  }

  // Helper to resolve price by payment mode
  private resolvePrice(pricing: any, paymentMode: string): number {
    switch (paymentMode) {
      case 'cash':             return pricing.cashPrice;
      case 'nhis':             return pricing.nhisPrice;
      case 'private_insurance': return pricing.insurancePrice;
      case 'corporate':        return pricing.corporatePrice;
      default:                 return pricing.cashPrice;
    }
  }

  // ==============================================
  // GET ALL SERVICE CATALOG ITEMS
  // ==============================================
  async getServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceType, category, search, isActive, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (serviceType) where.serviceType = serviceType as ServiceType;
      if (category) where.serviceCategory = category as ServiceCategory;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { nhisServiceCode: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const [services, total] = await Promise.all([
        prisma.serviceCatalog.findMany({
          where,
          include: this.listInclude,
          orderBy: { name: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.serviceCatalog.count({ where }),
      ]);

      this.ok(res, {
        data: services,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      }, 'Service catalog retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching service catalog');
    }
  }

  // ==============================================
  // GET SERVICE CATALOG ITEM BY ID
  // ==============================================
  async getServiceCatalogById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const serviceItem = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: this.fullInclude,
      });

      if (!serviceItem) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      this.ok(res, serviceItem, 'Service catalog item retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching service catalog item');
    }
  }

  // ==============================================
  // GET NHIS SERVICES
  // ==============================================
  async getNHISServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, page = 1, limit = 50 } = req.query;

      const where: any = {
        isNHISCovered: true,
        isActive: true,
        nhisServiceCode: { not: null },
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { nhisServiceCode: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(500, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const [services, total] = await Promise.all([
        prisma.serviceCatalog.findMany({
          where,
          include: {
            pricing: {
              select: {
                cashPrice: true,
                nhisPrice: true,
                insurancePrice: true,
                corporatePrice: true,
                vatRate: true,
              },
            },
          },
          orderBy: { name: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.serviceCatalog.count({ where }),
      ]);

      this.ok(res, {
        data: services,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      }, 'NHIS services retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching NHIS services');
    }
  }

  // ==============================================
  // GET SERVICE STATISTICS
  // ==============================================
  async getServiceStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [
        totalServices,
        activeServices,
        byType,
        byCategory,
        nhisReady,
        withPricing,
      ] = await Promise.all([
        prisma.serviceCatalog.count(),
        prisma.serviceCatalog.count({ where: { isActive: true } }),
        prisma.serviceCatalog.groupBy({
          by: ['serviceType'],
          _count: { serviceType: true },
        }),
        prisma.serviceCatalog.groupBy({
          by: ['serviceCategory'],
          _count: { serviceCategory: true },
        }),
        prisma.serviceCatalog.count({
          where: {
            isNHISCovered: true,
            isActive: true,
            nhisServiceCode: { not: null },
            pricing: { nhisPrice: { gt: 0 } },
          },
        }),
        prisma.serviceCatalog.count({
          where: { pricing: { isNot: null } },
        }),
      ]);

      this.ok(res, {
        totalServices,
        activeServices,
        inactiveServices: totalServices - activeServices,
        nhisReady,
        withPricing,
        missingPricing: totalServices - withPricing,
        byType: byType.reduce((acc, item) => {
          acc[item.serviceType] = item._count.serviceType;
          return acc;
        }, {} as Record<string, number>),
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.serviceCategory] = item._count.serviceCategory;
          return acc;
        }, {} as Record<string, number>),
      }, 'Service statistics retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching service statistics');
    }
  }

  // ==============================================
  // CREATE SERVICE CATALOG ITEM
  // ==============================================
  async createServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name, code, description, serviceType,
        serviceCategory = 'opd', subType,
        nhisServiceCode, isNHISCovered = true,
        nhisCoverageType = 'full', nhisRequiresAuth = false,
        privateInsRequiresAuth = false, isPrivateInsuranceExempted = false,
        unit = 'Each', requiresClinicalNotes = false,
        metadata, tariffCode,
        diagnosisId, labTestTemplateId, procedureTemplateId,
        stockItemId, wardId, scanTemplateId, consultationTypeId, gdrgTariffId,
        // ✅ All 4 payment mode prices
        cashPrice, nhisPrice = 0, insurancePrice, corporatePrice,
        vatRate = 0, isTaxable = true, isActive = true,
      } = req.body;

      if (!name || !code || !serviceType) {
        this.badRequest(res, 'Name, code, and service type are required');
        return;
      }

      if (cashPrice === undefined || cashPrice === null) {
        this.badRequest(res, 'cashPrice is required');
        return;
      }

      const validServiceTypes: ServiceType[] = [
        'consultation', 'ward', 'lab_test', 'scan',
        'medication', 'procedure', 'diagnosis', 'miscellaneous',
      ];
      if (!validServiceTypes.includes(serviceType)) {
        this.badRequest(res, `Invalid serviceType. Valid: ${validServiceTypes.join(', ')}`);
        return;
      }

      const validCategories: ServiceCategory[] = ['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'];
      if (!validCategories.includes(serviceCategory)) {
        this.badRequest(res, `Invalid serviceCategory. Valid: ${validCategories.join(', ')}`);
        return;
      }

      const existing = await prisma.serviceCatalog.findUnique({ where: { code } });
      if (existing) {
        this.badRequest(res, `Service code '${code}' already exists`);
        return;
      }

      const parsedCash = parseFloat(cashPrice);
      // Default insurancePrice and corporatePrice to cashPrice if not provided
      const parsedInsurance = insurancePrice !== undefined ? parseFloat(insurancePrice) : parsedCash;
      const parsedCorporate = corporatePrice !== undefined ? parseFloat(corporatePrice) : parsedInsurance;

      const result = await prisma.$transaction(async (tx) => {
        const serviceItem = await tx.serviceCatalog.create({
          data: {
            name, code,
            description: description || null,
            serviceType: serviceType as ServiceType,
            serviceCategory: serviceCategory as ServiceCategory,
            subType: subType || null,
            nhisServiceCode: nhisServiceCode || null,
            isNHISCovered, nhisCoverageType,
            nhisRequiresAuth, privateInsRequiresAuth, isPrivateInsuranceExempted,
            unit, requiresClinicalNotes,
            metadata: metadata || null,
            tariffCode: tariffCode || null,
            isPending: false, isActive,
            diagnosisId: diagnosisId || null,
            labTestTemplateId: labTestTemplateId || null,
            procedureTemplateId: procedureTemplateId || null,
            stockItemId: stockItemId || null,
            wardId: wardId || null,
            scanTemplateId: scanTemplateId || null,
            consultationTypeId: consultationTypeId || null,
            gdrgTariffId: gdrgTariffId || null,
            createdById: req.user?.id,
          },
        });

        await tx.servicePricing.create({
          data: {
            serviceCatalogId: serviceItem.id,
            cashPrice: parsedCash,
            nhisPrice: parseFloat(nhisPrice),
            insurancePrice: parsedInsurance,
            corporatePrice: parsedCorporate,  // ✅
            vatRate: parseFloat(vatRate),
            isTaxable,
            effectiveDate: new Date(),
            isActive: true,
          },
        });

        return serviceItem;
      });

      const created = await prisma.serviceCatalog.findUnique({
        where: { id: result.id },
        include: this.fullInclude,
      });

      this.created(res, created, 'Service catalog item created successfully');
    } catch (error) {
      this.handleError(res, error, 'Error creating service catalog item');
    }
  }

  // ==============================================
  // UPDATE SERVICE CATALOG ITEM
  // ==============================================
  async updateServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingService = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: { pricing: true },
      });

      if (!existingService) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      // Check for code conflict if code is being changed
      if (updateData.code && updateData.code !== existingService.code) {
        const codeConflict = await prisma.serviceCatalog.findUnique({
          where: { code: updateData.code },
        });
        if (codeConflict) {
          this.badRequest(res, `Service code '${updateData.code}' already exists`);
          return;
        }
      }

      const serviceFields = [
        'name', 'code', 'description', 'serviceType', 'serviceCategory',
        'subType', 'nhisServiceCode', 'isNHISCovered', 'nhisCoverageType',
        'nhisRequiresAuth', 'privateInsRequiresAuth', 'isPrivateInsuranceExempted',
        'unit', 'requiresClinicalNotes', 'metadata', 'isActive', 'tariffCode',
        'diagnosisId', 'labTestTemplateId', 'procedureTemplateId',
        'stockItemId', 'wardId', 'scanTemplateId', 'consultationTypeId', 'gdrgTariffId',
      ];

      const pricingFields = [
        'cashPrice', 'nhisPrice', 'insurancePrice', 'corporatePrice', // ✅ all 4
        'vatRate', 'isTaxable',
      ];

      const serviceUpdateData: any = {};
      const pricingUpdateData: any = {};

      for (const field of serviceFields) {
        if (updateData[field] !== undefined) {
          // Nullable relation IDs: pass null explicitly if empty string
          const nullableIds = [
            'diagnosisId', 'labTestTemplateId', 'procedureTemplateId',
            'stockItemId', 'wardId', 'scanTemplateId', 'consultationTypeId', 'gdrgTariffId',
          ];
          serviceUpdateData[field] = nullableIds.includes(field)
            ? (updateData[field] || null)
            : updateData[field];
        }
      }

      for (const field of pricingFields) {
        if (updateData[field] !== undefined) {
          pricingUpdateData[field] = typeof updateData[field] === 'string'
            ? parseFloat(updateData[field])
            : updateData[field];
        }
      }

      await prisma.$transaction(async (tx) => {
        if (Object.keys(serviceUpdateData).length > 0) {
          await tx.serviceCatalog.update({
            where: { id },
            data: { ...serviceUpdateData, updatedAt: new Date() },
          });
        }

        if (Object.keys(pricingUpdateData).length > 0) {
          if (existingService.pricing) {
            await tx.servicePricing.update({
              where: { serviceCatalogId: id },
              data: { ...pricingUpdateData, updatedAt: new Date() },
            });
          } else {
            await tx.servicePricing.create({
              data: {
                serviceCatalogId: id,
                cashPrice: pricingUpdateData.cashPrice ?? 0,
                nhisPrice: pricingUpdateData.nhisPrice ?? 0,
                insurancePrice: pricingUpdateData.insurancePrice ?? 0,
                corporatePrice: pricingUpdateData.corporatePrice ?? 0, // ✅
                vatRate: pricingUpdateData.vatRate ?? 0,
                isTaxable: pricingUpdateData.isTaxable ?? true,
                effectiveDate: new Date(),
                isActive: true,
              },
            });
          }
        }
      });

      const updated = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: this.fullInclude,
      });

      this.ok(res, updated, 'Service updated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error updating service catalog item');
    }
  }

  // ==============================================
  // UPDATE PRICING ONLY
  // ==============================================
  async updatePricing(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cashPrice, nhisPrice, insurancePrice, corporatePrice, vatRate, isTaxable } = req.body;

      const service = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: { pricing: true },
      });

      if (!service) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      const pricingData = {
        ...(cashPrice !== undefined      && { cashPrice: parseFloat(cashPrice) }),
        ...(nhisPrice !== undefined      && { nhisPrice: parseFloat(nhisPrice) }),
        ...(insurancePrice !== undefined && { insurancePrice: parseFloat(insurancePrice) }),
        ...(corporatePrice !== undefined && { corporatePrice: parseFloat(corporatePrice) }), // ✅
        ...(vatRate !== undefined        && { vatRate: parseFloat(vatRate) }),
        ...(isTaxable !== undefined      && { isTaxable }),
      };

      let pricing;
      if (service.pricing) {
        pricing = await prisma.servicePricing.update({
          where: { serviceCatalogId: id },
          data: { ...pricingData, updatedAt: new Date() },
        });
      } else {
        pricing = await prisma.servicePricing.create({
          data: {
            serviceCatalogId: id,
            cashPrice: parseFloat(cashPrice) || 0,
            nhisPrice: parseFloat(nhisPrice) || 0,
            insurancePrice: parseFloat(insurancePrice) || 0,
            corporatePrice: parseFloat(corporatePrice) || 0,  // ✅
            vatRate: parseFloat(vatRate) || 0,
            isTaxable: isTaxable ?? true,
            effectiveDate: new Date(),
            isActive: true,
          },
        });
      }

      this.ok(res, pricing, 'Pricing updated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error updating pricing');
    }
  }

  // ==============================================
  // TOGGLE SERVICE ACTIVE STATUS
  // ==============================================
  async toggleServiceStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        this.badRequest(res, 'isActive field is required');
        return;
      }

      const service = await prisma.serviceCatalog.findUnique({ where: { id } });
      if (!service) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      const updated = await prisma.serviceCatalog.update({
        where: { id },
        data: { isActive, updatedAt: new Date() },
        include: { pricing: true },
      });

      this.ok(res, updated, `Service ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      this.handleError(res, error, 'Error toggling service status');
    }
  }

  // ==============================================
  // DELETE SERVICE CATALOG ITEM
  // ==============================================
  async deleteServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existing = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: {
          pricing: true,
          ServiceRendered: { take: 1 },
          BillLineItem: { take: 1 },
          labTests: { take: 1 },
          scans: { take: 1 },
          procedures: { take: 1 },
          medications: { take: 1 },
        },
      });

      if (!existing) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      const hasDependencies =
        existing.ServiceRendered.length > 0 ||
        existing.BillLineItem.length > 0 ||
        existing.labTests.length > 0 ||
        existing.scans.length > 0 ||
        existing.procedures.length > 0 ||
        existing.medications.length > 0;

      if (hasDependencies) {
        this.badRequest(res, 'Cannot delete service with associated records. Deactivate it instead.');
        return;
      }

      await prisma.$transaction(async (tx) => {
        if (existing.pricing) {
          await tx.servicePricing.delete({ where: { serviceCatalogId: id } });
        }
        await tx.serviceCatalog.delete({ where: { id } });
      });

      this.ok(res, { id: existing.id, name: existing.name }, 'Service catalog item deleted successfully');
    } catch (error) {
      this.handleError(res, error, 'Error deleting service catalog item');
    }
  }

  // ==============================================
  // GET SERVICES BY CATEGORY
  // ==============================================
  async getServicesByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category } = req.params;

      const validCategories: ServiceCategory[] = ['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'];
      if (!validCategories.includes(category as ServiceCategory)) {
        this.badRequest(res, `Invalid category. Valid: ${validCategories.join(', ')}`);
        return;
      }

      const services = await prisma.serviceCatalog.findMany({
        where: { serviceCategory: category as ServiceCategory, isActive: true },
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              corporatePrice: true,  // ✅
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      this.ok(res, { category, count: services.length, services }, 'Services retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching services by category');
    }
  }

  // ==============================================
  // CHECK SERVICE COVERAGE
  // ==============================================
  async checkServiceCoverage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceId, paymentMode } = req.body;

      if (!serviceId || !paymentMode) {
        this.badRequest(res, 'serviceId and paymentMode are required');
        return;
      }

      const validModes = ['cash', 'nhis', 'private_insurance', 'corporate'];
      if (!validModes.includes(paymentMode)) {
        this.badRequest(res, `Invalid payment mode. Valid: ${validModes.join(', ')}`);
        return;
      }

      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceId },
        include: { pricing: true },
      });

      if (!service || !service.pricing) {
        this.notFound(res, 'Service not found or pricing not configured');
        return;
      }

      const p = service.pricing;
      let isCovered = false;
      let coverageAmount = 0;
      let patientPayable = 0;
      let price = 0;

      switch (paymentMode) {
        case 'cash':
          price = p.cashPrice;
          patientPayable = price;
          break;
        case 'nhis':
          price = p.nhisPrice;
          isCovered = service.isNHISCovered;
          coverageAmount = isCovered ? price : 0;
          patientPayable = isCovered ? 0 : p.cashPrice;
          break;
        case 'private_insurance':
          price = p.insurancePrice;
          isCovered = !service.isPrivateInsuranceExempted;
          coverageAmount = isCovered ? price : 0;
          patientPayable = isCovered ? 0 : p.cashPrice;
          break;
        case 'corporate':
          price = p.corporatePrice;   // ✅
          isCovered = true;
          coverageAmount = price;
          patientPayable = 0;
          break;
      }

      this.ok(res, {
        serviceId,
        serviceName: service.name,
        paymentMode,
        price,
        isCovered,
        coverageAmount,
        patientPayable,
        allPrices: {
          cashPrice: p.cashPrice,
          nhisPrice: p.nhisPrice,
          insurancePrice: p.insurancePrice,
          corporatePrice: p.corporatePrice,  // ✅
        },
        requiresAuthorization:
          paymentMode === 'nhis' ? service.nhisRequiresAuth :
          paymentMode === 'private_insurance' ? service.privateInsRequiresAuth : false,
      }, 'Service coverage checked successfully');
    } catch (error) {
      this.handleError(res, error, 'Error checking service coverage');
    }
  }

  // ==============================================
  // CALCULATE SERVICE COST
  // ==============================================
  async calculateServiceCost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceId, paymentMode, quantity = 1 } = req.body;

      if (!serviceId || !paymentMode) {
        this.badRequest(res, 'serviceId and paymentMode are required');
        return;
      }

      const validModes = ['cash', 'nhis', 'private_insurance', 'corporate'];
      if (!validModes.includes(paymentMode)) {
        this.badRequest(res, `Invalid payment mode. Valid: ${validModes.join(', ')}`);
        return;
      }

      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceId },
        include: { pricing: true },
      });

      if (!service || !service.pricing) {
        this.notFound(res, 'Service not found or pricing not configured');
        return;
      }

      const p = service.pricing;
      const qty = Math.max(1, parseInt(quantity) || 1);
      let unitPrice = 0;
      let totalAmount = 0;
      let coverageAmount = 0;
      let patientAmount = 0;
      let vatAmount = 0;

      switch (paymentMode) {
        case 'cash':
          unitPrice = p.cashPrice;
          totalAmount = unitPrice * qty;
          patientAmount = totalAmount;
          break;
        case 'nhis':
          unitPrice = p.nhisPrice;
          totalAmount = p.cashPrice * qty;
          coverageAmount = service.isNHISCovered ? unitPrice * qty : 0;
          patientAmount = totalAmount - coverageAmount;
          break;
        case 'private_insurance':
          unitPrice = p.insurancePrice;
          totalAmount = p.cashPrice * qty;
          coverageAmount = !service.isPrivateInsuranceExempted ? unitPrice * qty : 0;
          patientAmount = totalAmount - coverageAmount;
          break;
        case 'corporate':
          unitPrice = p.corporatePrice;   // ✅
          totalAmount = unitPrice * qty;
          coverageAmount = totalAmount;
          patientAmount = 0;
          break;
      }

      if (p.isTaxable && p.vatRate > 0) {
        vatAmount = (patientAmount * p.vatRate) / 100;
        patientAmount += vatAmount;
      }

      this.ok(res, {
        service: { id: service.id, name: service.name, code: service.code },
        quantity: qty,
        paymentMode,
        totalAmount,
        coverageAmount,
        patientAmount,
        vatAmount,
        breakdown: {
          unitPrice,
          cashPrice: p.cashPrice,
          nhisPrice: p.nhisPrice,
          insurancePrice: p.insurancePrice,
          corporatePrice: p.corporatePrice,  // ✅
          vatRate: p.vatRate,
          isTaxable: p.isTaxable,
        },
      }, 'Service cost calculated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error calculating service cost');
    }
  }

  // ==============================================
  // GET SERVICE METADATA
  // ==============================================
  async getServiceMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [categories, serviceTypes, nhisCount, totalActive] = await Promise.all([
        prisma.serviceCatalog.findMany({
          distinct: ['serviceCategory'],
          select: { serviceCategory: true },
        }),
        prisma.serviceCatalog.findMany({
          distinct: ['serviceType'],
          select: { serviceType: true },
        }),
        prisma.serviceCatalog.count({
          where: {
            nhisServiceCode: { not: null },
            isActive: true,
          },
        }),
        prisma.serviceCatalog.count({ where: { isActive: true } }),
      ]);

      this.ok(res, {
        categories: categories.map(c => c.serviceCategory).filter(Boolean),
        serviceTypes: serviceTypes.map(s => s.serviceType).filter(Boolean),
        nhisSummary: {
          totalNHISReady: nhisCount,
          totalActiveServices: totalActive,
          coveragePercentage: totalActive > 0 ? Math.round((nhisCount / totalActive) * 100) : 0,
        },
      }, 'Service metadata retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching service metadata');
    }
  }

  // ==============================================
  // GET NHIS READINESS REPORT
  // ==============================================
  async getNHISReadinessReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const services = await prisma.serviceCatalog.findMany({
        where: { isActive: true },
        include: { pricing: { select: { nhisPrice: true } } },
      });

      const report = {
        totalServices: services.length,
        nhisReady: services.filter(s =>
          s.nhisServiceCode && s.isNHISCovered && (s.pricing?.nhisPrice ?? 0) > 0
        ).length,
        missingNHISCodes: services.filter(s => !s.nhisServiceCode).length,
        missingNHISPrices: services.filter(s =>
          s.nhisServiceCode && (!s.pricing || s.pricing.nhisPrice === 0)
        ).length,
        notCovered: services.filter(s => !s.isNHISCovered).length,
        byServiceType: services.reduce((acc, s) => {
          const t = s.serviceType;
          if (!acc[t]) acc[t] = { total: 0, nhisReady: 0, missingCode: 0, missingPrice: 0, notCovered: 0 };
          acc[t].total++;
          if (s.nhisServiceCode && (s.pricing?.nhisPrice ?? 0) > 0) acc[t].nhisReady++;
          if (!s.nhisServiceCode) acc[t].missingCode++;
          if (s.nhisServiceCode && !(s.pricing?.nhisPrice)) acc[t].missingPrice++;
          if (!s.isNHISCovered) acc[t].notCovered++;
          return acc;
        }, {} as Record<string, any>),
        servicesMissingNHIS: services
          .filter(s => !s.nhisServiceCode || !(s.pricing?.nhisPrice))
          .map(s => ({
            id: s.id,
            name: s.name,
            code: s.code,
            serviceType: s.serviceType,
            serviceCategory: s.serviceCategory,
            missingCode: !s.nhisServiceCode,
            missingPrice: !(s.pricing?.nhisPrice),
          })),
      };

      this.ok(res, report, 'NHIS readiness report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating NHIS readiness report');
    }
  }

  // ==============================================
  // GET SERVICE BY NHIS CODE
  // ==============================================
  async getServiceByNHISCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nhisCode } = req.params;

      const service = await prisma.serviceCatalog.findFirst({
        where: { nhisServiceCode: nhisCode, isActive: true },
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              corporatePrice: true,  // ✅
            },
          },
        },
      });

      if (!service) {
        this.notFound(res, 'Service with specified NHIS code not found');
        return;
      }

      this.ok(res, service, 'Service retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching service by NHIS code');
    }
  }

  // ==============================================
  // BULK IMPORT SERVICES
  // ==============================================
  async bulkImportServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { services } = req.body;

      if (!Array.isArray(services) || services.length === 0) {
        this.badRequest(res, 'services array is required and must not be empty');
        return;
      }

      if (services.length > 500) {
        this.badRequest(res, 'Maximum 500 services per bulk import');
        return;
      }

      const results = { created: 0, skipped: 0, errors: [] as string[] };

      for (const svc of services) {
        try {
          if (!svc.name || !svc.code || !svc.serviceType) {
            results.errors.push(`Skipped: missing name/code/serviceType for entry: ${svc.code || 'unknown'}`);
            results.skipped++;
            continue;
          }

          const exists = await prisma.serviceCatalog.findUnique({ where: { code: svc.code } });
          if (exists) {
            results.skipped++;
            continue;
          }

          const cashPrice = parseFloat(svc.cashPrice) || 0;
          const nhisPrice = parseFloat(svc.nhisPrice) || 0;
          const insurancePrice = parseFloat(svc.insurancePrice) ?? cashPrice;
          const corporatePrice = parseFloat(svc.corporatePrice) ?? insurancePrice; // ✅

          await prisma.$transaction(async (tx) => {
            const created = await tx.serviceCatalog.create({
              data: {
                name: svc.name,
                code: svc.code,
                description: svc.description || null,
                serviceType: svc.serviceType as ServiceType,
                serviceCategory: (svc.serviceCategory || 'opd') as ServiceCategory,
                nhisServiceCode: svc.nhisServiceCode || null,
                isNHISCovered: svc.isNHISCovered ?? true,
                nhisCoverageType: svc.nhisCoverageType || 'full',
                unit: svc.unit || 'Each',
                isPending: false,
                isActive: svc.isActive ?? true,
                createdById: req.user?.id,
              },
            });

            await tx.servicePricing.create({
              data: {
                serviceCatalogId: created.id,
                cashPrice,
                nhisPrice,
                insurancePrice,
                corporatePrice,  // ✅
                vatRate: parseFloat(svc.vatRate) || 0,
                isTaxable: svc.isTaxable ?? true,
                effectiveDate: new Date(),
                isActive: true,
              },
            });
          });

          results.created++;
        } catch (err: any) {
          results.errors.push(`Error for '${svc.code}': ${err.message}`);
          results.skipped++;
        }
      }

      this.ok(res, results, `Bulk import completed: ${results.created} created, ${results.skipped} skipped`);
    } catch (error) {
      this.handleError(res, error, 'Error during bulk import');
    }
  }

  // ==============================================
  // EXPORT SERVICES
  // ==============================================
  async exportServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceType, category, isActive } = req.query;

      const where: any = {};
      if (serviceType) where.serviceType = serviceType as ServiceType;
      if (category) where.serviceCategory = category as ServiceCategory;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const services = await prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              corporatePrice: true,  // ✅
              vatRate: true,
              isTaxable: true,
            },
          },
        },
        orderBy: [{ serviceType: 'asc' }, { name: 'asc' }],
      });

      // Shape as flat records for CSV/Excel consumption
      const exportData = services.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        description: s.description ?? '',
        serviceType: s.serviceType,
        serviceCategory: s.serviceCategory,
        subType: s.subType ?? '',
        nhisServiceCode: s.nhisServiceCode ?? '',
        isNHISCovered: s.isNHISCovered,
        nhisCoverageType: s.nhisCoverageType,
        nhisRequiresAuth: s.nhisRequiresAuth,
        privateInsRequiresAuth: s.privateInsRequiresAuth,
        isPrivateInsuranceExempted: s.isPrivateInsuranceExempted,
        unit: s.unit,
        isActive: s.isActive,
        cashPrice: s.pricing?.cashPrice ?? 0,
        nhisPrice: s.pricing?.nhisPrice ?? 0,
        insurancePrice: s.pricing?.insurancePrice ?? 0,
        corporatePrice: s.pricing?.corporatePrice ?? 0,  // ✅
        vatRate: s.pricing?.vatRate ?? 0,
        isTaxable: s.pricing?.isTaxable ?? true,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

      this.ok(res, {
        count: exportData.length,
        services: exportData,
      }, 'Services exported successfully');
    } catch (error) {
      this.handleError(res, error, 'Error exporting services');
    }
  }
}

export const serviceCatalogController = new ServiceCatalogController();