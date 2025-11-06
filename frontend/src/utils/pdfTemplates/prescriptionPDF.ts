// src/utils/pdfTemplates/prescriptionPDF.ts
import type { Medication, Patient, Attendance, Hospital } from '../../types';

export const generatePrescriptionHTML = (
  medication: Medication,
  patient: Patient,
  attendance: Attendance,
  hospital: Hospital
): string => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prescription - ${medication.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
      padding: 20px;
      color: #333;
    }
    
    .prescription-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      border: 2px solid #dc2626;
    }
    
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 30px;
      text-align: center;
      position: relative;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .logo svg {
      width: 40px;
      height: 40px;
      color: #dc2626;
    }
    
    .hospital-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    
    .hospital-details {
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.5;
    }
    
    .prescription-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: white;
      color: #dc2626;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(255, 255, 255, 0.3);
    }
    
    .content {
      padding: 30px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #fecaca;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, min
