import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('🧹 Starting complete test data cleanup...');
  console.log('===========================================');

  try {
    // ──────────────────────────────────────────────────────
    // 1. DELETE IN CORRECT ORDER (respect foreign keys)
    // ──────────────────────────────────────────────────────

    console.log('\n🗑️ Deleting test records in correct order...');

    // Child records first (deepest dependencies)

    // Allergies & Medical Histories
    const allergies = await prisma.patientAllergy.deleteMany();
    console.log(`   ✅ Deleted ${allergies.count} allergies`);

    const medicalHistories = await prisma.patientMedicalHistory.deleteMany();
    console.log(`   ✅ Deleted ${medicalHistories.count} medical histories`);

    // Surgical Histories
    const surgicalHistories = await prisma.patientSurgicalHistory.deleteMany();
    console.log(`   ✅ Deleted ${surgicalHistories.count} surgical histories`);

    // Family Histories
    const familyHistories = await prisma.patientFamilyHistory.deleteMany();
    console.log(`   ✅ Deleted ${familyHistories.count} family histories`);

    // Consents
    const consents = await prisma.patientConsent.deleteMany();
    console.log(`   ✅ Deleted ${consents.count} consents`);

    // Vitals
    const vitals = await prisma.vital.deleteMany();
    console.log(`   ✅ Deleted ${vitals.count} vitals`);

    // Prescriptions/Medications
    const prescriptions = await prisma.prescription.deleteMany();
    console.log(`   ✅ Deleted ${prescriptions.count} prescriptions`);

    // Lab Results
    const labResults = await prisma.labResult.deleteMany();
    console.log(`   ✅ Deleted ${labResults.count} lab results`);

    // Scan Results
    const scanResults = await prisma.scanResult.deleteMany();
    console.log(`   ✅ Deleted ${scanResults.count} scan results`);

    // Bills
    const billItems = await prisma.billItem.deleteMany();
    console.log(`   ✅ Deleted ${billItems.count} bill items`);

    const bills = await prisma.bill.deleteMany();
    console.log(`   ✅ Deleted ${bills.count} bills`);

    // Proforma Invoices
    const proformaItems = await prisma.proformaInvoiceItem.deleteMany();
    console.log(`   ✅ Deleted ${proformaItems.count} proforma invoice items`);

    const proformas = await prisma.proformaInvoice.deleteMany();
    console.log(`   ✅ Deleted ${proformas.count} proforma invoices`);

    // Payments
    const payments = await prisma.payment.deleteMany();
    console.log(`   ✅ Deleted ${payments.count} payments`);

    // Insurance Claims
    const claimDiagnoses = await prisma.insuranceClaimDiagnosis.deleteMany();
    console.log(`   ✅ Deleted ${claimDiagnoses.count} claim diagnoses`);

    const claimProcedures = await prisma.insuranceClaimProcedure.deleteMany();
    console.log(`   ✅ Deleted ${claimProcedures.count} claim procedures`);

    const claims = await prisma.insuranceClaim.deleteMany();
    console.log(`   ✅ Deleted ${claims.count} insurance claims`);

    // NHIS Eligibility Checks
    const nhisChecks = await prisma.nHISEligibilityCheck.deleteMany();
    console.log(`   ✅ Deleted ${nhisChecks.count} NHIS checks`);

    // Waivers
    const waivers = await prisma.patientWaiver.deleteMany();
    console.log(`   ✅ Deleted ${waivers.count} waivers`);

    // Referrals
    const referrals = await prisma.referralRecord.deleteMany();
    console.log(`   ✅ Deleted ${referrals.count} referrals`);

    // Appointments
    const appointments = await prisma.appointment.deleteMany();
    console.log(`   ✅ Deleted ${appointments.count} appointments`);

    // Antenatal
    const antenatalVisits = await prisma.antenatalVisit.deleteMany();
    console.log(`   ✅ Deleted ${antenatalVisits.count} antenatal visits`);

    const antenatalBookings = await prisma.antenatalBooking.deleteMany();
    console.log(`   ✅ Deleted ${antenatalBookings.count} antenatal bookings`);

    // Family Planning
    const familyPlannings = await prisma.familyPlanningRecord.deleteMany();
    console.log(`   ✅ Deleted ${familyPlannings.count} family planning records`);

    // Delivery Records
    const newborns = await prisma.newbornRecord.deleteMany();
    console.log(`   ✅ Deleted ${newborns.count} newborn records`);

    const deliveries = await prisma.deliveryRecord.deleteMany();
    console.log(`   ✅ Deleted ${deliveries.count} delivery records`);

    // Postnatal
    const postnatalVisits = await prisma.postnatalVisit.deleteMany();
    console.log(`   ✅ Deleted ${postnatalVisits.count} postnatal visits`);

    // Abortion Records
    const abortions = await prisma.abortionRecord.deleteMany();
    console.log(`   ✅ Deleted ${abortions.count} abortion records`);

    // Attendance (this is the main parent of many records)
    const attendances = await prisma.attendance.deleteMany();
    console.log(`   ✅ Deleted ${attendances.count} attendances`);

    // Now delete patients (main parent)
    const patients = await prisma.patient.deleteMany();
    console.log(`   ✅ Deleted ${patients.count} patients`);

    // ──────────────────────────────────────────────────────
    // 2. RESET COUNTERS
    // ──────────────────────────────────────────────────────

    console.log('\n🔄 Resetting counters...');

    await prisma.counter.upsert({
      where: { id: 'patient' },
      update: { current: 1000 },
      create: { id: 'patient', current: 1000 }
    });
    console.log('   ✅ Patient counter reset to 1000');

    await prisma.counter.upsert({
      where: { id: 'attendance' },
      update: { current: 1000 },
      create: { id: 'attendance', current: 1000 }
    });
    console.log('   ✅ Attendance counter reset to 1000');

    await prisma.counter.upsert({
      where: { id: 'receipt' },
      update: { current: 1000 },
      create: { id: 'receipt', current: 1000 }
    });
    console.log('   ✅ Receipt counter reset to 1000');

    // ──────────────────────────────────────────────────────
    // 3. RESET SEEDING STATUS
    // ──────────────────────────────────────────────────────

    console.log('\n🔄 Resetting seeding status...');

    const fs = await import('fs');
    const path = await import('path');
    const statusPath = path.join(process.cwd(), 'src/seed/.seed_status.json');

    if (fs.existsSync(statusPath)) {
      fs.unlinkSync(statusPath);
      console.log('   ✅ .seed_status.json removed');
    } else {
      console.log('   ℹ️ No .seed_status.json found');
    }

    // ──────────────────────────────────────────────────────
    // 4. SUMMARY
    // ──────────────────────────────────────────────────────

    console.log('\n===========================================');
    console.log('✅ CLEANUP COMPLETE!');
    console.log('===========================================');
    console.log('\n📊 Summary:');
    console.log(`   🧹 Patients deleted: ${patients.count}`);
    console.log(`   🧹 Attendances deleted: ${attendances.count}`);
    console.log(`   🧹 Bills deleted: ${bills.count}`);
    console.log(`   🧹 Claims deleted: ${claims.count}`);
    console.log(`   🧹 Appointments deleted: ${appointments.count}`);
    console.log(`   🧹 Referrals deleted: ${referrals.count}`);
    console.log(`   🧹 Antenatal records deleted: ${antenatalBookings.count + antenatalVisits.count}`);
    console.log(`   🧹 Delivery records deleted: ${deliveries.count}`);
    console.log(`   🧹 Payments deleted: ${payments.count}`);
    console.log('\n💡 Now run: npx tsx src/seed/seedData.ts --force');

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run it
cleanTestData().catch(console.error);