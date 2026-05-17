/**
 * Service Catalog Controller
 * HTTP request handlers for service catalog operations
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ServiceType, ServiceCategory, PaymentMode } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';
import { BaseController } from '../../shared/base/BaseController';

const prisma = new PrismaClient();

export class ServiceCatalogController extends BaseController {

  // ==============================================
  // GET ALL SERVICE CATALOG ITEMS
  // ==============================================
  async getServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        serviceType, 
        category, 
        search, 
        isActive, 
        page = 1, 
        limit = 50 
      } = req.query;
      
      const where: any = {};
      
      if (serviceType) where.serviceType = serviceType as ServiceType;
      if (category) where.serviceCategory = category as ServiceCategory;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { nhisServiceCode: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const [services, total] = await Promise.all([
        prisma.serviceCatalog.findMany({
          where,
          include: {
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
                effectiveDate: true
              }
            },
            Diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                description: true,
                isActive: true
              }
            },
            LabTestTemplate: {
              select: {
                id: true,
                name: true,
                investigationCode: true,
                category: true
              }
            },
            ProcedureTemplate: {
              select: {
                id: true,
                name: true,
                procedureCode: true,
                category: true
              }
            },
            ScanTemplate: {
              select: {
                id: true,
                name: true,
                scanCode: true,
                category: true
              }
            },
            StockItem: {
              select: {
                id: true,
                name: true,
                drugCode: true,
                strength: true,
                currentStock: true
              }
            },
            Ward: {
              select: {
                id: true,
                wardName: true,
                wardType: true
              }
            },
            ConsultationType: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            User: {
              select: {
                id: true,
                fullName: true,
                username: true
              }
            },
            _count: {
              select: {
                ServiceRendered: true,
                BillLineItem: true,
                labTests: true,
                scans: true,
                procedures: true,
                medications: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: limitNum
        }),
        prisma.serviceCatalog.count({ where })
      ]);

      this.ok(res, {
        data: services,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
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
        include: {
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
              expiryDate: true
            }
          },
          Diagnosis: {
            select: {
              id: true,
              name: true,
              icdCode: true,
              description: true,
              isActive: true
            }
          },
          LabTestTemplate: {
            select: {
              id: true,
              name: true,
              investigationCode: true,
              category: true,
              specimenType: true
            }
          },
          ProcedureTemplate: {
            select: {
              id: true,
              name: true,
              procedureCode: true,
              category: true,
              department: true
            }
          },
          ScanTemplate: {
            select: {
              id: true,
              name: true,
              scanCode: true,
              category: true,
              bodyPart: true
            }
          },
          StockItem: {
            select: {
              id: true,
              name: true,
              drugCode: true,
              strength: true,
              category: true,
              currentStock: true,
              unitOfMeasure: true
            }
          },
          Ward: {
            select: {
              id: true,
              wardName: true,
              wardType: true,
              totalBeds: true,
              occupiedBeds: true
            }
          },
          ConsultationType: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          User: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true
            }
          }
        }
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
  // CREATE SERVICE CATALOG ITEM
  // ==============================================
  async createServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        code,
        description,
        serviceType,
        serviceCategory = 'opd',
        subType,
        nhisServiceCode,
        isNHISCovered = true,
        nhisCoverageType = 'full',
        nhisRequiresAuth = false,
        privateInsRequiresAuth = false,
        isPrivateInsuranceExempted = false,
        unit = 'Each',
        requiresClinicalNotes = false,
        metadata,
        diagnosisId,
        labTestTemplateId,
        procedureTemplateId,
        stockItemId,
        wardId,
        scanTemplateId,
        consultationTypeId,
        cashPrice,
        nhisPrice = 0,
        insurancePrice,
        corporatePrice,
        vatRate = 0,
        isTaxable = true,
        isActive = true
      } = req.body;

      // Validate required fields
      if (!name || !code || !serviceType) {
        this.badRequest(res, 'Name, code, and service type are required');
        return;
      }

      // Check if service code already exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { code }
      });

      if (existingService) {
        this.badRequest(res, `Service code '${code}' already exists`);
        return;
      }

      const finalInsurancePrice = insurancePrice !== undefined ? insurancePrice : cashPrice;
      const finalCorporatePrice = corporatePrice !== undefined ? corporatePrice : cashPrice;

      // Create service catalog item with pricing in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const serviceItem = await tx.serviceCatalog.create({
          data: {
            name,
            code,
            description: description || null,
            serviceType: serviceType as ServiceType,
            serviceCategory: serviceCategory as ServiceCategory,
            subType: subType || null,
            nhisServiceCode: nhisServiceCode || null,
            isNHISCovered,
            nhisCoverageType,
            nhisRequiresAuth,
            privateInsRequiresAuth,
            isPrivateInsuranceExempted,
            unit,
            requiresClinicalNotes,
            metadata: metadata || null,
            isPending: false,
            isActive,
            diagnosisId: diagnosisId || null,
            labTestTemplateId: labTestTemplateId || null,
            procedureTemplateId: procedureTemplateId || null,
            stockItemId: stockItemId || null,
            wardId: wardId || null,
            scanTemplateId: scanTemplateId || null,
            consultationTypeId: consultationTypeId || null,
            createdById: req.user?.id
          }
        });

        // Create pricing record with all four payment modes
        await tx.servicePricing.create({
          data: {
            serviceCatalogId: serviceItem.id,
            cashPrice: parseFloat(cashPrice),
            nhisPrice: parseFloat(nhisPrice),
            insurancePrice: parseFloat(finalInsurancePrice),
            corporatePrice: parseFloat(finalCorporatePrice),
            vatRate: parseFloat(vatRate),
            isTaxable,
            effectiveDate: new Date(),
            isActive: true
          }
        });

        return serviceItem;
      });

      const createdService = await prisma.serviceCatalog.findUnique({
        where: { id: result.id },
        include: {
          pricing: true
        }
      });

      this.created(res, createdService, 'Service catalog item created successfully');
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

      // Check if service exists
      const existingService = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: { pricing: true }
      });

      if (!existingService) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      const serviceUpdateData: any = {};
      const pricingUpdateData: any = {};

      // Map frontend fields to backend schema
      if (updateData.name !== undefined) serviceUpdateData.name = updateData.name;
      if (updateData.code !== undefined) serviceUpdateData.code = updateData.code;
      if (updateData.description !== undefined) serviceUpdateData.description = updateData.description;
      if (updateData.serviceType !== undefined) serviceUpdateData.serviceType = updateData.serviceType;
      if (updateData.serviceCategory !== undefined) serviceUpdateData.serviceCategory = updateData.serviceCategory;
      if (updateData.subType !== undefined) serviceUpdateData.subType = updateData.subType;
      if (updateData.nhisServiceCode !== undefined) serviceUpdateData.nhisServiceCode = updateData.nhisServiceCode;
      if (updateData.isNHISCovered !== undefined) serviceUpdateData.isNHISCovered = updateData.isNHISCovered;
      if (updateData.nhisCoverageType !== undefined) serviceUpdateData.nhisCoverageType = updateData.nhisCoverageType;
      if (updateData.nhisRequiresAuth !== undefined) serviceUpdateData.nhisRequiresAuth = updateData.nhisRequiresAuth;
      if (updateData.privateInsRequiresAuth !== undefined) serviceUpdateData.privateInsRequiresAuth = updateData.privateInsRequiresAuth;
      if (updateData.isPrivateInsuranceExempted !== undefined) serviceUpdateData.isPrivateInsuranceExempted = updateData.isPrivateInsuranceExempted;
      if (updateData.unit !== undefined) serviceUpdateData.unit = updateData.unit;
      if (updateData.requiresClinicalNotes !== undefined) serviceUpdateData.requiresClinicalNotes = updateData.requiresClinicalNotes;
      if (updateData.metadata !== undefined) serviceUpdateData.metadata = updateData.metadata;
      if (updateData.isActive !== undefined) serviceUpdateData.isActive = updateData.isActive;
      
      // Handle related IDs
      if (updateData.diagnosisId !== undefined) serviceUpdateData.diagnosisId = updateData.diagnosisId || null;
      if (updateData.labTestTemplateId !== undefined) serviceUpdateData.labTestTemplateId = updateData.labTestTemplateId || null;
      if (updateData.procedureTemplateId !== undefined) serviceUpdateData.procedureTemplateId = updateData.procedureTemplateId || null;
      if (updateData.stockItemId !== undefined) serviceUpdateData.stockItemId = updateData.stockItemId || null;
      if (updateData.wardId !== undefined) serviceUpdateData.wardId = updateData.wardId || null;
      if (updateData.scanTemplateId !== undefined) serviceUpdateData.scanTemplateId = updateData.scanTemplateId || null;
      if (updateData.consultationTypeId !== undefined) serviceUpdateData.consultationTypeId = updateData.consultationTypeId || null;

      // Handle pricing fields (all four payment modes)
      if (updateData.cashPrice !== undefined) pricingUpdateData.cashPrice = updateData.cashPrice;
      if (updateData.nhisPrice !== undefined) pricingUpdateData.nhisPrice = updateData.nhisPrice;
      if (updateData.insurancePrice !== undefined) pricingUpdateData.insurancePrice = updateData.insurancePrice;
      if (updateData.corporatePrice !== undefined) pricingUpdateData.corporatePrice = updateData.corporatePrice;
      if (updateData.vatRate !== undefined) pricingUpdateData.vatRate = updateData.vatRate;
      if (updateData.isTaxable !== undefined) pricingUpdateData.isTaxable = updateData.isTaxable;

      // Update in transaction
      await prisma.$transaction(async (tx) => {
        if (Object.keys(serviceUpdateData).length > 0) {
          await tx.serviceCatalog.update({
            where: { id },
            data: {
              ...serviceUpdateData,
              updatedAt: new Date()
            }
          });
        }

        if (Object.keys(pricingUpdateData).length > 0) {
          const existingPricing = await tx.servicePricing.findUnique({
            where: { serviceCatalogId: id }
          });

          if (existingPricing) {
            await tx.servicePricing.update({
              where: { serviceCatalogId: id },
              data: {
                ...pricingUpdateData,
                updatedAt: new Date()
              }
            });
          } else {
            await tx.servicePricing.create({
              data: {
                serviceCatalogId: id,
                cashPrice: pricingUpdateData.cashPrice || 0,
                nhisPrice: pricingUpdateData.nhisPrice || 0,
                insurancePrice: pricingUpdateData.insurancePrice || 0,
                corporatePrice: pricingUpdateData.corporatePrice || 0,
                vatRate: pricingUpdateData.vatRate || 0,
                isTaxable: pricingUpdateData.isTaxable !== undefined ? pricingUpdateData.isTaxable : true,
                effectiveDate: new Date(),
                isActive: true
              }
            });
          }
        }
      });

      const updatedService = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: { pricing: true }
      });

      this.ok(res, updatedService, 'Service updated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error updating service catalog item');
    }
  }

  // ==============================================
  // DELETE SERVICE CATALOG ITEM
  // ==============================================
  async deleteServiceCatalog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existingService = await prisma.serviceCatalog.findUnique({
        where: { id },
        include: {
          pricing: true,
          ServiceRendered: { take: 1 },
          BillLineItem: { take: 1 },
          labTests: { take: 1 },
          scans: { take: 1 },
          procedures: { take: 1 },
          medications: { take: 1 }
        }
      });

      if (!existingService) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      const hasDependencies = 
        existingService.ServiceRendered.length > 0 ||
        existingService.BillLineItem.length > 0 ||
        existingService.labTests.length > 0 ||
        existingService.scans.length > 0 ||
        existingService.procedures.length > 0 ||
        existingService.medications.length > 0;

      if (hasDependencies) {
        this.badRequest(res, 'Cannot delete service catalog item with associated records. Deactivate it instead.');
        return;
      }

      await prisma.$transaction(async (tx) => {
        if (existingService.pricing) {
          await tx.servicePricing.delete({
            where: { serviceCatalogId: id }
          });
        }

        await tx.serviceCatalog.delete({
          where: { id }
        });
      });

      this.ok(res, { id: existingService.id, name: existingService.name }, 'Service catalog item deleted successfully');
    } catch (error) {
      this.handleError(res, error, 'Error deleting service catalog item');
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

      const service = await prisma.serviceCatalog.findUnique({
        where: { id }
      });

      if (!service) {
        this.notFound(res, 'Service catalog item not found');
        return;
      }

      const updatedService = await prisma.serviceCatalog.update({
        where: { id },
        data: {
          isActive,
          updatedAt: new Date()
        },
        include: { pricing: true }
      });

      this.ok(res, updatedService, `Service ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      this.handleError(res, error, 'Error toggling service status');
    }
  }

  // ==============================================
  // GET SERVICES BY CATEGORY
  // ==============================================
  async getServicesByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      
      const validCategories = ['opd', 'ipd', 'diagnostics', 'pharmacy', 'other'];
      if (!validCategories.includes(category)) {
        this.badRequest(res, 'Invalid service category. Valid options: opd, ipd, diagnostics, pharmacy, other');
        return;
      }

      const services = await prisma.serviceCatalog.findMany({
        where: {
          serviceCategory: category as ServiceCategory,
          isActive: true
        },
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              corporatePrice: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      this.ok(res, {
        category,
        count: services.length,
        services
      }, 'Services retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Error fetching services by category');
    }
  }

  // ==============================================
  // CHECK SERVICE COVERAGE (UPDATED for Corporate)
  // ==============================================
  async checkServiceCoverage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceId, paymentMode } = req.body;
      
      if (!serviceId || !paymentMode) {
        this.badRequest(res, 'serviceId and paymentMode are required');
        return;
      }

      const validPaymentModes = ['cash', 'nhis', 'private_insurance', 'corporate'];
      if (!validPaymentModes.includes(paymentMode)) {
        this.badRequest(res, 'Invalid payment mode. Valid options: cash, nhis, private_insurance, corporate');
        return;
      }

      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceId },
        include: { pricing: true }
      });

      if (!service || !service.pricing) {
        this.notFound(res, 'Service not found or pricing not configured');
        return;
      }

      let isCovered = false;
      let coverageAmount = 0;
      let patientPayable = 0;
      let price = 0;

      switch (paymentMode) {
        case 'cash':
          price = service.pricing.cashPrice;
          isCovered = false;
          patientPayable = price;
          break;
        case 'nhis':
          price = service.pricing.nhisPrice;
          isCovered = service.isNHISCovered;
          coverageAmount = isCovered ? price : 0;
          patientPayable = isCovered ? 0 : service.pricing.cashPrice;
          break;
        case 'private_insurance':
          price = service.pricing.insurancePrice;
          isCovered = !service.isPrivateInsuranceExempted;
          coverageAmount = isCovered ? price : 0;
          patientPayable = isCovered ? 0 : service.pricing.cashPrice;
          break;
        case 'corporate':
          price = service.pricing.corporatePrice;
          isCovered = true; // Corporate accounts are always covered
          coverageAmount = price;
          patientPayable = 0; // Corporate pays fully, patient pays nothing
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
        cashPrice: service.pricing.cashPrice,
        nhisPrice: service.pricing.nhisPrice,
        insurancePrice: service.pricing.insurancePrice,
        corporatePrice: service.pricing.corporatePrice,
        requiresAuthorization: paymentMode === 'nhis' ? service.nhisRequiresAuth : 
                             paymentMode === 'private_insurance' ? service.privateInsRequiresAuth : false
      }, 'Service coverage checked successfully');
    } catch (error) {
      this.handleError(res, error, 'Error checking service coverage');
    }
  }

  // ==============================================
  // CALCULATE SERVICE COST (UPDATED for Corporate)
  // ==============================================
  async calculateServiceCost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceId, paymentMode, quantity = 1 } = req.body;
      
      if (!serviceId || !paymentMode) {
        this.badRequest(res, 'serviceId and paymentMode are required');
        return;
      }

      const validPaymentModes = ['cash', 'nhis', 'private_insurance', 'corporate'];
      if (!validPaymentModes.includes(paymentMode)) {
        this.badRequest(res, 'Invalid payment mode. Valid options: cash, nhis, private_insurance, corporate');
        return;
      }

      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceId },
        include: { pricing: true }
      });

      if (!service || !service.pricing) {
        this.notFound(res, 'Service not found or pricing not configured');
        return;
      }

      const qty = parseInt(quantity) || 1;
      let unitPrice = 0;
      let totalAmount = 0;
      let coverageAmount = 0;
      let patientAmount = 0;
      let vatAmount = 0;

      switch (paymentMode) {
        case 'cash':
          unitPrice = service.pricing.cashPrice;
          totalAmount = unitPrice * qty;
          patientAmount = totalAmount;
          break;
        case 'nhis':
          unitPrice = service.pricing.nhisPrice;
          totalAmount = service.pricing.cashPrice * qty;
          coverageAmount = service.isNHISCovered ? unitPrice * qty : 0;
          patientAmount = totalAmount - coverageAmount;
          break;
        case 'private_insurance':
          unitPrice = service.pricing.insurancePrice;
          totalAmount = service.pricing.cashPrice * qty;
          coverageAmount = !service.isPrivateInsuranceExempted ? unitPrice * qty : 0;
          patientAmount = totalAmount - coverageAmount;
          break;
        case 'corporate':
          unitPrice = service.pricing.corporatePrice;
          totalAmount = unitPrice * qty;
          coverageAmount = totalAmount;
          patientAmount = 0;
          break;
      }

      // Calculate VAT if applicable
      if (service.pricing.isTaxable) {
        vatAmount = (patientAmount * service.pricing.vatRate) / 100;
        patientAmount += vatAmount;
      }

      this.ok(res, {
        service: {
          id: service.id,
          name: service.name,
          code: service.code
        },
        quantity: qty,
        paymentMode,
        totalAmount,
        coverageAmount,
        patientAmount,
        vatAmount,
        breakdown: {
          unitPrice,
          cashPrice: service.pricing.cashPrice,
          nhisPrice: service.pricing.nhisPrice,
          insurancePrice: service.pricing.insurancePrice,
          corporatePrice: service.pricing.corporatePrice,
          vatRate: service.pricing.vatRate,
          isTaxable: service.pricing.isTaxable
        }
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
      const [categories, serviceTypes] = await Promise.all([
        prisma.serviceCatalog.findMany({
          distinct: ['serviceCategory'],
          select: { serviceCategory: true },
          where: { serviceCategory: { not: null } }
        }),
        prisma.serviceCatalog.findMany({
          distinct: ['serviceType'],
          select: { serviceType: true }
        })
      ]);

      const nhisServicesCount = await prisma.serviceCatalog.count({
        where: { 
          nhisServiceCode: { not: null },
          nhisServiceCode: { not: "" },
          isActive: true
        }
      });

      const totalActiveServices = await prisma.serviceCatalog.count({
        where: { isActive: true }
      });

      this.ok(res, {
        categories: categories.map(c => c.serviceCategory).filter(Boolean),
        serviceTypes: serviceTypes.map(st => st.serviceType).filter(Boolean),
        nhisSummary: {
          totalNHISReady: nhisServicesCount,
          totalActiveServices,
          coveragePercentage: totalActiveServices > 0 ? (nhisServicesCount / totalActiveServices) * 100 : 0
        }
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
        include: { 
          pricing: {
            select: { nhisPrice: true }
          }
        }
      });
      
      const report = {
        totalServices: services.length,
        nhisReady: services.filter(s => s.nhisServiceCode && s.isNHISCovered && s.pricing?.nhisPrice > 0).length,
        missingNHISCodes: services.filter(s => !s.nhisServiceCode).length,
        missingNHISPrices: services.filter(s => s.nhisServiceCode && (!s.pricing || s.pricing.nhisPrice === 0)).length,
        notCovered: services.filter(s => !s.isNHISCovered).length,
        byServiceType: services.reduce((acc, service) => {
          const type = service.serviceType;
          if (!acc[type]) {
            acc[type] = { total: 0, nhisReady: 0, missingCode: 0, missingPrice: 0, notCovered: 0 };
          }
          acc[type].total++;
          if (service.nhisServiceCode && service.pricing?.nhisPrice > 0) acc[type].nhisReady++;
          if (!service.nhisServiceCode) acc[type].missingCode++;
          if (service.nhisServiceCode && (!service.pricing || service.pricing.nhisPrice === 0)) acc[type].missingPrice++;
          if (!service.isNHISCovered) acc[type].notCovered++;
          return acc;
        }, {} as any),
        servicesMissingNHIS: services
          .filter(s => !s.nhisServiceCode || !s.pricing?.nhisPrice)
          .map(s => ({ 
            id: s.id, 
            name: s.name, 
            code: s.code, 
            serviceType: s.serviceType,
            serviceCategory: s.serviceCategory,
            missingCode: !s.nhisServiceCode, 
            missingPrice: !s.pricing?.nhisPrice 
          }))
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
        where: { 
          nhisServiceCode: nhisCode,
          isActive: true
        },
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              corporatePrice: true
            }
          }
        }
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
}

export const serviceCatalogController = new ServiceCatalogController();