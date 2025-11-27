#!/usr/bin/env node

import { existsSync, copyFileSync, unlinkSync } from 'fs';
import { join } from 'path';

// File mappings: original -> vercel version
const fileMappings = {
  'src/app/api/pm2/route.ts': 'src/app/api/pm2/route-vercel.ts',
  'src/app/api/pm2/system/route.ts': 'src/app/api/pm2/system/route-vercel.ts'
};

const backupSuffix = '.original';

function backupAndReplace() {
  console.log('🔄 Preparing for Vercel deployment...');
  
  Object.entries(fileMappings).forEach(([original, vercel]) => {
    const originalPath = join(process.cwd(), original);
    const vercelPath = join(process.cwd(), vercel);
    const backupPath = originalPath + backupSuffix;
    
    try {
      // Check if files exist
      if (!existsSync(originalPath)) {
        console.log(`⚠️  Original file not found: ${original}`);
        return;
      }
      
      if (!existsSync(vercelPath)) {
        console.log(`⚠️  Vercel version not found: ${vercel}`);
        return;
      }
      
      // Backup original if not already backed up
      if (!existsSync(backupPath)) {
        copyFileSync(originalPath, backupPath);
        console.log(`💾 Backed up: ${original} -> ${original}${backupSuffix}`);
      }
      
      // Replace with Vercel version
      copyFileSync(vercelPath, originalPath);
      console.log(`✅ Replaced: ${original} with Vercel-compatible version`);
      
    } catch (error) {
      console.error(`❌ Error processing ${original}:`, error.message);
    }
  });
  
  console.log('\n🎉 Ready for Vercel deployment!');
  console.log('\nTo revert changes, run: npm run revert-vercel');
}

function revertChanges() {
  console.log('🔄 Reverting Vercel changes...');
  
  Object.keys(fileMappings).forEach(original => {
    const originalPath = join(process.cwd(), original);
    const backupPath = originalPath + backupSuffix;
    
    try {
      if (existsSync(backupPath)) {
        copyFileSync(backupPath, originalPath);
        unlinkSync(backupPath);
        console.log(`✅ Restored: ${original}`);
      } else {
        console.log(`⚠️  No backup found for: ${original}`);
      }
    } catch (error) {
      console.error(`❌ Error reverting ${original}:`, error.message);
    }
  });
  
  console.log('\n🎉 Changes reverted!');
}

// Command line handling
const command = process.argv[2];

switch (command) {
  case 'prepare':
  case 'deploy':
    backupAndReplace();
    break;
  case 'revert':
  case 'restore':
    revertChanges();
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/prepare-for-vercel.js prepare  - Prepare for Vercel deployment');
    console.log('  node scripts/prepare-for-vercel.js revert   - Revert to original PM2 version');
    break;
}