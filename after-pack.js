// electron-builder never copies directories named node_modules via extraResources,
// so the backend's production dependencies are copied here after packing.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const src = path.join(__dirname, 'build', 'backend', 'node_modules');
  if (!fs.existsSync(src)) throw new Error('build/backend/node_modules is missing. Run: node build-win.js');
  const resources = context.packager.platformSpecificBuildOptions && context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(context.appOutDir, 'resources');
  const dest = path.join(resources, 'backend', 'node_modules');
  fs.cpSync(src, dest, { recursive: true });
  console.log(`  afterPack: copied backend node_modules -> ${dest}`);
};
