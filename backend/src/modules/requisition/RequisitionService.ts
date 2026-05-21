// RequisitionService.ts - Business logic layer for requisition module
import { BaseService } from '../../shared/base/BaseService';
import { RequisitionRepository } from './RequisitionRepository';
import {
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  UpdateRequisitionStatusDTO,
  ApproveRequisitionItemsDTO,
  RequisitionQueryParams
} from './RequisitionTypes';

export class RequisitionService extends BaseService {
  private repository: RequisitionRepository;

  constructor(repository: RequisitionRepository) {
    super('RequisitionService');
    this.repository = repository;
  }

  async getAllRequisitions(params: RequisitionQueryParams) {
    this.logInfo('Fetching all requisitions', { params });
    const { requisitions, total } = await this.repository.findAll(params);
    const page = params.page || 1;
    const limit = params.limit || 50;

    return {
      requisitions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getRequisitionById(id: string) {
    this.logDebug('Fetching requisition by ID', { id });
    const requisition = await this.repository.findById(id);
    
    if (!requisition) {
      throw new Error('Requisition not found');
    }

    return requisition;
  }

  async createRequisition(data: CreateRequisitionDTO, userId: string) {
    this.logInfo('Creating new requisition', { 
      departmentId: data.requestingDepartmentId, 
      urgency: data.urgency,
      itemCount: data.requisitionItems.length 
    });

    if (!data.requisitionItems || data.requisitionItems.length === 0) {
      throw new Error('At least one item is required');
    }

    const count = await this.repository.count();
    const requisitionNumber = `REQ-${(count + 1).toString().padStart(6, '0')}`;

    const requisition = await this.repository.create(data, userId, requisitionNumber);
    
    this.logInfo('Requisition created successfully', { 
      requisitionId: requisition.id, 
      requisitionNumber 
    });

    return requisition;
  }

  async updateRequisitionStatus(
    id: string,
    data: UpdateRequisitionStatusDTO,
    userId: string | undefined
  ) {
    this.logInfo('Updating requisition status', { id, status: data.status });
    
    const existingRequisition = await this.repository.findById(id);

    if (!existingRequisition) {
      throw new Error('Requisition not found');
    }

    const requisition = await this.repository.updateStatus(id, data.status, userId, data.notes);
    
    this.logInfo('Requisition status updated', { id, status: requisition.status });
    
    return requisition;
  }

  async deleteRequisition(id: string) {
    this.logInfo('Deleting requisition', { id });
    
    const existingRequisition = await this.repository.findById(id);

    if (!existingRequisition) {
      throw new Error('Requisition not found');
    }

    if (existingRequisition.status !== 'draft') {
      throw new Error('Only draft requisitions can be deleted');
    }

    await this.repository.delete(id);
    
    this.logInfo('Requisition deleted successfully', { id });
  }

  async approveRequisitionItems(
    id: string,
    data: ApproveRequisitionItemsDTO,
    userId: string | undefined
  ) {
    this.logInfo('Approving requisition items', { id, itemCount: data.approvedItems.length });
    
    if (!data.approvedItems || data.approvedItems.length === 0) {
      throw new Error('At least one approved item is required');
    }

    const requisition = await this.repository.approveItems(id, data.approvedItems, userId);
    
    this.logInfo('Requisition items approved', { id });
    
    return requisition;
  }

  async updateRequisition(
    id: string,
    data: UpdateRequisitionDTO,
    userId: string | undefined
  ) {
    this.logInfo('Updating requisition', { id });
    
    const existingRequisition = await this.repository.findById(id);

    if (!existingRequisition) {
      throw new Error('Requisition not found');
    }

    if (existingRequisition.status !== 'draft') {
      throw new Error('Only draft requisitions can be updated');
    }

    const requisition = await this.repository.update(id, data, existingRequisition);
    
    this.logInfo('Requisition updated successfully', { id });
    
    return requisition;
  }
}