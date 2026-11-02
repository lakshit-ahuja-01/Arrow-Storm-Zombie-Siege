import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const uploadDir = path.join(rootDir, 'fbinstant-upload');
const zipFile = path.join(rootDir, 'Arrow-Storm-Zombie-Siege-FBInstant.zip');

console.log('🎮 [FBInstant Build] Starting Facebook Instant Games packaging...');

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
console.log('✅ [FBInstant Build] Copied dist/ -> fbinstant-upload/');

const configPath = path.join(uploadDir, 'fbapp-config.json');
const fbConfig = {
  instant_games: {
    orientation: 'LANDSCAPE',
    navigation_menu_version: 'NAV_FLOATING'
  },
  instant: {
    orientation: 'LANDSCAPE',
    navigation_menu_version: 'NAV_FLOATING'
  }
};
fs.writeFileSync(configPath, JSON.stringify(fbConfig, null, 2), 'utf-8');
console.log('✅ [FBInstant Build] Generated valid fbapp-config.json with instant_games section');

// 4. Update index.html to load official FBInstant SDK v7.1 and remove third-party SDK tags
const indexPath = path.join(uploadDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // Replace CrazyGames script with Facebook Instant Games SDK
  if (html.includes('https://sdk.crazygames.com/crazygames-sdk-v3.js')) {
    html = html.replace(
      '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
      '<!-- Facebook Instant Games SDK v7.1 -->\n  <script src="https://connect.facebook.net/en_US/fbinstant.7.1.js"></script>'
    );
    console.log('✅ [FBInstant Build] Replaced CrazyGames SDK with Facebook Instant Games SDK v7.1 in index.html');
  } else if (!html.includes('fbinstant.7.1.js')) {
    // Inject before </head> if not present
    html = html.replace('</head>', '  <script src="https://connect.facebook.net/en_US/fbinstant.7.1.js"></script>\n</head>');
    console.log('✅ [FBInstant Build] Injected Facebook Instant Games SDK v7.1 into <head>');
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
}

// 5. Compress into ready-to-upload .zip (Root of zip must contain index.html & fbapp-config.json)
try {
  if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile);
  }
  const psCmd = `powershell -Command "Compress-Archive -Path '${uploadDir}\\*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 [FBInstant Build] Package generated successfully: ${path.basename(zipFile)} (${sizeMb} MB)`);
  console.log('🚀 Ready to upload directly to Meta Developer Portal -> Instant Games -> Web Hosting!');
} catch (err) {
  console.error('⚠️ [FBInstant Build] Failed to compress zip:', err);
}
