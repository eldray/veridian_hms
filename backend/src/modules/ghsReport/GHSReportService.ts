// GHSReportService.ts - Business logic layer for GHS Report module

import { BaseService } from '../base/BaseService';
import { GHSReportRepository } from './GHSReportRepository';
import { ParsedDateParams, DateRangeParams } from './GHSReportTypes';

export class GHSReportService extends BaseService<any> {
  private reportRepository: GHSReportRepository;

  constructor() {
    super();
    this.reportRepository = new GHSReportRepository();
  }

  parseDateParams(params: DateRangeParams): ParsedDateParams {
    const { year, month, startDate, endDate } = params;

    if (year && month) {
      const y = parseInt(year as string);
      const m = parseInt(month as string) - 1;
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, year: y, month: parseInt(month as string) };
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        year: start.getFullYear(),
        month: start.getMonth() + 1
      };
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  async createSubmission(data: {
    reportType: any;
    reportingYear: number;
    reportingMonth: number;
    periodStart: Date;
    periodEnd: Date;
    data: any;
    createdById: string;
  }) {
    return await this.reportRepository.createSubmission(data);
  }

  async getSubmissions(where?: any) {
    return await this.reportRepository.findSubmissions(where);
  }

  async getSubmissionById(id: string) {
    return await this.reportRepository.findSubmissionById(id);
  }

  async getAttendanceData(startDate: Date, endDate: Date) {
    return await this.reportRepository.getPatientWithDiagnoses(startDate, endDate);
  }

  async getAdmissionData(startDate: Date, endDate: Date) {
    return await this.reportRepository.getAdmissionsWithDetails(startDate, endDate);
  }

  async getANCData(startDate: Date, endDate: Date) {
    return await this.reportRepository.getANCRegistrations(startDate, endDate);
  }

  async getDeliveryData(startDate: Date, endDate: Date) {
    return await this.reportRepository.getDeliveries(startDate, endDate);
  }
}
