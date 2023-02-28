'use strict';

const getTemplateInfo = require('..');
const assert = require('assert').strict;

assert.strictEqual(getTemplateInfo(), 'Hello from getTemplateInfo');
console.info("getTemplateInfo tests passed");
