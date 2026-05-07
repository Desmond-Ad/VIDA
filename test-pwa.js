#!/usr/bin/env node
/**
 * PWA Installation Test Script
 * Run this to verify all PWA files are in place and accessible
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const files = [
  { path: '/manifest.json', desc: 'PWA Manifest' },
  { path: '/sw.js', desc: 'Service Worker' },
  { path: '/Public/login.html', desc: 'Login Page' },
  { path: '/Public/Purchase.html', desc: 'Purchase Page' },
  { path: '/Public/rev.html', desc: 'Receive Page' },
  { path: '/Public/Dashboard.html', desc: 'Dashboard Page' },
  { path: '/images/DIVA.png', desc: 'App Icon' }
];

// Try localhost first, then LAN IPs (auto-detect common interfaces)
const localCandidates = ['http://localhost:5000', 'http://127.0.0.1:5000'];
// Add common LAN IPs (if you know yours, edit here or the script will try localhost first)
const lanCandidates = ['http://10.219.213.233:5000', 'http://10.73.92.233:5000'];
const baseURL = localCandidates[0];

console.log('🧪 VIDA PWA Verification Test\n');
console.log(`Testing server at: ${baseURL}\n`);

let passed = 0;
let failed = 0;

async function testFile(file) {
  // Try multiple base URLs so tester can run from LAN or localhost
  const candidates = [...localCandidates, ...lanCandidates];
  let succeeded = false;
  let lastErr = null;

  for (const base of candidates) {
    const url = new URL(file.path, base);
    try {
      const ok = await new Promise((resolveReq) => {
        const req = http.get(url, (res) => {
          // consider 200 OK as success
          resolveReq(res.statusCode === 200 ? { ok: true, status: res.statusCode } : { ok: false, status: res.statusCode });
          res.resume();
        });

        req.on('error', (err) => {
          resolveReq({ ok: false, err });
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolveReq({ ok: false, err: new Error('Timeout') });
        });
      });

      if (ok && ok.ok) {
        console.log(`✅ ${file.desc.padEnd(20)} (${ok.status}) - ${url.href}`);
        passed++;
        succeeded = true;
        break;
      } else {
        lastErr = ok.err || new Error(`Status ${ok.status}`);
        // continue to next candidate
      }
    } catch (err) {
      lastErr = err;
    }
  }

  if (!succeeded) {
    const msg = lastErr && lastErr.message ? lastErr.message : '';
    console.log(`❌ ${file.desc.padEnd(20)} (ERROR: ${msg})`);
    failed++;
  }
}

(async () => {
  for (const file of files) {
    await testFile(file);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  if (failed === 0) {
    console.log('✨ All PWA files are accessible! Installation should work.\n');
    console.log('📱 Next steps:');
    console.log('1. Open your phone browser');
    console.log('2. Visit: http://10.73.92.233:5000 (or your computer IP:5000)');
    console.log('3. Look for "Install VIDA App" button or auto-prompt');
    console.log('4. Click to install the app on your home screen\n');
  } else {
    console.log('⚠️  Some files are missing or not accessible.');
    console.log('Check that your Node server is running and all files exist.\n');
  }
})();
