export interface CreateCorporateAccountDTO {
  companyName: string;
  registrationNumber?: string;
  taxId?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  creditLimit?: number;
  paymentTerms?: number;
  discountPercentage?: number;
  insuranceProviderId?: string;
}

export interface UpdateCorporateAccountDTO {
  companyName?: string;
  registrationNumber?: string;
  taxId?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  paymentTerms?: number;
  discountPercentage?: number;
  isActive?: boolean;
  insuranceProviderId?: string;
}

export interface CreateCorporateEmployeeDTO {
  employeeId: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  enrollmentDate?: Date;
}

export interface UpdateCorporateEmployeeDTO {
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  endDate?: Date;
  isActive?: boolean;
}

export interface CorporateAccountResponse {
  id: string;
  companyName: string;
  registrationNumber: string | null;
  taxId: string | null;
  contactPerson: string;
  email: string;
  phone: string;
  address: string | null;
  creditLimit: number;
  currentBalance: number;
  paymentTerms: number;
  discountPercentage: number;
  isActive: boolean;
  insuranceProviderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateEmployeeResponse {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  department: string | null;
  position: string | null;
  enrollmentDate: Date;
  endDate: Date | null;
  isActive: boolean;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateStatistics {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalOutstanding: number;
  accountsWithDebt: number;
  averageCreditUtilization: number;
}

export interface GenerateMonthlyBillDTO {
  accountId: string;
  month: number; // 1-12
  year: number;
  discountPercentage?: number;
  generatedById: string;
}

export interface MonthlyBillSummary {
  accountId: string;
  companyName: string;
  month: number;
  year: number;
  encounters: CorporateEncounterDetail[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  totalAmount: number;
  proformaInvoiceId?: string;
  generatedAt: Date;
}

export interface CorporateEncounterDetail {
  encounterId: string;
  attendanceId: string;
  patientName: string;
  employeeId?: string;
  employeeName?: string;
  visitDate: Date;
  diagnosis?: string;
  items: BillItemDetail[];
  totalAmount: number;
}

export interface BillItemDetail {
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
