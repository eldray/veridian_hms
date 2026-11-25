export interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  isOccupied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ FIXED: Removed direct Patient relation, added dynamic currentOccupant
export interface BedWithRelations extends Bed {
  Ward?: {
    id: string;
    wardName: string;
    wardType: string;
  };
  currentOccupant?: {
    id: string;
    folderNumber: string;
    surname: string;
    otherNames: string;
  } | null;
}

export interface CreateBedInput {
  wardId: string;
  bedNumber: string;
}

export interface UpdateBedInput {
  bedNumber?: string;
  isOccupied?: boolean;
}

export interface BedFilter {
  wardId?: string;
  isOccupied?: boolean;
}