// src/utils/frequencyUtils.ts
// Shared across Nursing.tsx, PatientSummarySidebar, MedicationCard

export interface FrequencyInfo {
    type: string;
    requiredDoses: number;
    intervalHours: number;
  }
  
  export function getFrequencyInfo(frequency: string): FrequencyInfo {
    const freq = (frequency || '').toLowerCase().trim();
  
    if (freq.includes('stat') || freq === 'once' || freq === 'single dose') {
      return { type: 'Stat / Once Only', requiredDoses: 1, intervalHours: 999 };
    }
    if (freq === 'od' || freq === 'daily' || freq.includes('once daily') || freq.includes('once a day')) {
      return { type: 'Once Daily (OD)', requiredDoses: 1, intervalHours: 24 };
    }
    if (freq === 'bd' || freq === 'bid' || freq.includes('twice') || freq === '12hrly' || freq.includes('12 hr')) {
      return { type: 'Twice Daily (BD)', requiredDoses: 2, intervalHours: 12 };
    }
    if (freq === 'tds' || freq === 'tid' || freq.includes('three times') || freq === '8hrly' || freq.includes('8 hr')) {
      return { type: 'Three Times Daily (TDS)', requiredDoses: 3, intervalHours: 8 };
    }
    if (freq === 'qid' || freq.includes('four times') || freq === '6hrly' || freq.includes('6 hr')) {
      return { type: 'Four Times Daily (QID)', requiredDoses: 4, intervalHours: 6 };
    }
    if (freq.includes('6hrly') || freq === 'q6h') {
      return { type: 'Every 6 Hours (Q6H)', requiredDoses: 4, intervalHours: 6 };
    }
    if (freq === 'q4h' || freq.includes('4hrly') || freq.includes('4 hr')) {
      return { type: 'Every 4 Hours (Q4H)', requiredDoses: 6, intervalHours: 4 };
    }
    if (freq === 'nocte' || freq.includes('at night') || freq.includes('bedtime')) {
      return { type: 'Once at Night (Nocte)', requiredDoses: 1, intervalHours: 24 };
    }
    if (freq === 'mane' || freq.includes('morning')) {
      return { type: 'Once in the Morning (Mane)', requiredDoses: 1, intervalHours: 24 };
    }
    if (freq.includes('alternate') || freq === 'eod' || freq.includes('every other')) {
      return { type: 'Alternate Days', requiredDoses: 1, intervalHours: 48 };
    }
    if (freq.includes('weekly')) {
      return { type: 'Weekly', requiredDoses: 1, intervalHours: 168 };
    }
    if (freq.includes('prn') || freq.includes('as needed') || freq.includes('when required')) {
      return { type: 'As Needed (PRN)', requiredDoses: 1, intervalHours: 4 };
    }
  
    // Default fallback
    return { type: frequency || 'Once Daily (OD)', requiredDoses: 1, intervalHours: 24 };
  }
  
  export function getNextDoseTime(lastAdminAt: string, intervalHours: number): Date {
    return new Date(new Date(lastAdminAt).getTime() + intervalHours * 60 * 60 * 1000);
  }
  
  export function isDoseDue(medication: any): boolean {
    const freq = getFrequencyInfo(medication.frequency);
    const doses = medication.administeredDoses || [];
    if (doses.length === 0) return true;
    if (doses.length >= freq.requiredDoses) return false;
    const lastDose = doses[doses.length - 1];
    const hoursSince = (Date.now() - new Date(lastDose.administeredAt).getTime()) / 3600000;
    return hoursSince >= freq.intervalHours;
  }
  
  export function hoursUntilNextDose(medication: any): number {
    const freq = getFrequencyInfo(medication.frequency);
    const doses = medication.administeredDoses || [];
    if (doses.length === 0) return 0;
    const lastDose = doses[doses.length - 1];
    const hoursSince = (Date.now() - new Date(lastDose.administeredAt).getTime()) / 3600000;
    return Math.max(0, freq.intervalHours - hoursSince);
  }