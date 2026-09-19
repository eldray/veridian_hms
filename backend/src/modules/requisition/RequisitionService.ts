import { BaseService } from '../../shared/base/BaseService';
import { RequisitionRepository } from './RequisitionRepository';
import { StockItemRepository } from '../stockItem/StockItemRepository';
import {
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  UpdateRequisitionStatusDTO,
  ApproveRequisitionItemsDTO,
  RequisitionQueryParams
} from './RequisitionTypes';
import { getCounterService } from '../../services/CounterService'; // ✅ ADDED
import { PrismaClient } from '@prisma/client';

// ✅ STRICT STATE MACHINE: Defines valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'cancelled'],
  approved: ['fulfilled', 'cancelled'],
  fulfilled: [], // Terminal state
  cancelled: []  // Terminal state
};

export class RequisitionService extends BaseService {
  private repository: RequisitionRepository;
  private stockRepo: StockItemRepository;
  
  constructor(repository: RequisitionRepository, prisma: PrismaClient) {
    super('RequisitionService');
    this.repository = repository;
    this.stockRepo = new StockItemRepository(prisma);
  }

  async getAllRequisitions(params: RequisitionQueryParams) {
    this.logInfo('Fetching all requisitions', { params });
    const { requisitions, total } = await this.repository.findAll(params);
    const page = params.page || 1;
    const limit = params.limit || 50;

    return {
      requisitions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getRequisitionById(id: string) {
    this.logDebug('Fetching requisition by ID', { id });
    const requisition = await this.repository.findById(id);
    if (!requisition) throw new Error('Requisition not found');
    return requisition;
  }

  async createRequisition(data: CreateRequisitionDTO, userId: string) {
    this.logInfo('Creating new requisition', {
      departmentId: data.requestingDepartmentId,
      wardId: data.requestingWardId,
      urgency: data.urgency
    });

    // ✅ Requester must be exactly one of: a department OR a ward
    if (!data.requestingDepartmentId && !data.requestingWardId) {
      throw new Error('A requesting department or ward is required');
    }
    if (data.requestingDepartmentId && data.requestingWardId) {
      throw new Error('Provide either a requesting department or a ward, not both');
    }

    if (!data.requisitionItems || data.requisitionItems.length === 0) {
      throw new Error('At least one item is required');
    }

    // ✅ FIXED: Uses atomic CounterService instead of DB count
    const requisitionNumber = getCounterService().nextRequisitionNumber(); 

    const requisition = await this.repository.create(data, userId, requisitionNumber);
    this.logInfo('Requisition created successfully', { requisitionId: requisition.id, requisitionNumber });
    return requisition;
  }

  async updateRequisitionStatus(id: string, data: UpdateRequisitionStatusDTO, userId: string | undefined) {
    this.logInfo('Updating requisition status', { id, targetStatus: data.status });
    
    const existingRequisition = await this.repository.findById(id);
    if (!existingRequisition) throw new Error('Requisition not found');

    // ✅ FIXED: Enforce State Machine
    const currentStatus = existingRequisition.status;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(data.status)) {
      throw new Error(`Invalid status transition. Cannot change from '${currentStatus}' to '${data.status}'. Allowed: [${allowedNextStatuses.join(', ')}]`);
    }

    const requisition = await this.repository.updateStatus(id, data.status, userId, data.notes);
    this.logInfo('Requisition status updated', { id, status: requisition.status });
    return requisition;
  }

  async deleteRequisition(id: string) {
    this.logInfo('Deleting requisition', { id });
    const existingRequisition = await this.repository.findById(id);
    if (!existingRequisition) throw new Error('Requisition not found');

    if (existingRequisition.status !== 'draft') {
      throw new Error('Only draft requisitions can be deleted');
    }

    await this.repository.delete(id);
    this.logInfo('Requisition deleted successfully', { id });
  }

  async approveRequisitionItems(id: string, data: ApproveRequisitionItemsDTO, userId: string | undefined) {
    this.logInfo('Approving requisition items', { id, itemCount: data.approvedItems.length });
    if (!data.approvedItems || data.approvedItems.length === 0) throw new Error('At least one approved item is required');

    const requisition = await this.repository.approveItems(id, data.approvedItems, userId);
    this.logInfo('Requisition items approved', { id });
    return requisition;
  }

  async fulfillRequisition(id: string, userId: string | undefined) {
    this.logInfo('Fulfilling requisition with stock validation', { id, userId });
    
    const requisition = await this.repository.findById(id);
    if (!requisition) throw new Error('Requisition not found');
    
    if (requisition.status !== 'approved') {
      throw new Error('Only approved requisitions can be fulfilled');
    }
    
    if (!requisition.RequisitionItem || requisition.RequisitionItem.length === 0) {
      throw new Error('No items to fulfill');
    }
    
    // ✅ CRITICAL: Check stock availability for each item
    const insufficientStock: Array<{ itemName: string; requested: number; available: number }> = [];
    
    for (const reqItem of requisition.RequisitionItem) {
      const quantityToIssue = reqItem.quantityApproved || reqItem.quantityRequested;
      
      // Get current stock from database (fresh data)
      const stockItem = await this.stockRepo.findById(reqItem.stockItemId);
      if (!stockItem) {
        throw new Error(`Stock item "${reqItem.StockItem?.name}" not found`);
      }
      
      if (stockItem.currentStock < quantityToIssue) {
        insufficientStock.push({
          itemName: stockItem.name,
          requested: quantityToIssue,
          available: stockItem.currentStock
        });
      }
    }
    
    if (insufficientStock.length > 0) {
      const errorMsg = insufficientStock.map(item => 
        `${item.itemName}: Requested ${item.requested}, Available ${item.available}`
      ).join('; ');
      throw new Error(`Insufficient stock for: ${errorMsg}`);
    }
    
    // ✅ All checks passed - proceed with fulfillment using transaction
    return this.repository.fulfillRequisitionWithStockUpdate(id, userId, this.prisma);
  }

  async updateRequisition(id: string, data: UpdateRequisitionDTO, userId: string | undefined) {
    this.logInfo('Updating requisition', { id });
    const existingRequisition = await this.repository.findById(id);
    if (!existingRequisition) throw new Error('Requisition not found');

    if (existingRequisition.status !== 'draft') {
      throw new Error('Only draft requisitions can be updated');
    }

    const requisition = await this.repository.update(id, data, existingRequisition);
    this.logInfo('Requisition updated successfully', { id });
    return requisition;
  }
}