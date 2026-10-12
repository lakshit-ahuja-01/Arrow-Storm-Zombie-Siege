import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const uploadDir = path.join(rootDir, 'crazygames-upload');
const zipFile = path.join(rootDir, 'Arrow-Storm-Zombie-Siege-CrazyGames.zip');

console.log('🔄 [CrazyGames Sync] Starting automated sync...');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory does not exist! Run vite build first.');
  process.exit(1);
}

// 1. Sync files into crazygames-upload folder
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
} else {
  // Clean existing files in crazygames-upload
  for (const file of fs.readdirSync(uploadDir)) {
    fs.rmSync(path.join(uploadDir, file), { recursive: true, force: true });
  }
}

fs.cpSync(distDir, uploadDir, { recursive: true });
console.log('✅ [CrazyGames Sync] Synced dist/ -> crazygames-upload/');

// 2. Automatically generate updated CrazyGames zip package
try {
  const psCmd = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  console.log(`✅ [CrazyGames Sync] Generated updated package: ${path.basename(zipFile)}`);
} catch (err) {
  console.error('⚠️ [CrazyGames Sync] Failed to compress zip:', err);
}

console.log('🚀 [CrazyGames Sync] Ready for upload!');
