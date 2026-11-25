// backend/scripts/fix-lab-test-services.ts
import { PrismaClient, ServiceType, ServiceCategory, NHISCoverageType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLabTestServices() {
  console.log('🔧 Fixing lab test services...');
  
  // 1. Check lab test templates
  const templates = await prisma.labTestTemplate.findMany();
  console.log(`📊 Found ${templates.length} lab test templates`);
  
  if (templates.length === 0) {
    console.log('❌ No lab test templates found! Need to seed labTests.json first.');
    return;
  }
  
  // 2. Get admin user ID
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });
  
  if (!admin) {
    console.log('❌ No admin user found!');
    return;
  }
  
  // 3. Check existing lab test services
  const existingServices = await prisma.serviceCatalog.findMany({
    where: { serviceType: ServiceType.lab_test }
  });
  
  console.log(`📊 Existing lab test services: ${existingServices.length}`);
  
  // 4. Create missing lab test services
  let created = 0;
  let updated = 0;
  
  for (const template of templates) {
    const existing = await prisma.serviceCatalog.findFirst({
      where: { 
        OR: [
          { labTestTemplateId: template.id },
          { code: `LAB-${template.investigationCode}` }
        ]
      }
    });
    
    const serviceData = {
      name: template.name,
      code: `LAB-${template.investigationCode}`,
      serviceType: ServiceType.lab_test,
      serviceCategory: ServiceCategory.diagnostics,
      subType: template.category,
      nhisServiceCode: template.investigationCode,
      labTestTemplateId: template.id,
      isNHISCovered: true,
      nhisCoverageType: NHISCoverageType.full,
      isActive: true,
      unit: 'Test',
      createdById: admin.id,
      description: template.description || null,
      requiresClinicalNotes: false,
    };
    
    if (existing) {
      // Update existing
      await prisma.serviceCatalog.update({
        where: { id: existing.id },
        data: serviceData
      });
      updated++;
    } else {
      // Create new
      const service = await prisma.serviceCatalog.create({
        data: serviceData
      });
      
      // Create pricing
      await prisma.servicePricing.create({
        data: {
          serviceCatalogId: service.id,
          cashPrice: 80,
          nhisPrice: 60,
          insurancePrice: 75,
          corporatePrice: 75,
          vatRate: 0,
          isTaxable: false,
          isActive: true,
          effectiveDate: new Date()
        }
      });
      created++;
    }
  }
  
  console.log(`✅ Created ${created} new lab test services`);
  console.log(`✅ Updated ${updated} existing lab test services`);
  
  // 5. Verify final count
  const finalCount = await prisma.serviceCatalog.count({
    where: { serviceType: ServiceType.lab_test }
  });
  console.log(`📊 Total lab test services in catalog: ${finalCount}`);
}

fixLabTestServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());