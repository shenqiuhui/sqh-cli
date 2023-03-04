#!/usr/bin/env node

'use strict';

const importLocal = require('import-local');
const log = require('@sqh-cli/log');

if (importLocal(__filename)) {
  log.info('cli', '正在使用 sqh-cli 本地版本');
} else {
  require('../lib')(process.argv.slice(2));
}
