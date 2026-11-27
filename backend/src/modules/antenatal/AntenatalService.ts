import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { AntenatalRepository } from './AntenatalRepository';
import { CreateAntenatalBookingInput, UpdateAntenatalBookingInput, CreateANCVisitInput, UpdateANCVisitInput, CreateDeliveryRecordInput, CreatePostnatalRecordInput, AntenatalBookingFilters, DeliveryRecordFilters, PostnatalRecordFilters } from './AntenatalTypes';

export class AntenatalService extends BaseService {
  private repo: AntenatalRepository;

  constructor(prisma: PrismaClient) {
    super('AntenatalService');
    this.repo = new AntenatalRepository(prisma);
  }

  // Pass-through methods with enterprise logging
  async getBookingByAttendanceId(attendanceId: string) { return this.repo.getBookingByAttendanceId(attendanceId); }
  async getBookingById(id: string) { return this.repo.getBookingById(id); }
  async getActiveBookingByPatientId(patientId: string) { return this.repo.getActiveBookingByPatientId(patientId); }
  async getAllBookings(filters: AntenatalBookingFilters) { return this.repo.getAllBookings(filters); }
  
  async createBooking(data: CreateAntenatalBookingInput) {
    this.logInfo('Creating antenatal booking', { patientId: data.patientId });
    return this.repo.createBooking(data);
  }
  
  async updateBooking(id: string, data: UpdateAntenatalBookingInput, actorId?: string) {
    this.logInfo('Updating antenatal booking', { id });
    return this.repo.updateBooking(id, data, actorId);
  }
  
  async closeBooking(id: string, deliveryData: any, actorId?: string) {
    this.logInfo('Closing antenatal booking', { id });
    return this.repo.closeBooking(id, deliveryData, actorId);
  }
  
  async deleteBooking(id: string, actorId?: string) {
    this.logInfo('Deleting antenatal booking', { id });
    return this.repo.deleteBooking(id, actorId);
  }

  // ANC Visits
  async getVisitsByBookingId(bookingId: string) { return this.repo.getVisitsByBookingId(bookingId); }
  async getVisitById(id: string) { return this.repo.getVisitById(id); }
  async createVisit(data: CreateANCVisitInput) { return this.repo.createVisit(data); }
  async updateVisit(id: string, data: UpdateANCVisitInput, actorId?: string) { return this.repo.updateVisit(id, data, actorId); }
  async deleteVisit(id: string) { return this.repo.deleteVisit(id); }

  // Deliveries
  async getDeliveryRecords(filters: DeliveryRecordFilters) { return this.repo.getDeliveryRecords(filters); }
  async getDeliveryRecordById(id: string) { return this.repo.getDeliveryRecordById(id); }
  async createDeliveryRecord(data: CreateDeliveryRecordInput) { return this.repo.createDeliveryRecord(data); }
  async updateDeliveryRecord(id: string, data: any, actorId?: string) { return this.repo.updateDeliveryRecord(id, data, actorId); }
  async deleteDeliveryRecord(id: string, actorId: string) { return this.repo.deleteDeliveryRecord(id, actorId); }

  // Postnatals
  async getPostnatalRecords(filters: PostnatalRecordFilters) { return this.repo.getPostnatalRecords(filters); }
  async getPostnatalRecordById(id: string) { return this.repo.getPostnatalRecordById(id); }
  async createPostnatalRecord(data: CreatePostnatalRecordInput) { return this.repo.createPostnatalRecord(data); }
  async updatePostnatalRecord(id: string, data: any, actorId?: string) { return this.repo.updatePostnatalRecord(id, data, actorId); }
  async deletePostnatalRecord(id: string) { return this.repo.deletePostnatalRecord(id); }

  // Stats
  async getANCStatistics(startDate?: Date, endDate?: Date) { return this.repo.getANCStatistics(startDate, endDate); }
  async getDeliveryStatistics(startDate?: Date, endDate?: Date) { return this.repo.getDeliveryStatistics(startDate, endDate); }
  async getPostnatalStatistics(startDate?: Date, endDate?: Date) { return this.repo.getPostnatalStatistics(startDate, endDate); }
}