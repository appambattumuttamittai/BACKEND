import { createHash } from 'crypto';
import { promisify } from 'util';

// Simple bcrypt-compatible hash generator using node built-ins is not possible
// Instead we'll use a pre-computed approach
// Run: node generate-hash.mjs <your-password>

const password = process.argv[2];
if (!password) {
  console.log('Usage: node generate-hash.mjs <your-password>');
  process.exit(1);
}

// Dynamic import bcryptjs from local node_modules
const { default: bcrypt } = await import('./node_modules/bcryptjs/esm/bcrypt.js').catch(async () => {
  // fallback to CJS
  const mod = await import('./node_modules/bcryptjs/index.js').catch(() => null);
  return mod ? { default: mod.default || mod } : null;
});

if (!bcrypt) {
  console.error('bcryptjs not found. Run: npm install in the backend folder first.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('\n✅ ADMIN_PASSWORD_HASH value to paste in Render:\n');
console.log(hash);
console.log('\n✅ ADMIN_USERNAME value: AJAI (or whatever you want)\n');
