// scripts/refresh.js
// One-shot: fetch raw data, then build season.json.
// Run: node scripts/refresh.js

import { execSync } from 'node:child_process';

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

run('node scripts/fetch-results.js');
run('node scripts/build-season.js');
console.log('\nRefresh complete.');
