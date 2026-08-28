// package-win.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Windows application...');

// Clean previous builds
try {
  console.log('🧹 Cleaning previous builds...');
  execSync('npm run clean', { stdio: 'inherit' });
} catch (error) {
  console.log('No previous builds to clean');
}

// Build frontend
console.log('🏗️  Building frontend...');
execSync('npm run build:frontend', { stdio: 'inherit' });

// Build Windows directory version
console.log('🔨 Building Windows app (directory version)...');
execSync('electron-builder --win --x64 --dir -c.win.signAndEditExecutable=false', { stdio: 'inherit' });

// Create ZIP package
console.log('📦 Creating ZIP package...');
const releaseDir = path.join(__dirname, 'release');
const unpackedDir = path.join(releaseDir, 'win-unpacked');
const zipFile = path.join(releaseDir, 'PharmacyPOS-Windows-Portable.zip');

if (fs.existsSync(unpackedDir)) {
  // Remove old zip if exists
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }
  
  // Create ZIP
  const { execSync } = require('child_process');
  execSync(`cd "${releaseDir}" && zip -r "PharmacyPOS-Windows-Portable.zip" "win-unpacked/"`, { stdio: 'inherit' });
  
  console.log('\n✅ SUCCESS!');
  console.log('📁 Unpacked app:', unpackedDir);
  console.log('📦 ZIP file:', zipFile);
  console.log('\n🎯 Share the ZIP file with users.');
  console.log('   Users should extract it and run PharmacyPOS.exe');
} else {
  console.error('❌ Error: win-unpacked folder not found!');
  process.exit(1);
}