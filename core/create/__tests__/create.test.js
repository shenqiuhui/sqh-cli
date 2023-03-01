'use strict';

const create = require('..');
const assert = require('assert').strict;

assert.strictEqual(create(), 'Hello from create');
console.info("create tests passed");
