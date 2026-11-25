import { BaseService } from '../../shared/base/BaseService';
import { HospitalRepository } from './HospitalRepository';
import { CreateHospitalDTO, UpdateHospitalDTO, HospitalNHISSettings } from './HospitalTypes';

export class HospitalService extends BaseService {
  private hospitalRepository: HospitalRepository;

  // ✅ Kept your exact constructor signature so Controller doesn't break
  constructor(hospitalRepository?: HospitalRepository) {
    super('HospitalService'); // Initializes BaseService logging
    this.hospitalRepository = hospitalRepository || new HospitalRepository();
  }

  async getAllHospitals() {
    this.logInfo('Fetching all hospitals');
    return this.hospitalRepository.findAll();
  }

  async getHospitalById(id: string) {
    this.logDebug('Fetching hospital by ID', { id });
    return this.hospitalRepository.findById(id);
  }

  async getActiveHospital() {
    this.logDebug('Fetching active hospital');
    return this.hospitalRepository.getActiveHospital();
  }

  async createHospital(data: CreateHospitalDTO) {
    this.logInfo('Creating new hospital', { name: data.name, nhisCode: data.nhisFacilityCode });
    
    const hospitalData = {
      ...data,
      nhisFacilityCode: data.nhisFacilityCode.toUpperCase(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    // Uses the inherited create method from BaseRepository
    return this.hospitalRepository.create(hospitalData);
  }

  async updateHospital(id: string, data: UpdateHospitalDTO) {
    this.logInfo('Updating hospital', { id });
    
    const updateData = { ...data };
    if (data.nhisFacilityCode) {
      updateData.nhisFacilityCode = data.nhisFacilityCode.toUpperCase();
    }

    // Uses the inherited update method from BaseRepository
    return this.hospitalRepository.update(id, updateData);
  }

  async updateActiveHospitalNHISSettings(data: Partial<UpdateHospitalDTO>) {
    this.logInfo('Updating active hospital NHIS settings');
    
    const updateData = { ...data };
    if (data.nhisFacilityCode) {
      updateData.nhisFacilityCode = data.nhisFacilityCode.toUpperCase();
    }

    return this.hospitalRepository.updateActive(updateData);
  }

  async deleteHospital(id: string) {
    this.logInfo('Deleting hospital', { id });
    
    // Uses the inherited delete method from BaseRepository
    return this.hospitalRepository.delete(id);
  }

  async getHospitalNHISSettings(): Promise<HospitalNHISSettings | null> {
    this.logDebug('Fetching NHIS settings for active hospital');
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