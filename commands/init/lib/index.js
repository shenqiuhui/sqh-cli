'use strict';

const path = require('path');
const pathExists = require('path-exists');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const semver = require('semver');
const validate = require('validate-npm-package-name');
const terminalLink = require('terminal-link');
const camelCase = require('camelcase');
const Command = require('@sqh-cli/command');
const Package = require('@sqh-cli/package');
const log = require('@sqh-cli/log');
const {
  errorLogProcess,
  spinnerStart,
  removeFilesTrash,
  spawnAsync,
  filesRender
} = require('@sqh-cli/utils');
const { getProjectTemplates, getComponentTemplates } = require('@sqh-cli/get-template-info');

const CACHE_DIR = 'templates'; // 缓存目录名称
const ALL = 'al'; // 模板类型（全部）
const TYPE_PROJECT = 'project'; // 模板类型（项目）
const TYPE_COMPONENT = 'component'; // 模板类型（组件）
const TEMPLATE_TYPE_NORMAL = 'normal'; // 模板类型（普通）
const TEMPLATE_TYPE_CUSTOM = 'custom'; // 模板类型（自定义）
const DEFAULT_IGNORE = ['**/node_modules/**', '**/public/**']; // 默认忽略编译的目录
const FILTER_OPTION_VALUES = ['al', 'normal', 'custom']; // --filter 选项的值

// 类型对应的名称映射
const TYPE_NAME_MAP = {
  [TYPE_PROJECT]: '项目',
  [TYPE_COMPONENT]: '组件'
};

class InitCommand extends Command {
  /**
   * init 原型函数实现
   *
   * @memberof InitCommand
   */
  init() {
    this.initName = this._argv[0] || null; // 初始化设置的项目名称
    this.force = !!this._opts.force; // 是否强制初始化
    this.filter = this._opts.filter; // 过滤模板
    this.templatePath = this._opts.templatePath || process.env.CLI_TEMPLATE_PATH; // 本地模板路径
    this.templates = []; // 模板列表
    this.selectedTemplate = {}; // 选中的模板
    this.info = {}; // 初始化信息
    this.initialLocalPath = process.cwd(); // 执行 init 的命令的路径
    this.localPath = this.initialLocalPath; // 执行命令的路径

    if (this.initName && !validate(this.initName).validForNewPackages) {
      throw new Error(`非法的名称，规则请查看 ${terminalLink('npm 文档', 'https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name')} 和 ${terminalLink('validate-npm-package-name 使用文档', 'https://www.npmjs.com/package/validate-npm-package-name')}！`);
    }

    if (!FILTER_OPTION_VALUES.includes(this.filter)) {
      throw new Error('--filter 选项值错误，正确的值为 "al"|"normal"|"custom"');
    }

    log.verbose('debug: initName', this.initName);
    log.verbose('debug: force', this.force);
    log.verbose('debug: filter', this.filter);
  }

  /**
   * exec 原型函数实现
   *
   * @memberof InitCommand
   */
  async exec() {
    try {
      const info = await this.prepare();

      if (info) {
        this.info = info;

        log.verbose('debug: info', this.info);

        await this.downloadTemplate();
        await this.installTemplate();
      }
    } catch (err) {
      errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
    }
  }

