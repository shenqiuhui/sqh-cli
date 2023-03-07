'use strict';

const path = require('path');
const os = require('os');
const semver = require('semver');
const chalk = require('chalk');
const figlet = require('figlet');
const boxen = require('boxen');
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
const globalOpts = program.opts(); // 命令行参数

const DEFAULT_CLI_HOME = '.sqh-cli'; // 脚手架目录名称
const DEFAULT_CLI_ENV = '.sqh-env'; // 脚手架环境变量文件名称
const DEFAULT_CLI_REGISTRY = 'https://registry.npmmirror.com'; // 默认 npm 源

/**
 * 脚手架主函数
 *
 */
async function cli() {
  try {
    await prepare();
    registerCommand();
  } catch (err) {
    errorLogProcess('cli', err, globalOpts.debug);
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
  argsParse();
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
  process.env.CLI_DEBUG_MODE = globalOpts.debug;
  setLogLevel(globalOpts.debug);
}

/**
 * 检查环境变量
 *
 */
function checkEnv() {
  const dotenv = require('dotenv');
  const dotEnvPath = path.resolve(userHome, DEFAULT_CLI_ENV);

  createDefaultConfig();

  if (pathExists.sync(dotEnvPath)) {
    dotenv.config({
      path: dotEnvPath,
      override: true
    });
  }

  setLogLevel(process.env.CLI_DEBUG_MODE);
}

/**
 * 创建脚手架默认环境变量
 *
 * @returns Object
 */
function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
    cliHomePath: path.join(userHome, DEFAULT_CLI_HOME),
    cliRegistry: DEFAULT_CLI_REGISTRY,
    cliDebugMode: false
  };

  process.env.CLI_HOME_PATH = cliConfig.cliHomePath;
  process.env.CLI_REGISTRY = cliConfig.cliRegistry;
  process.env.CLI_DEBUG_MODE = cliConfig.cliDebugMode;

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
    console.log(boxen(
      dedent`
        发现新版本：${chalk.redBright(`v${currentVersion}`)} → ${chalk.greenBright(`v${latestVersion}`)}

        更新执行：${chalk.magentaBright(`npm install -g ${npmName}`)}
      `,
      {
        padding: 1,
        margin: 1,
        borderColor: 'yellow',
        borderStyle: 'round'
      }
    ));
  } else {
    log.info('cli', currentVersion);
  }
}

/**
 * 设置日志等级
 *
 * @param {boolean} [debug=false]
 */
function setLogLevel(debug = false) {
  process.env.CLI_LOG_LEVEL = log.level = debug ? 'verbose' : 'info';
}

/**
 * 注册全局主命令
 *
 */
function registerMainCommand() {
  program
    .name('sqh')
    .usage('<command> [options]')
    .option('-r, --registry <registryUrl>', '脚手架默认源（用于检查更新、命令组装、模板下载）')
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-cp, --commandPath <targetPath>', '指定本地命令调试文件路径')
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
    .option('-tp, --templatePath <targetPath>', '指定本地模板调试路径')
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

  // 监听 commandPath 选项
  program.on('option:commandPath', function () {
    process.env.CLI_COMMAND_PATH = globalOpts.commandPath;
  });

  // 监听 registry 选项
  program.on('option:registry', function () {
    process.env.CLI_REGISTRY = globalOpts.registry;
  });

  // 监听未知命令
  program.on('command:*', function (unknownCmd) {
    log.error('cli', chalk.redBright(`未知的命令：${unknownCmd[0]}`));
  });
}

/**
 * 命令行参数解析
 *
 */
function argsParse() {
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

module.exports = cli;
