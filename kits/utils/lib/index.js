'use strict';

const cp = require('child_process');
const kindOf = require('kind-of');
const chalk = require('chalk');
const ora = require('ora');
const log = require('@sqh-cli/log');

/**
 * 判断传入值是否为对象
 *
 * @param {*} value
 * @returns boolean
 */
function isObject(value) {
  return kindOf(value) === 'object';
}

/**
 * 错误日志打印函数
 *
 * @param {string} prefix
 * @param {object} error
 * @param {boolean} [debug=false]
 */
function errorLogProcess(prefix, error, debug = false) {
  if (debug) {
    console.error(chalk.redBright(error.stack));
  } else {
    log.error(prefix, chalk.redBright(error.message));
  }
}

/**
 * 命令行 loading
 *
 * @returns spinner
 */
function spinnerStart(msg = 'processing..') {
  return ora(msg).start();
}

/**
 * 命令行短暂休眠
 *
 * @param {number} [timeout=1000]
 * @returns
 */
function sleep(timeout = 1000) {
  return new Promise((reject) => setTimeout(reject, timeout));
}

/**
 * 兼容 Windows 版本的 spawn 函数
 *
 * @param {string} command
 * @param {Array<string>} args
 * @param {object} [options={}]
 * @returns
 */
function spawn(command, args, options = {}) {
  const win32 = process.platform === 'win32';

  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args;

  return cp.spawn(cmd, cmdArgs, options);
}

/**
 * 兼容 Windows 版本的 spawn 函数（异步）
 *
 * @param {string} command
 * @param {Array<string>} args
 * @param {object} [options={}]
 * @returns Promise
 */
function spawnAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on('error', function (err) {
      reject(err);
    });

    child.on('exit', function (exitCode) {
      resolve(exitCode);
    });
  });
}

module.exports = {
  isObject,
  errorLogProcess,
  spinnerStart,
  sleep,
  spawn,
  spawnAsync
};
