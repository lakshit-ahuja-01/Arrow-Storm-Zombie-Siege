import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const uploadDir = path.join(rootDir, 'poki-upload');
const zipFile = path.join(rootDir, 'Arrow-Storm-Zombie-Siege-Poki.zip');

console.log('🎮 [Poki Build] Starting Poki package build...');

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
console.log('✅ [Poki Build] Copied dist/ -> poki-upload/');

// Remove fbapp-config if copied over
const fbConfigPath = path.join(uploadDir, 'fbapp-config.json');
if (fs.existsSync(fbConfigPath)) {
  fs.rmSync(fbConfigPath);
}

// 3. Inject official Poki SDK v2 in index.html
const indexPath = path.join(uploadDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Replace CrazyGames / third-party scripts with Poki SDK
  if (html.includes('crazygames-sdk-v3.js')) {
    html = html.replace(
      '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
      '<!-- Poki SDK v2 -->\n  <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>'
    );
    console.log('✅ [Poki Build] Replaced CrazyGames SDK with Poki SDK v2 in index.html');
  } else if (!html.includes('poki-sdk.js')) {
    html = html.replace('</head>', '  <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>\n</head>');
    console.log('✅ [Poki Build] Injected Poki SDK v2 into <head>');
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
}

// 4. Generate clean Poki ZIP bundle
try {
  if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile);
  }
  const psCmd = `powershell -Command "Compress-Archive -Path '${uploadDir}\\*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 [Poki Build] Package generated: ${path.basename(zipFile)} (${sizeMb} MB)`);
  console.log('🚀 Ready for submission to Poki Developers portal!');
} catch (err) {
  console.error('⚠️ [Poki Build] Failed to compress zip:', err);
}
