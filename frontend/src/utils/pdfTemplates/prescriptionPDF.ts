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
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .info-item {
      background: #fef2f2;
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #dc2626;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #b91c1c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #b91c1c;
    }
    
    .medication-section {
      background: #fef2f2;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      border: 2px solid #fecaca;
    }
    
    .medication-title {
      font-weight: 700;
      font-size: 24px;
      color: #dc2626;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .dosage-instructions {
      font-size: 18px;
      line-height: 1.6;
      color: #1e293b;
      text-align: center;
      margin: 20px 0;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px dashed #dc2626;
    }
    
    .warning-box {
      background: #fffbfb;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 15px;
      margin: 20px 0;
    }
    
    .warning-title {
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 8px;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #fecaca;
    }
    
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    
    .signature-line {
      height: 1px;
      background: #dc2626;
      margin: 40px auto 10px;
      width: 80%;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #fecaca;
      text-align: center;
      color: #b91c1c;
      font-size: 14px;
      line-height: 1.6;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .prescription-container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    .no-print {
      margin-top: 30px;
      text-align: center;
    }
    
    .print-btn {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
    }
    
    .close-btn {
      background: #64748b;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-left: 12px;
    }
    
    .close-btn:hover {
      background: #475569;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="prescription-container">
    <div class="header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4.929 4.929a1 1 0 0 1 1.414 0L12 10.586l5.657-5.657a1 1 0 1 1 1.414 1.414L13.414 12l5.657 5.657a1 1 0 1 1-1.414 1.414L12 13.414l-5.657 5.657a1 1 0 1 1-1.414-1.414L10.586 12 4.929 6.343a1 1 0 0 1 0-1.414z"></path>
        </svg>
      </div>
      <div class="hospital-name">${hospital.name}</div>
      <div class="hospital-details">
        ${hospital.address}<br>
        Tel: ${hospital.phone} | Email: ${hospital.email}
      </div>
      <div class="prescription-badge">OFFICIAL PRESCRIPTION</div>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${patient.fullName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Patient ID</div>
            <div class="info-value">${patient.folderNumber || patient.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age & Gender</div>
            <div class="info-value">${patient.age} years / ${patient.gender}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">${patient.contact}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Prescription Details</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Date Prescribed</div>
            <div class="info-value">${formatDate(medication.prescribedAt)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Prescribed By</div>
            <div class="info-value">${medication.prescribedBy}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Attendance Number</div>
            <div class="info-value">${attendance.attendanceNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Visit Type</div>
            <div class="info-value">${attendance.attendanceType?.replace('_', ' ')}</div>
          </div>
        </div>
      </div>
      
      <div class="medication-section">
        <div class="medication-title">${medication.name}</div>
        <div class="dosage-instructions">
          <strong>Take ${medication.dosage} ${medication.route ? `by ${medication.route}` : ''} ${medication.frequency.toLowerCase()}, 
          for ${medication.duration}.</strong>
        </div>
        
        ${medication.instructions ? `
        <div class="info-item" style="margin-top: 15px; background: white; border: 1px solid #fecaca;">
          <div class="info-label">Special Instructions</div>
          <div class="info-value" style="color: #1e293b;">${medication.instructions}</div>
        </div>
        ` : ''}
        
        <div style="margin-top: 15px; text-align: center; font-size: 14px; color: #b91c1c;">
          <strong>Quantity: ${medication.quantity} • Refills: As directed</strong>
        </div>
      </div>
      
      ${medication.notes ? `
      <div class="warning-box">
        <div class="warning-title">Prescriber Notes</div>
        <div>${medication.notes}</div>
      </div>
      ` : ''}
      
      <div class="warning-box">
        <div class="warning-title">Important Warnings</div>
        <div>
          <ul style="padding-left: 20px; margin-top: 8px; color: #1e293b;">
            <li>Take exactly as prescribed</li>
            <li>Complete the full course even if symptoms improve</li>
            <li>Consult your doctor before stopping this medication</li>
            <li>Report any adverse reactions immediately</li>
          </ul>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Patient Signature</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Prescriber: ${medication.prescribedBy}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This prescription is valid for 30 days from the date of issue.</p>
        <p style="margin-top: 10px; font-size: 13px; color: #b91c1c;">
          Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
    
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">
        Print Prescription
      </button>
      <button class="close-btn" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
</body>
</html>
  `;
};
