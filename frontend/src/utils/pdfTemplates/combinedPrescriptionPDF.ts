// src/utils/pdfTemplates/combinedPrescriptionPDF.ts
import type { Patient, Attendance, Hospital } from '../../types';

export const generateCombinedPrescriptionHTML = (
  medications: any[],
  patient: Patient,
  attendance: Attendance,
  hospital: Hospital,
  prescriberName: string
): string => {
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prescription - ${patient.folderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #f5f7fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 2px solid #dc2626; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; }
    .hospital-name { font-size: 28px; font-weight: 700; }
    .prescription-badge { display: inline-block; background: white; color: #dc2626; padding: 4px 16px; border-radius: 20px; font-weight: 600; margin-top: 10px; }
    .content { padding: 30px; }
    .section-title { font-size: 18px; font-weight: 700; color: #dc2626; margin-bottom: 15px; border-bottom: 2px solid #fecaca; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .info-item { background: #fef2f2; padding: 12px; border-radius: 10px; border-left: 4px solid #dc2626; }
    .info-label { font-size: 11px; font-weight: 600; color: #b91c1c; text-transform: uppercase; }
    .info-value { font-size: 14px; font-weight: 600; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #dc2626; color: white; padding: 10px; text-align: left; font-size: 13px; }
    td { border: 1px solid #fecaca; padding: 10px; font-size: 12px; }
    .signature { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 30px; border-top: 2px solid #fecaca; }
    .signature-line { width: 200px; border-top: 1px solid #dc2626; margin-top: 40px; }
    .footer { margin-top: 30px; text-align: center; color: #b91c1c; font-size: 12px; }
    @media print { body { background: white; padding: 0; } .no-print { display: none !important; } }
    .no-print { margin-top: 20px; text-align: center; }
    .print-btn { background: #dc2626; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
    .close-btn { background: #64748b; color: white; border: none; padding: 10px 24px; border-radius: 8px; margin-left: 10px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="hospital-name">${hospital?.name || 'VERIDIAN HOSPITAL'}</div>
      <p>${hospital?.address || '123 Health Street, Medical City'} | Tel: ${hospital?.phone || '+233 (0) 30 123 4567'}</p>
      <div class="prescription-badge">OFFICIAL PRESCRIPTION</div>
    </div>
    
    <div class="content">
      <div class="section-title">Patient Information</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Patient Name</div><div class="info-value">${patient.surname} ${patient.otherNames}</div></div>
        <div class="info-item"><div class="info-label">Folder #</div><div class="info-value">${patient.folderNumber}</div></div>
        <div class="info-item"><div class="info-label">Age/Gender</div><div class="info-value">${patient.age || '?'} years / ${patient.gender}</div></div>
        <div class="info-item"><div class="info-label">Date</div><div class="info-value">${formatDate(new Date())}</div></div>
      </div>
      
      <div class="section-title">Prescribed Medications</div>
      <table>
        <thead>
          <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Quantity</th></tr>
        </thead>
        <tbody>
          ${medications.map(med => `
            <tr>
              <td><strong>${med.name}</strong>${med.instructions ? `<br><small>${med.instructions}</small>` : ''}</td>
              <td>${med.dosage}</td>
              <td>${med.frequency}</td>
              <td>${med.duration}</td>
              <td>${med.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="signature">
        <div><div class="signature-line"></div>Patient Signature</div>
        <div><div class="signature-line"></div>Prescriber: Dr. ${prescriberName || 'Unknown'}</div>
      </div>
      
      <div class="footer">
        <p>This prescription is valid for 30 days. Take medications as prescribed.</p>
      </div>
    </div>
    
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">Print Prescription</button>
      <button class="close-btn" onclick="window.close()">Close</button>
    </div>
  </div>
</body>
</html>
  `;
};