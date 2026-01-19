/**
 * Copy data files from src/data to dist/data
 * This script is run as part of the build process to ensure
 * JSON data files are available at runtime.
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Copy file
      copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

const srcData = join(rootDir, 'src', 'data');
const destData = join(rootDir, 'dist', 'data');

console.log('Copying data files from src/data to dist/data...');

if (existsSync(srcData)) {
  copyDir(srcData, destData);
  console.log('Data files copied successfully!');
} else {
  console.error('Source data directory not found:', srcData);
  process.exit(1);
}
