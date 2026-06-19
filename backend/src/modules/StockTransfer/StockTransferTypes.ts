export interface TransferItemDTO {
    stockItemId: string;
    quantityRequested: number;
  }
  
  export interface CreateTransferDTO {
    originId: string;
    destinationId: string;
    items: TransferItemDTO[];
    notes?: string;
  }
  
  export interface TransferQueryParams {
    originId?: string;
    destinationId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }