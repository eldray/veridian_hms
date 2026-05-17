// HospitalService.ts
import { HospitalRepository } from './HospitalRepository';
import { CreateHospitalDTO, UpdateHospitalDTO, HospitalNHISSettings } from './HospitalTypes';

export class HospitalService {
  private hospitalRepository: HospitalRepository;

  constructor(hospitalRepository?: HospitalRepository) {
    this.hospitalRepository = hospitalRepository || new HospitalRepository();
  }

  async getAllHospitals() {
    return this.hospitalRepository.findAll();
  }

  async getHospitalById(id: string) {
    return this.hospitalRepository.findById(id);
  }

  async getActiveHospital() {
    return this.hospitalRepository.findActive();
  }

  async createHospital(data: CreateHospitalDTO) {
    const hospitalData = {
      ...data,
      nhisFacilityCode: data.nhisFacilityCode.toUpperCase(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    return this.hospitalRepository.create(hospitalData);
  }

  async updateHospital(id: string, data: UpdateHospitalDTO) {
    const updateData = { ...data };
    if (data.nhisFacilityCode) {
      updateData.nhisFacilityCode = data.nhisFacilityCode.toUpperCase();
    }

    return this.hospitalRepository.update(id, updateData);
  }

  async updateActiveHospitalNHISSettings(data: Partial<UpdateHospitalDTO>) {
    const updateData = { ...data };
    if (data.nhisFacilityCode) {
      updateData.nhisFacilityCode = data.nhisFacilityCode.toUpperCase();
    }

    return this.hospitalRepository.updateActive(updateData);
  }

  async deleteHospital(id: string) {
    return this.hospitalRepository.delete(id);
  }

  async getHospitalNHISSettings(): Promise<HospitalNHISSettings | null> {
    const hospital = await this.hospitalRepository.findActive();
    
    if (!hospital) {
      return null;
    }

    return {
      name: hospital.name,
      nhisFacilityCode: hospital.nhisFacilityCode,
      nhisFacilityType: hospital.nhisFacilityType,
      nhisAccreditationNumber: hospital.nhisAccreditationNumber || undefined,
      nhisAccreditationDate: hospital.nhisAccreditationDate || undefined,
      nhisAccreditationExpiry: hospital.nhisAccreditationExpiry || undefined,
      nhisContactPerson: hospital.nhisContactPerson || undefined,
      nhisContactPhone: hospital.nhisContactPhone || undefined,
      nhisContactEmail: hospital.nhisContactEmail || undefined,
      address: hospital.address,
      phone: hospital.phone,
      email: hospital.email
    };
  }
}
