'use strict';

module.exports = cli;

const path = require('path');
const os = require('os');
const semver = require('semver');
const chalk = require('chalk');
const figlet = require('figlet');
const pathExists = require('path-exists');
const dedent = require('dedent');
const commander = require('commander');
const log = require('@sqh-cli/log');
const exec = require('@sqh-cli/exec');
const { errorLogProcess } = require('@sqh-cli/utils');
const { getNpmLatestVersion } = require('@sqh-cli/get-npm-info');
const pkg = require('../package.json');

const userHome = os.homedir(); // 用户主目录
const program = new commander.Command(); // 创建命令行实例
const args = program.opts(); // 命令行参数

const DEFAULT_CLI_HOME = '.sqh-cli'; // 脚手架目录名称
const DEFAULT_CLI_ENV = '.sqh-env'; // 脚手架环境变量文件名称

/**
 * 脚手架主函数
 *
 */
async function cli() {
  try {
    await prepare();
    registerCommand();
  } catch (err) {
    errorLogProcess('cli', err, args.debug);
  }
}

/**
 * 阶段一：执行准备
 *
 */
async function prepare() {
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

/**
 * 阶段二：命令注册
 *
 */
function registerCommand() {
  registerMainCommand();
  registerInitCommand();
  registerListCommand();
  watchOptionsAndCommands();
}

/**
 * 检查 root 权限
 *
 */
function checkRoot() {
  require('root-check')();
}

/**
 * 检查用户主目录
 *
 */
function checkUserHome() {
  if (!userHome || !pathExists.sync(userHome)) {
    throw new Error('当前登录用户主目录不存在');
  }
}

/**
 * 处理调试模式
 *
 */
function setDebugEnv() {
  if (args.debug) {
    process.env.CLI_LOG_LEVEL = 'verbose';
    process.env.CLI_DEBUG_MODE = true;
  } else {
    process.env.CLI_LOG_LEVEL = 'info';
    process.env.CLI_DEBUG_MODE = false;
  }

  log.level = process.env.CLI_LOG_LEVEL;
}

/**
 * 检查环境变量
 *
 */
function checkEnv() {
  const dotenv = require('dotenv');
  const dotEnvPath = path.resolve(userHome, DEFAULT_CLI_ENV);

  if (pathExists.sync(dotEnvPath)) {
    dotenv.config({
      path: dotEnvPath
    });
  } else {
    createDefaultConfig();
  }
}

/**
 * 创建脚手架默认环境变量
 *
 * @returns Object
 */
function createDefaultConfig() {
  const cliConfig = {
    home: userHome
  };

  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
  }

  process.env.CLI_HOME_PATH = cliConfig.cliHome;

  return cliConfig;
}

/**
 * 检查脚手架版本并提示更新
 *
 */
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const latestVersion = await getNpmLatestVersion(npmName);

  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    log.warn('cli', chalk.yellowBright(dedent`
      ${npmName} 发现新版本 v${latestVersion}，当前版本为 v${currentVersion}
      更新命令：npm install -g ${npmName}
    `));
  } else {
    log.info('cli', currentVersion);
  }
}

/**
 * 注册全局主命令
 *
 */
function registerMainCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '指定本地命令调试文件路径')
    .version(pkg.version);

  commandsHelpTips(program, ['sqh']);
}

/**
 * 注册 init 命令
 *
 */
function registerInitCommand() {
  program
    .command('init [projectName]')
    .description('初始化项目')
    .option('-f, --force', '是否强制初始化项目', false)
    .option('--filter <execType>', '过滤模板列表 "al"|"normal"|"custom"', 'normal')
    .option('-tmp, --templatePath <templatePath>', '指定本地模板调试路径')
    .action(exec);
}

/**
 * 注册 list 命令
 *
 */
function registerListCommand() {
  program
    .command('list [options]')
    .description('查看模板列表')
    .option('-t, --type <templateType>', '查看模板列表 "al"|"project"|"component"', 'al')
    .option('-f, --filter <execType>', '过滤模板列表 "al"|"normal"|"custom"', 'al')
    .action(exec);
}

/**
 * 监听 Options 和 Commands
 *
 */
function watchOptionsAndCommands() {
  // 监听调试模式
  program.on('option:debug', function () {
    setDebugEnv();
    log.verbose('cli', chalk.cyanBright('开启调试模式'));
  });

  // 监听 targetPath 选项
  program.on('option:targetPath', function () {
    process.env.CLI_TARGET_PATH = args.targetPath;
  });

  // 监听未知命令
  program.on('command:*', function (unknownCmd) {
    log.error('cli', chalk.redBright(`未知的命令：${unknownCmd[0]}`));
  });

  program.parse(process.argv);

  // 未输入命令打印帮助文档
  if (program.args && program.args.length === 0) {
    program.outputHelp();
  }
}

/**
 * 命令的帮助文档提示
 *
 * @param {object} program
 * @param {Array<string>} commands
 */
function commandsHelpTips(program, commands) {
  const commandStr = commands.join(' ');
  const searchCommand = commands.slice(-1);

  program
    .on('--help', function () {
      console.log();
      console.log();
      console.log(chalk.magentaBright(figlet.textSync(`${searchCommand}!`, {
        font: 'Ghost'
      })));
      console.log();
      console.log(`执行 ${chalk.cyanBright(`${commandStr} <command> --help`)} 或 ${chalk.cyanBright(`${commandStr} help <command>`)} 查看命令帮助文档`);
    });
}
