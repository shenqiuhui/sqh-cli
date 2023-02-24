'use strict';

const semver = require('semver');
const { errorLogProcess } = require('@sqh-cli/utils');

const LOWEST_NODE_VERSION = 'v12.0.0';

class Command {
  /**
   *Creates an instance of Command.

   * @param {array} argv
   * @memberof Command
   */
  constructor(argv) {
    if (!argv) {
      throw new Error('Command 类的参数不能为空！');
    }

    if (!Array.isArray(argv)) {
      throw new Error('Command 类的参数必须为数组！');
    }

    if (argv.length < 1) {
      throw new Error('Command 类的参数列表为空！');
    }

    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.initArgs(argv));
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());

      chain.catch((err) => {
        errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
      });
    });
  }

  /**
   * 初始化参数
   *
   * @param {array} argv
   * @memberof Command
   */
  initArgs(argv) {
    this._opts = argv.pop();
    this._argv = argv;
  }

  /**
   * 检查 nodejs 版本号
   *
   * @memberof Command
   */
  checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;

    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(`sqh-cli 需要安装 ${lowestVersion} 以上版本的 Node.js, 您当前的版本为 ${currentVersion}`);
    }
  }

  /**
   * 默认初始化函数
   *
   * @memberof Command
   */
  init() {
    throw new Error('init() 必须实现！');
  }

  /**
   * 默认执行函数
   *
   * @memberof Command
   */
  exec() {
    throw new Error('exec() 必须实现！');
  }
}

module.exports = Command;
