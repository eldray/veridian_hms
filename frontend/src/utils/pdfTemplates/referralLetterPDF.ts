// src/utils/pdfTemplates/referralLetterPDF.ts
import type { Patient, Hospital, ReferralRecord } from '../../types';

export const generateReferralLetterHTML = (
  referral: ReferralRecord,
  patient: Patient,
  hospital: Hospital
): string => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
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
  <title>Referral Letter - ${referral.referralNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f7fa;
      padding: 20px;
      color: #333;
    }
    .letter-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      text-align: center;
      position: relative;
    }
    .hospital-name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .hospital-details { font-size: 12px; opacity: 0.9; }
    .letter-badge {
      position: absolute;
      top: 20px;
      right: 30px;
      background: #fbbf24;
      color: #1e3a8a;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
    }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #bfdbfe;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }
    .info-item {
      background: #eff6ff;
      padding: 12px;
      border-radius: 10px;
      border-left: 3px solid #3b82f6;
    }
    .info-label { font-size: 11px; font-weight: 600; color: #1e3a8a; text-transform: uppercase; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #1e3a8a; }
    .clinical-section {
      background: #eff6ff;
      border-radius: 10px;
      padding: 15px;
      margin: 15px 0;
    }
    .clinical-content { color: #1e293b; line-height: 1.5; font-size: 13px; }
    .urgency-badge {
      display: inline-block;
      background: #fef3c7;
      color: #b45309;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      margin-top: 10px;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid #e2e8f0;
    }
    .signature-box { text-align: center; min-width: 200px; }
    .signature-line { height: 1px; background: #94a3b8; margin: 40px auto 10px; width: 80%; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 11px;
    }
    @media print {
      body { background: white; padding: 0; }
      .letter-container { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
    .no-print { margin-top: 20px; text-align: center; }
    .print-btn {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .close-btn {
      background: #64748b;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    <div class="header">
      <div class="hospital-name">${hospital.name}</div>
      <div class="hospital-details">
        ${hospital.address}<br>
        Tel: ${hospital.phone} | Email: ${hospital.email}
      </div>
      <div class="letter-badge">REFERRAL LETTER</div>
    </div>
    
    <div class="content">
      <div class="info-grid" style="margin-bottom: 20px;">
        <div class="info-item">
          <div class="info-label">Reference Number</div>
          <div class="info-value">${referral.referralNumber}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date</div>
          <div class="info-value">${formatDate(referral.referralDate)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">TO:</div>
        <div class="info-item" style="margin-bottom: 10px;">
          <div class="info-value">${referral.referredToFacility || '_________________________'}</div>
          <div>Attn: ${referral.referredToDoctor || 'Medical Officer'} (${referral.referredToDepartment || 'General'})</div>
        </div>
        ${referral.urgency ? `<div class="urgency-badge">URGENCY: ${referral.urgency.toUpperCase()}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">PATIENT INFORMATION</div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Name</div><div class="info-value">${patient.fullName}</div></div>
          <div class="info-item"><div class="info-label">Folder Number</div><div class="info-value">${patient.folderNumber}</div></div>
          <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${formatDate(patient.dateOfBirth)}</div></div>
          <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${patient.gender}</div></div>
          <div class="info-item"><div class="info-label">Contact</div><div class="info-value">${patient.contact || 'N/A'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">REASON FOR REFERRAL</div>
        <div class="clinical-section">
          <div class="clinical-content">${referral.reason || referral.referralReason || 'Not specified'}</div>
        </div>
      </div>

      ${referral.primaryDiagnosis ? `
      <div class="section">
        <div class="section-title">PRIMARY DIAGNOSIS</div>
        <div class="clinical-section">
          <div class="clinical-content">${referral.primaryDiagnosis.name} (ICD-10: ${referral.primaryDiagnosis.icdCode})</div>
        </div>
      </div>
      ` : ''}

      ${referral.clinicalNotes ? `
      <div class="section">
        <div class="section-title">CLINICAL NOTES</div>
        <div class="clinical-section">
          <div class="clinical-content">${referral.clinicalNotes}</div>
        </div>
      </div>
      ` : ''}

      ${referral.additionalNotes ? `
      <div class="section">
        <div class="section-title">ADDITIONAL INFORMATION</div>
        <div class="clinical-section">
          <div class="clinical-content">${referral.additionalNotes}</div>
        </div>
      </div>
      ` : ''}

      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Referring Clinician</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>Signature & Stamp</div>
        </div>
      </div>

      <div class="footer">
        <p>Please direct all communication to the referring clinician.<br>
        Generated on ${new Date().toLocaleString()}</p>
      </div>
    </div>
    
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">Print Referral Letter</button>
      <button class="close-btn" onclick="window.close()">Close</button>
    </div>
  </div>
</body>
</html>
  `;
};