  /**
   * 检查和处理项目安装环境
   *
   * @returns boolean
   * @memberof InitCommand
   */
  async prepare() {
    if (!this.isDirEmpty(this.localPath)) {
      const switched = this.switchLocalPath();
      const localPathExists = switched && pathExists.sync(this.localPath);

      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'force',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？',
          when: (answers) => {
            answers.force = true;
            return !this.force;
          }
        },
        {
          type: 'confirm',
          name: 'delete',
          default: false,
          message: '是否清空当前目录下的文件？',
          when: (answers) => {
            answers.delete = false;
            return answers.force && !this.initName;
          }
        },
        {
          type: 'confirm',
          name: 'overwrite',
          default: false,
          message: '发现与项目名称同名的文件夹，是否覆盖？',
          when: (answers) => {
            answers.overwrite = false;
            return answers.force && this.initName && localPathExists;
          }
        }
      ]);

      log.verbose('debug: answers', answers);

      if (!answers.force || (localPathExists && !answers.overwrite)) {
        return;
      }

      if (answers.delete) {
        const spinner = spinnerStart('正在清空当前目录...');

        try {
          await removeFilesTrash(this.localPath);
        } catch (err) {
          throw err;
        } finally {
          spinner.stop();
        }
      }

      if (localPathExists && answers.overwrite) {
        await removeFilesTrash(this.localPath);
      }
    }

    return this.getInfo();
  }

  /**
   * 获取项目/组件录入信息
   *
   * @returns object
   * @memberof InitCommand
   */
  async getInfo() {
    const { type, ...prepareAnswers } = await inquirer.prompt(this.getPreparePromptList());

    if (!this.templatePath) {
      const spinner = spinnerStart('获取模板列表...');

      try {
        this.templates = await this.getTemplates(type);
      } catch (err) {
        throw err;
      } finally {
        spinner.stop();
      }
    }

    const answers = await inquirer.prompt(this.getPromptList(type));
    const name = answers.name || this.initName;
    const camelCaseName = camelCase(name, { pascalCase: true });

    return { type, name, camelCaseName, ...prepareAnswers, ...answers };
  }

  /**
   * 获取前置模板交互信息
   *
   * @returns Array<object>
   * @memberof InitCommand
   */
  getPreparePromptList() {
    return [
      {
        type: 'list',
        name: 'manager',
        message: '请选择包管理器',
        choices: [
          {
            name: 'npm',
            value: 'npm'
          },
          {
            name: 'yarn',
            value: 'yarn'
          },
          {
            name: 'pnpm',
            value: 'pnpm'
          },
          {
            name: 'no install',
            value: null
          }
        ],
        when: () => !this.templatePath
      },
      {
        type: 'list',
        name: 'type',
        message: '请选择初始化类型',
        default: 0,
        choices: [
          {
            name: '项目',
            value: TYPE_PROJECT
          },
          {
            name: '组件',
            value: TYPE_COMPONENT
          }
        ]
      },
      {
        type: 'list',
        name: 'templateType',
        message: '请选择本地调试的模板类型',
        default: 0,
        choices: [
          {
            name: '正常',
            value: TEMPLATE_TYPE_NORMAL
          },
          {
            name: '自定义',
            value: TEMPLATE_TYPE_CUSTOM
          }
        ],
        when: () => !!this.templatePath
      }
    ]
  }

  /**
   * 获取模板数据
   *
   * @param {string} type
   * @returns Array<object>
   * @memberof InitCommand
   */
  async getTemplates(type) {
    let templates;

    switch (type) {
      case TYPE_PROJECT:
        templates = await getProjectTemplates();
        break;
      case TYPE_COMPONENT:
        templates = await getComponentTemplates();
        break;
      default:
        throw new Error('缺少 type 参数！');
    }

    if (!templates || templates.length === 0) {
      throw new Error('模板数据不存在！');
    }

    if (this.filter !== ALL) {
      return templates.filter((template) => template.type === this.filter);
    }

    return templates;
  }

  /**
   * 获取模板交互信息
   *
   * @param {string} type
   * @returns Array<object>
   * @memberof InitCommand
   */
  getPromptList(type) {
    if (!type) {
      throw new Error('缺少 type 参数！');
    }

    return [
      {
        type: 'input',
        name: 'name',
        message: `请输入${TYPE_NAME_MAP[type]}名称`,
        default: `test-${type}`,
        when: () => !this.initName,
        validate: function (value) {
          const done = this.async();

          if (!validate(value).validForNewPackages) {
            done(`非法的名称，规则请查看 ${terminalLink('npm 文档', 'https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name')} 和 ${terminalLink('validate-npm-package-name 使用文档', 'https://www.npmjs.com/package/validate-npm-package-name')}！`);
          }

          done(null, true);
        }
      },
      {
        type: 'input',
        name: 'version',
        message: `请输入${TYPE_NAME_MAP[type]}版本号`,
        default: '0.0.1',
        filter: (value) => semver.valid(value) || value,
        validate: function (value) {
          const done = this.async();

          if (!semver.valid(value)) {
            done('请输入合法的版本号');
          }

          done(null, true);
        }
      },
      {
        type: 'input',
        name: 'description',
        message: '请输入组件描述',
        when: () => type === TYPE_COMPONENT,
      },
      {
        type: 'list',
        name: 'template',
        message: `请选择${TYPE_NAME_MAP[type]}模板`,
        choices: this.createTemplateChoices(this.templates),
        when: () => !this.templatePath
      }
    ];
  }

  /**
   * 下载项目/组件模板
   *
   * @memberof InitCommand
   */
  async downloadTemplate() {
    if (!this.templatePath) {
      const homePath = process.env.CLI_HOME_PATH;
      const templateInfo = this.templates.find((template) => template.npmName === this.info.template);
      const targetPath = path.resolve(homePath, CACHE_DIR);
      const storeDir = path.resolve(targetPath, 'node_modules');

      log.verbose('debug: targetPath', targetPath);
      log.verbose('debug: storeDir', storeDir);

      const pkg = new Package({
        targetPath,
        storeDir,
        packageName: templateInfo.npmName,
        packageVersion: templateInfo.version
      });

      this.templateInterface = pkg;
      this.selectedTemplate = templateInfo;

      log.verbose('debug: selectedTemplate', this.selectedTemplate);

      const installed = await pkg.exists();

      if (!installed) {
        const spinner = spinnerStart('正在下载模板...');

        try {
          await pkg.install();
          log.success('模板下载成功');
        } catch (err) {
          throw err;
        } finally {
          spinner.stop();
        }
      }
    } else {
      log.verbose('debug: templatePath', this.templatePath);

      this.templateInterface = new Package({
        targetPath: this.templatePath
      });
    }
  }

  /**
   * 安装项目/组件模板到工作目录
   *
   * @memberof InitCommand
   */
  async installTemplate() {
    const templateInfo = !this.templatePath
      ? this.selectedTemplate
      : { type: this.info.templateType };

    if (templateInfo) {
      switch (templateInfo.type) {
        case TEMPLATE_TYPE_NORMAL:
          await this.installNormalTemplate();
          break;
        case TEMPLATE_TYPE_CUSTOM:
          await this.installCustomTemplate();
          break;
        default:
          throw new Error('模板类型无法识别！');
      }
    } else {
      throw new Error('模板信息不存在！');
    }
  }

  /**
   * 安装正常模板
   *
   * @memberof InitCommand
   */
  async installNormalTemplate() {
    await this.copyTemplate();
    await this.generateTemplate();
    await this.installAndStart();
  }

  /**
   * 安装自定义模板
   *
   * @memberof InitCommand
   */
  async installCustomTemplate() {
    const execFilePath = this.templateInterface.getExecFilePath();

    if (pathExists.sync(execFilePath)) {
      const options = {
        root: this.initialLocalPath,
        cwd: this.localPath,
        info: this.info,
        selectedTemplate: this.selectedTemplate,
        debug: process.env.CLI_DEBUG_MODE
      };

      const code = `require('${execFilePath}').call(null, ${JSON.stringify(options)})`;

      if (!pathExists.sync(this.localPath)) {
        fse.ensureDirSync(this.localPath);
      }

      await this.execCommand({
        program: 'node',
        command: ['-e', code],
        errMsg: '自定义模板执行失败！'
      });
    } else {
      throw new Error('自定义调试模板执行文件不存在！');
    }
  }

  /**
   * 从缓存拷贝模板到本地
   *
   * @memberof InitCommand
   */
  async copyTemplate() {
    const templateDir = this.templatePath || this.templateInterface.getCacheFilePath();
    const templateSource = path.resolve(templateDir, 'template');

    log.verbose('debug: templateSource', templateSource);
    log.verbose('debug: templateTarget', this.localPath);

    const spinner = spinnerStart('正在安装模板...');

    try {
      fse.ensureDirSync(templateSource);
      fse.ensureDirSync(this.localPath);
      fse.copySync(templateSource, this.localPath);
      Promise.resolve().then(() => log.success('模板安装完成'));
    } catch (err) {
      throw err;
    } finally {
      spinner.stop();
    }
  }

  /**
   * 切换执行目录
   *
   * @memberof InitCommand
   */
  switchLocalPath() {
    if (this.initName) {
      this.localPath = path.resolve(this.localPath, this.initName);
      return true;
    }

    return false;
  }

  /**
   * 编译模板流程
   *
   * @memberof InitCommand
   */
  async generateTemplate() {
    const spinner = spinnerStart('正在编译模板...');

    try {
      const ignore = this.selectedTemplate.ignore || DEFAULT_IGNORE;

      await filesRender(this.localPath, this.info, {
        ignore,
        dot: true
      });
      Promise.resolve().then(() => {
        log.success('模板编译完成');
        log.success(`${TYPE_NAME_MAP[this.info.type]}初始化完成`);
      });
    } catch (err) {
      throw err;
    } finally {
      spinner.stop();
    }
  }

  /**
   * 本地安装依赖和启动
   *
   * @memberof InitCommand
   */
  async installAndStart() {
    const manager = this.info.manager;
    const installCmd = this.selectedTemplate.installCmd;
    const startCmd = this.selectedTemplate.startCmd;

    if (manager && installCmd) {
      const depsInstalled = await this.execCommand({
        program: manager,
        command: installCmd,
        errMsg: '依赖安装失败！'
      });

      if (depsInstalled && startCmd) {
        await this.execCommand({
          program: manager,
          command: startCmd,
          errMsg: '项目启动失败！'
        });
      }
    }
  }

  /**
   * 执行命令函数
   *
   * @param {object} options
   * @returns boolean
   * @memberof InitCommand
   */
  async execCommand(options) {
    const { program, command, errMsg } = options;

    if (program && command) {
      let cmdArgs;

      if (typeof command === 'string') {
        cmdArgs = command.split(' ');
      } else if (Array.isArray(command)) {
        cmdArgs = command;
      } else {
        throw new Error('command 参数必须为字符串或数组！');
      }

      const exitCode = await spawnAsync(program, cmdArgs, {
        cwd: this.localPath,
        stdio: 'inherit'
      });

      if (exitCode) {
        throw new Error(errMsg || '执行出错了！');
      }

      return true;
    }
  }

  /**
   * 创建项目/组件模板选项
   *
   * @param {Array<object>} templates
   * @returns Array<object>
   * @memberof InitCommand
   */
  createTemplateChoices(templates) {
    return templates.map(({ name, npmName }) => ({
      name,
      value: npmName
    }));
  }

  /**
   * 判断传入的文件夹路径是否需要强制创建
   *
   * @param {string} localPath
   * @returns boolean
   * @memberof InitCommand
   */
  isDirEmpty(localPath) {
    const fileList = fse.readdirSync(localPath);

    return !fileList || fileList.length <= 0;
  }
}

/**
 * 初始化命令函数
 *
 * @returns new InitCommand
 * @param {array} argv
 */
function init(argv) {
  try {
    return new InitCommand(argv);
  } catch (err) {
    errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
  }
}

module.exports = init;
module.exports.InitCommand = InitCommand;
