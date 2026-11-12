import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const uploadDir = path.join(rootDir, 'youtube-playables-upload');
const zipFile = path.join(rootDir, 'Arrow-Storm-Zombie-Siege-YouTubePlayables.zip');

console.log('🎮 [YouTube Playables Build] Starting packaging...');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory does not exist! Run npm run build first.');
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
console.log('✅ [YouTube Playables Build] Copied dist/ -> youtube-playables-upload/');

// Remove non-YouTube platform configs
const filesToRemove = [
  'fbapp-config.json',
  'playgama-bridge-config.json',
  'portrait_cover.jpg',
  'zombie_bg.jpg'
];
for (const f of filesToRemove) {
  const p = path.join(uploadDir, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { force: true });
    console.log(`🧹 Removed unnecessary platform file: ${f}`);
  }
}

// 3. Inject official YouTube Playables SDK script in index.html
const indexPath = path.join(uploadDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Replace CrazyGames / third party SDK scripts with YouTube Playables API script
  if (html.includes('crazygames-sdk-v3.js')) {
    html = html.replace(
      /(?:<!--.*?CrazyGames.*?-->\s*)?<script src="https:\/\/sdk\.crazygames\.com\/crazygames-sdk-v3\.js"><\/script>/g,
      '<!-- YouTube Playables Official SDK v1 -->\n  <script src="https://www.youtube.com/game_api/v1"></script>'
    );
  } else if (!html.includes('youtube.com/game_api/v1')) {
    html = html.replace(
      '</head>',
      '  <!-- YouTube Playables Official SDK v1 -->\n  <script src="https://www.youtube.com/game_api/v1"></script>\n</head>'
    );
  }

  // Ensure title is clean
  html = html.replace(/<title>.*?<\/title>/, '<title>Zombie Siege - Archer Survival</title>');

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('✅ [YouTube Playables Build] Injected https://www.youtube.com/game_api/v1 into index.html');
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
  console.log(`📦 [YouTube Playables Build] Package generated: ${path.basename(zipFile)} (${sizeMb} MB)`);
  console.log('🚀 Ready for YouTube Playables Test Suite & Developer Console!');
} catch (err) {
  console.error('⚠️ [YouTube Playables Build] Failed to compress zip:', err);
}
