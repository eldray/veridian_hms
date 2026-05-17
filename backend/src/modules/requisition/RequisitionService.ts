// RequisitionService.ts - Business logic layer for requisition module

import { RequisitionRepository } from './RequisitionRepository';
import {
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  UpdateRequisitionStatusDTO,
  ApproveRequisitionItemsDTO,
  RequisitionQueryParams
} from './RequisitionTypes';

export class RequisitionService {
  private repository: RequisitionRepository;

  constructor(repository: RequisitionRepository) {
    this.repository = repository;
  }

  async getAllRequisitions(params: RequisitionQueryParams) {
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
    const requisition = await this.repository.findById(id);
    
    if (!requisition) {
      throw new Error('Requisition not found');
    }

    return requisition;
  }

  async createRequisition(data: CreateRequisitionDTO, userId: string) {
    // Validate requisition items
    if (!data.requisitionItems || data.requisitionItems.length === 0) {
      throw new Error('At least one item is required');
    }

    // Generate requisition number
    const count = await this.repository.count();
    const requisitionNumber = `REQ-${(count + 1).toString().padStart(6, '0')}`;

    return this.repository.create(data, userId, requisitionNumber);
  }

  async updateRequisitionStatus(
    id: string,
    data: UpdateRequisitionStatusDTO,
    userId: string | undefined
  ) {
    const existingRequisition = await this.repository.findById(id);

    if (!existingRequisition) {
      throw new Error('Requisition not found');
    }

    return this.repository.updateStatus(id, data.status, userId, data.notes);
  }

  async deleteRequisition(id: string) {
    const existingRequisition = await this.repository.findById(id);

    if (!existingRequisition) {
      throw new Error('Requisition not found');
    }

    if (existingRequisition.status !== 'draft') {
      throw new Error('Only draft requisitions can be deleted');
    }

    return this.repository.delete(id);
  }

  async approveRequisitionItems(
    id: string,
    data: ApproveRequisitionItemsDTO,
    userId: string | undefined
  ) {
    // Validate approved items
    if (!data.approvedItems || data.approvedItems.length === 0) {
      throw new Error('At least one approved item is required');
    }

    return this.repository.approveItems(id, data.approvedItems, userId);
  }

  async updateRequisition(
    id: string,
    data: UpdateRequisitionDTO,
    userId: string | undefined
  ) {
    const existingRequisition = await this.repository.findById(id);

    if (!existingRequisition) {
      throw new Error('Requisition not found');
    }

    if (existingRequisition.status !== 'draft') {
      throw new Error('Only draft requisitions can be updated');
    }

    return this.repository.update(id, data, existingRequisition);
  }
}
