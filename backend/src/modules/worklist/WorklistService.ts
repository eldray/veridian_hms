// backend/src/modules/worklist/WorklistService.ts

import { WorklistRepository } from './WorklistRepository';
import { WorklistItem } from './WorklistTypes';
import { BaseService } from '../../shared/base/BaseService';

export type WorklistType = 'vitals' | 'medical' | 'laboratory' | 'pharmacy' | 'radiology' | 'theatre' | 'procedures';

export class WorklistService extends BaseService {
  private repository: WorklistRepository;

  constructor() {
    super('WorklistService');
    this.repository = new WorklistRepository();
  }

  async getWorklist(type: WorklistType) {
    this.logger.info('Fetching worklist', { type });
    
    let data: WorklistItem[];
    
    switch (type) {
      case 'vitals':
        data = await this.repository.getVitalsWorklist();
        break;
      case 'medical':
        data = await this.repository.getMedicalWorklist();
        break;
      case 'laboratory':
        data = await this.repository.getLaboratoryWorklist();
        break;
      case 'pharmacy':
        data = await this.repository.getPharmacyWorklist();
        break;
      case 'radiology':
        data = await this.repository.getRadiologyWorklist();
        break;
      case 'theatre':
        data = await this.repository.getTheatreWorklist();
        break;
      case 'procedures':
        data = await this.repository.getProceduresWorklist();
        break;
      default:
        throw new Error(`Unknown worklist type: ${type}`);
    }

    this.logger.info('Worklist fetched', { type, count: data.length });
    
    return {
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    };
  }

  async getAllWorklistsSummary() {
    this.logger.info('Fetching all worklists summary');
    
    const [vitals, medical, laboratory, pharmacy, radiology, theatre, procedures] = await Promise.all([
      this.repository.getVitalsWorklist(),
      this.repository.getMedicalWorklist(),
      this.repository.getLaboratoryWorklist(),
      this.repository.getPharmacyWorklist(),
      this.repository.getRadiologyWorklist(),
      this.repository.getTheatreWorklist(),
      this.repository.getProceduresWorklist()
    ]);

    const summary = {
      vitals: { count: vitals.length, urgent: vitals.filter(v => v.priority === 'urgent' || v.priority === 'stat').length },
      medical: { count: medical.length, urgent: medical.filter(m => m.priority === 'urgent' || m.priority === 'stat').length },
      laboratory: { count: laboratory.length, urgent: laboratory.filter(l => l.priority === 'urgent' || l.priority === 'stat').length },
      pharmacy: { count: pharmacy.length, urgent: pharmacy.filter(p => p.priority === 'urgent' || p.priority === 'stat').length },
      radiology: { count: radiology.length, urgent: radiology.filter(r => r.priority === 'urgent' || r.priority === 'stat').length },
      theatre: { count: theatre.length, urgent: theatre.filter(t => t.priority === 'urgent' || t.priority === 'stat').length },
      procedures: { count: procedures.length, urgent: procedures.filter(p => p.priority === 'urgent' || p.priority === 'stat').length }
    };

    const totalUrgent = Object.values(summary).reduce((sum, s) => sum + s.urgent, 0);
    const totalPatients = Object.values(summary).reduce((sum, s) => sum + s.count, 0);

    return {
      success: true,
      data: {
        summary,
        totals: {
          totalPatients,
          totalUrgent
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}
