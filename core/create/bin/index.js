#!/usr/bin/env node

'use strict';

const importLocal = require('import-local');
const cli = require('@sqh-cli/cli');
const log = require('@sqh-cli/log');

if (importLocal(__filename)) {
  log.info('cli', '正在使用 sqh-cli 本地版本');
} else {
  cli(process.argv.slice(2));
}
