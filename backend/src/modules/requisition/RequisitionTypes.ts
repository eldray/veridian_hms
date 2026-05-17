// RequisitionTypes.ts - TypeScript types and DTOs for requisition module

export interface RequisitionItemDTO {
  stockItemId: string;
  quantityRequested: number;
  purpose?: string;
  notes?: string;
}

export interface ApprovedItemDTO {
  requisitionItemId: string;
  quantityApproved: number;
  notes?: string;
}

export interface CreateRequisitionDTO {
  requestingDepartmentId: string;
  purpose?: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  requiredDate?: string;
  requisitionItems: RequisitionItemDTO[];
  notes?: string;
}

export interface UpdateRequisitionDTO {
  purpose?: string;
  urgency?: 'routine' | 'urgent' | 'emergency';
  notes?: string;
}

export interface UpdateRequisitionStatusDTO {
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  notes?: string;
}

export interface ApproveRequisitionItemsDTO {
  approvedItems: ApprovedItemDTO[];
}

export interface RequisitionQueryParams {
  departmentId?: string;
  status?: string;
  urgency?: string;
  page?: number;
  limit?: number;
}

export interface RequisitionResponse {
  id: string;
  requisitionNumber: string;
  requestingDepartmentId: string;
  departments: {
    id: string;
    name: string;
  };
  purpose: string | null;
  urgency: string;
  status: string;
  requestedById: string | null;
  approvedById: string | null;
  fulfilledById: string | null;
  requestedAt: Date;
  approvedAt: Date | null;
  fulfilledAt: Date | null;
  requiredDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  User_Requisition_requestedByIdToUser: {
    fullName: string;
    role: string;
    username?: string;
  } | null;
  User_Requisition_approvedByIdToUser: {
    fullName: string;
    role: string;
  } | null;
  User_Requisition_fulfilledByIdToUser: {
    fullName: string;
    role: string;
  } | null;
  RequisitionItem: Array<{
    id: string;
    stockItemId: string;
    quantityRequested: number;
    quantityApproved: number | null;
    purpose: string | null;
    notes: string | null;
    StockItem: {
      id: string;
      name: string;
      drugCode: string | null;
      unitOfMeasure: string;
      currentStock: number;
      reorderLevel: number;
      costPrice?: number;
    };
  }>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GetRequisitionsResponse {
  requisitions: RequisitionResponse[];
  pagination: PaginationInfo;
}
