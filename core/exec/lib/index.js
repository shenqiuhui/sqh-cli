'use strict';

const path = require('path');
const Package = require('@sqh-cli/package');
const log = require('@sqh-cli/log');
const { errorLogProcess, spinnerStart, spawn } = require('@sqh-cli/utils');

// 命令对应的默认依赖名称
const SETTINGS = {
  'sqh-init': '@sqh-cli/init',
  'sqh-list-template': '@sqh-cli/list-template'
};

// 缓存目录名称
const CACHE_DIR = 'dependencies';

/**
 * 动态执行命令函数
 *
 */
async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  const debug = process.env.CLI_DEBUG_MODE;
  const cmdInstance = arguments[arguments.length - 1];
  const commandChain = generateCommandChain(cmdInstance);
  const packageName = SETTINGS[commandChain];
  const packageVersion = 'latest';

  log.verbose('debug: homePath', homePath);

  let pkg;

  try {
    if (!targetPath) {
      targetPath = path.resolve(homePath, CACHE_DIR);
      const storeDir = path.resolve(targetPath, 'node_modules');

      log.verbose('debug: targetPath', targetPath);
      log.verbose('debug: storeDir', storeDir);

      pkg = new Package({
        targetPath,
        storeDir,
        packageName,
        packageVersion
      });

      const installed = await pkg.exists();

      if (!installed) {
        const spinner = spinnerStart('正在安装命令...');

        try {
          await pkg.install();
          log.success('命令安装成功');
        } catch (err) {
          throw err;
        } finally {
          spinner.stop(true);
        }
      }
    } else {
      log.verbose('debug: targetPath', targetPath);

      pkg = new Package({
        targetPath,
      });
    }

    const execFilePath = pkg.getExecFilePath();

    log.verbose('debug: execFilePath', execFilePath);

    if (execFilePath) {
      const argv = Array.from(arguments).slice(0, -1);
      const code = `require('${execFilePath}').call(null, ${JSON.stringify(argv)})`;

      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

      child.on('error', function (err) {
        errorLogProcess('cli', err, debug);
        process.exit(1);
      });

      child.on('exit', function (exitCode) {
        log.verbose('cli', `${commandChain.replace(/-/g, ' ')} 命令执行成功`);
        process.exit(exitCode);
      });
    }
  } catch (err) {
    errorLogProcess('cli', err, debug);
  }
}

/**
 * 递归获取命令的调用路径
 *
 * @param {object} program
 * @param {Array<string>} [commands=[]]
 * @returns string
 */
function generateCommandChain(program, commands = []) {
  const command = program.name();
  const parent = program.parent;

  commands.push(command);

  if (parent) {
    return generateCommandChain(parent, commands);
  } else {
    return commands.reverse().join('-');
  }
}

module.exports = exec;
