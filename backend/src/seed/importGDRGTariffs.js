const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');  // npm install csv-parser

// Load your GDRGTariff model (adjust path)
const GDRGTariff = require('../models/GDRGTariff');  // From your project root

// MongoDB connection (update with your URI)
const MONGODB_URI = 'mongodb://localhost:27017/your-hospital-db';  // e.g., 'mongodb://127.0.0.1:27017/nhis-hospital'

// CSV file path (create this file in scripts/ folder)
const CSV_FILE = './gdrg-tariffs-2022.csv';

async function importGDRGTariffs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear old inactive records
    await GDRGTariff.deleteMany({ isActive: false });
    console.log('🧹 Cleared inactive records');

    // Read CSV and insert
    const results = [];
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (data) => {
        // Normalize data
        results.push({
          gdrgCode: data.gdrgCode.toUpperCase().trim(),
          description: data.description.trim(),
          nhiaTariff: parseFloat(data.nhiaTariff),
          effectiveFrom: new Date('2022-01-01'),  // Current tariffs; update to 2025 when available
          effectiveTo: null,  // Ongoing
          isActive: true
        });
      })
      .on('end', async () => {
        if (results.length === 0) {
          console.error('❌ No data found in CSV. Create gdrg-tariffs-2022.csv');
          process.exit(1);
        }

        // Insert (upsert on gdrgCode)
        await GDRGTariff.insertMany(results, { upsert: true });
        console.log(`✅ Imported ${results.length} G-DRG tariffs`);
        console.log('Sample:', results.slice(0, 3));

        mongoose.connection.close();
        process.exit(0);
      })
      .on('error', (err) => {
        console.error('❌ CSV read error:', err);
        process.exit(1);
      });

  } catch (error) {
    console.error('❌ Import error:', error);
    process.exit(1);
  }
}

importGDRGTariffs();