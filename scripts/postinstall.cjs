#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const omit = process.env.npm_config_omit || '';
const skippingForProduction = process.env.npm_config_production === 'true';
const skippingForOmittedDev = omit.split(',').map((value) => value.trim()).includes('dev');

if (skippingForProduction || skippingForOmittedDev) {
  console.log('Skipping postinstall build because dependencies were installed without dev dependencies.');
  process.exit(0);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', 'build'], { stdio: 'inherit' });

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
