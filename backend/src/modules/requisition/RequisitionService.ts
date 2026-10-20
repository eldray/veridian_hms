import { ValidationError } from '../../utils/errors';
import { BaseService } from '../../shared/base/BaseService';
import { RequisitionRepository } from './RequisitionRepository';
import { StockItemRepository } from '../stockItem/StockItemRepository';
import {
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  UpdateRequisitionStatusDTO,
  ApproveRequisitionItemsDTO,
  RequisitionQueryParams,
  StockLookupParams
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
  private prisma: PrismaClient;
  
  constructor(repository: RequisitionRepository, prisma: PrismaClient) {
    super('RequisitionService');
    this.repository = repository;
    this.prisma = prisma;
    this.stockRepo = new StockItemRepository(prisma);
  }

  /** Who may act on a requisition: requester submits/cancels, supplying department approves/fulfils. */
  private async assertCanAct(requisition: any, userId: string | undefined, action: 'submitted' | 'cancelled' | 'approved' | 'fulfilled') {
    if (!userId) throw new ValidationError('User not authenticated');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, departmentId: true } });
    if (!user) throw new ValidationError('User not found');
    if (user.role === 'admin') return;

    const isRequester = requisition.requestedById === userId || (!!user.departmentId && user.departmentId === requisition.requestingDepartmentId);
    const isSupplier = !!requisition.supplyingDepartmentId && user.departmentId === requisition.supplyingDepartmentId;

    if (action === 'submitted' && !isRequester) throw new ValidationError('Only the requesting department can submit this requisition');
    if (action === 'cancelled' && !isRequester && !isSupplier) throw new ValidationError('You cannot cancel this requisition');
    if ((action === 'approved' || action === 'fulfilled')) {
      // Legacy requisitions without a supplier fall back to the role check done by the route
      if (requisition.supplyingDepartmentId && !isSupplier) {
        throw new ValidationError(`Only ${requisition.supplyingDepartment?.name || 'the supplying department'} can ${action === 'approved' ? 'approve' : 'fulfil'} this requisition`);
      }
    }
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
    const requisition: any = await this.repository.findById(id);
    if (!requisition) throw new Error('Requisition not found');

    // Show the supplier's (and requester's) CURRENT quantities next to each requested line
    const ids = (requisition.RequisitionItem || []).map((i: any) => i.stockItemId);
    const [supplierQty, requesterQty] = await Promise.all([
      requisition.supplyingDepartmentId ? this.repository.getDepartmentQuantities(requisition.supplyingDepartmentId, ids) : Promise.resolve(new Map<string, number>()),
      requisition.requestingDepartmentId ? this.repository.getDepartmentQuantities(requisition.requestingDepartmentId, ids) : Promise.resolve(new Map<string, number>())
    ]);
    requisition.RequisitionItem = (requisition.RequisitionItem || []).map((i: any) => ({
      ...i, supplierQty: supplierQty.get(i.stockItemId) ?? 0, requesterQty: requesterQty.get(i.stockItemId) ?? 0
    }));
    return requisition;
  }

  async createRequisition(data: CreateRequisitionDTO, userId: string) {
    this.logInfo('Creating new requisition', {
      departmentId: data.requestingDepartmentId, wardId: data.requestingWardId,
      supplierId: data.supplyingDepartmentId, urgency: data.urgency
    });

    // The requester is the user's OWN department (or a ward they pick). Admins may choose any department.
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true, role: true } });
    const isAdmin = user?.role === 'admin';

    if (!data.requestingWardId) {
      if (!isAdmin || !data.requestingDepartmentId) data.requestingDepartmentId = user?.departmentId || data.requestingDepartmentId;
    }
    if (!data.requestingDepartmentId && !data.requestingWardId) {
      throw new ValidationError('Your account is not assigned to a department. Ask an administrator to assign one, or select a ward.');
    }
    if (data.requestingDepartmentId && data.requestingWardId) {
      // A ward request is made on behalf of the ward; the department is implied by the user
      data.requestingDepartmentId = undefined;
    }

    // Supplier: where the goods come from
    if (!data.supplyingDepartmentId) throw new ValidationError('Select the department/store you are requesting from');
    const supplier = await this.prisma.department.findUnique({ where: { id: data.supplyingDepartmentId }, select: { id: true, isActive: true, name: true } });
    if (!supplier || !supplier.isActive) throw new ValidationError('The selected supplying department is not available');
    if (data.requestingDepartmentId && data.requestingDepartmentId === data.supplyingDepartmentId) {
      throw new ValidationError('You cannot request items from your own department');
    }

    if (!data.requisitionItems || data.requisitionItems.length === 0) {
      throw new ValidationError('At least one item is required');
    }
    const seen = new Set<string>();
    for (const item of data.requisitionItems) {
      if (!item.stockItemId) throw new ValidationError('Every line needs an item');
      if (!Number.isInteger(item.quantityRequested) || item.quantityRequested < 1) {
        throw new ValidationError('Quantities must be whole numbers of at least 1');
      }
      if (seen.has(item.stockItemId)) throw new ValidationError('The same item appears more than once. Combine the quantities into one line.');
      seen.add(item.stockItemId);
    }

    const requisitionNumber = getCounterService().nextRequisitionNumber();
    const requisition = await this.repository.create(data, userId, requisitionNumber);
    this.logInfo('Requisition created successfully', { requisitionId: requisition.id, requisitionNumber });
    return requisition;
  }

  /** Search items with the supplier's (and requester's) usable quantities. */
  async lookupStock(params: StockLookupParams) {
    if (!params.supplierDepartmentId) throw new ValidationError('supplierDepartmentId is required');
    return this.repository.stockLookup(params);
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

    await this.assertCanAct(existingRequisition, userId, data.status as any);
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

    for (const a of data.approvedItems) {
      if (!Number.isInteger(a.quantityApproved) || a.quantityApproved < 0) throw new ValidationError('Approved quantities must be whole numbers (0 or more)');
    }
    const existing: any = await this.repository.findById(id);
    if (existing) await this.assertCanAct(existing, userId, 'approved');
    if (existing?.supplyingDepartmentId) {
      const qty = await this.repository.getDepartmentQuantities(existing.supplyingDepartmentId, existing.RequisitionItem.map((i: any) => i.stockItemId));
      for (const a of data.approvedItems) {
        const line = existing.RequisitionItem.find((i: any) => i.id === a.requisitionItemId);
        if (line && a.quantityApproved > (qty.get(line.stockItemId) ?? 0)) {
          throw new ValidationError(`Cannot approve ${a.quantityApproved} of ${line.StockItem?.name}: ${existing.supplyingDepartment?.name || 'the supplier'} only has ${qty.get(line.stockItemId) ?? 0}`);
        }
      }
    }
    const requisition = await this.repository.approveItems(id, data.approvedItems, userId);
    this.logInfo('Requisition items approved', { id });
    return requisition;
  }

  async fulfillRequisition(id: string, userId: string | undefined) {
    this.logInfo('Fulfilling requisition', { id, userId });
    const requisition = await this.repository.findById(id);
    if (!requisition) throw new Error('Requisition not found');
    if (requisition.status !== 'approved') throw new Error('Only approved requisitions can be fulfilled');
    await this.assertCanAct(requisition, userId, 'fulfilled');
    // Stock is validated against the supplying department inside the transaction
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