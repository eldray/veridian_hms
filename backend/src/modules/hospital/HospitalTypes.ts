// HospitalTypes.ts

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  nhisFacilityCode: string;
  nhisFacilityType: 'Tertiary' | 'Secondary' | 'Primary' | 'Clinic' | 'Health_Center' | 'Maternity_Home';
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: Date;
  nhisAccreditationExpiry?: Date;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHospitalDTO {
  name: string;
  address: string;
  phone: string;
  email: string;
  nhisFacilityCode: string;
  nhisFacilityType: 'Tertiary' | 'Secondary' | 'Primary' | 'Clinic' | 'Health_Center' | 'Maternity_Home';
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: Date;
  nhisAccreditationExpiry?: Date;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  isActive?: boolean;
}

export interface UpdateHospitalDTO {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  nhisFacilityCode?: string;
  nhisFacilityType?: 'Tertiary' | 'Secondary' | 'Primary' | 'Clinic' | 'Health_Center' | 'Maternity_Home';
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: Date;
  nhisAccreditationExpiry?: Date;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  isActive?: boolean;
}

export interface HospitalNHISSettings {
  name: string;
  nhisFacilityCode: string;
  nhisFacilityType: string;
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: Date;
  nhisAccreditationExpiry?: Date;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  address: string;
  phone: string;
  email: string;
}
