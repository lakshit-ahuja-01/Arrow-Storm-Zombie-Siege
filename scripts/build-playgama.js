import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const uploadDir = path.join(rootDir, 'playgama-upload');
const zipFile = path.join(rootDir, 'Arrow-Storm-Zombie-Siege-Playgama.zip');

console.log('🎮 [Playgama Build] Starting Playgama packaging...');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory does not exist! Run vite build first.');
  process.exit(1);
}

// 1. Prepare clean upload directory
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
} else {
  for (const file of fs.readdirSync(uploadDir)) {
    fs.rmSync(path.join(uploadDir, file), { recursive: true, force: true });
  }
}

// 2. Copy dist into uploadDir
fs.cpSync(distDir, uploadDir, { recursive: true });
console.log('✅ [Playgama Build] Copied dist/ -> playgama-upload/');

// Remove fbapp-config if present
const fbConfig = path.join(uploadDir, 'fbapp-config.json');
if (fs.existsSync(fbConfig)) {
  fs.rmSync(fbConfig);
}

// Ensure playgama-bridge-config.json is placed in root AND in public/ subdirectory
const rootBridgeConfig = path.join(rootDir, 'public', 'playgama-bridge-config.json');
const targetBridgeConfigRoot = path.join(uploadDir, 'playgama-bridge-config.json');
const publicSubdir = path.join(uploadDir, 'public');
const targetBridgeConfigPublic = path.join(publicSubdir, 'playgama-bridge-config.json');

if (fs.existsSync(rootBridgeConfig)) {
  fs.copyFileSync(rootBridgeConfig, targetBridgeConfigRoot);
  if (!fs.existsSync(publicSubdir)) fs.mkdirSync(publicSubdir, { recursive: true });
  fs.copyFileSync(rootBridgeConfig, targetBridgeConfigPublic);
  console.log('✅ [Playgama Build] Verified playgama-bridge-config.json at root AND public/');
}

// 3. Inject official Playgama Bridge script in index.html
const indexPath = path.join(uploadDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');

  if (html.includes('crazygames-sdk-v3.js')) {
    html = html.replace(
      '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
      '<!-- Playgama Bridge SDK v2 -->\n  <script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>'
    );
    console.log('✅ [Playgama Build] Injected Playgama Bridge SDK into index.html');
  } else if (!html.includes('playgama-bridge.js')) {
    html = html.replace('</head>', '  <script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>\n</head>');
    console.log('✅ [Playgama Build] Injected Playgama Bridge SDK into <head>');
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
}

// 4. Compress into ready-to-upload zip
try {
  if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile);
  }
  const psCmd = `powershell -Command "Compress-Archive -Path '${uploadDir}\\*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 [Playgama Build] Package generated: ${path.basename(zipFile)} (${sizeMb} MB)`);
  console.log('🚀 Ready for upload to Playgama Developer Dashboard!');
} catch (err) {
  console.error('⚠️ [Playgama Build] Failed to compress zip:', err);
}
