'use strict';

const path = require('path');
const chalk = require('chalk');
const paramCase = require('param-case');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const pkgUp = require('pkg-up');
const pathExists = require('path-exists');
const semver = require('semver');
const { table, getBorderCharacters } = require('table');
const Command = require('@sqh-cli/command');
const Package = require('@sqh-cli/package');
const log = require('@sqh-cli/log');
const {
  isCamelCase,
  errorLogProcess,
  spinnerStart,
  removeFilesTrash,
  filesRender,
  packageManager,
  spawnAsync
} = require('@sqh-cli/utils');
const { getSnippetTemplates } = require('@sqh-cli/get-template-info');

const CACHE_DIR = 'snippets'; // 缓存目录名称
const TARGET_PATH = 'src/pages'; // 页面路径

class AddCommand extends Command {
  /**
   * init 原型函数实现
   *
   * @memberof AddCommand
   */
  init() {
    this.pageName = this._argv[0] || null; // 添加页面名称
    this.force = !!this._opts.force; // 是否强制添加
    this.templatePath = this._opts.templatePath || process.env.CLI_TEMPLATE_PATH; // 本地代码片段路径
    this.localPath = process.cwd(); // 执行命令路径
    this.templates = []; // 页面代码片段列表

    if (this.pageName && !isCamelCase(this.pageName)) {
      throw new Error('页面名称必须是大驼峰命名！');
    }

    log.verbose('debug: pageName', this.pageName);
    log.verbose('debug: force', this.force);
  }

  /**
   * exec 原型函数实现
   *
   * @memberof AddCommand
   */
  async exec() {
    try {
      const prepared = await this.prepare();

      if (prepared) {
        await this.downloadTemplate();
        await this.installTemplate();
      }
    } catch (err) {
      errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
    }
  }

  /**
   * 准备安装环境
   *
   * @memberof AddCommand
   */
  async prepare() {
    const { dirname } = await inquirer.prompt([
      {
        type: 'input',
        name: 'dirname',
        message: '请输入页面名称',
        when: () => !this.pageName,
        validate: function (value) {
          const done = this.async();

          if (!isCamelCase(value)) {
            done('页面名称必须是大驼峰命名！');
          }

          done(null, true);
        }
      }
    ]);

    const targetPath = path.resolve(this.localPath, TARGET_PATH, dirname || this.pageName);

    if (pathExists.sync(targetPath)) {
      if (this.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            default: false,
            message: '页面文件夹已存在，是否覆盖？',
            when: () => this.force
          },
        ]);

        if (overwrite) {
          await removeFilesTrash(targetPath);
        } else {
          return false;
        }
      } else {
        throw new Error('页面文件夹已存在！');
      }
    }

    if (!this.templatePath) {
      const spinner = spinnerStart('获取页面模板列表...');

      try {
        this.templates = await this.getTemplates();
      } catch (err) {
        throw err;
      } finally {
        spinner.stop();
      }
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: '请选择页面模板',
        choices: this.createTemplateChoices(this.templates),
        when: () => !this.templatePath
      }
    ]);

    const name = dirname || this.pageName;
    const paramCaseName = paramCase(name);

    this.info = { targetPath, name, paramCaseName, ...answers };

    log.verbose('debug: info', this.info);

    return true;
  }

  /**
   * 下载页面模板
   *
   * @memberof AddCommand
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
        const spinner = spinnerStart('正在下载页面模板...');

        try {
          await pkg.install();
          log.success('页面模板下载成功');
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
   * 安装页面模板到工作目录
   *
   * @memberof AddCommand
   */
  async installTemplate() {
    await this.copyTemplate();
    await this.generateTemplate();
    await this.dependenciesMerge();
  }

  /**
   * 从缓存拷贝模板到本地
   *
   * @memberof AddCommand
   */
  async copyTemplate() {
    let templateSource;
    const templateDir = this.templatePath || this.templateInterface.getCacheFilePath();

    if (!this.templatePath) {
      templateSource = path.join(templateDir, 'template', this.selectedTemplate.path);
    } else {
      templateSource = this.templatePath;
    }

    const templateTarget = this.info.targetPath;

    log.verbose('debug: templateSource', templateSource);
    log.verbose('debug: templateTarget', templateTarget);

    this.templateSource = templateSource;
    this.templateTarget = templateTarget;

    const spinner = spinnerStart('正在页面安装模板...');

    try {
      fse.ensureDirSync(templateSource);
      fse.ensureDirSync(templateTarget);
      fse.copySync(templateSource, templateTarget);
      Promise.resolve().then(() => log.success('页面模板安装完成'));
    } catch (err) {
      throw err;
    } finally {
      spinner.stop();
    }
  }

  /**
   * 编译模板流程
   *
   * @memberof AddCommand
   */
  async generateTemplate() {
    const spinner = spinnerStart('正在编译页面模板...');

    try {
      await filesRender(this.info.targetPath, this.info);
      Promise.resolve().then(() => {
        log.success('页面模板编译完成');
        log.success('页面添加完成');
      });
    } catch (err) {
      throw err;
    } finally {
      spinner.stop();
    }
  }

  /**
   * 合并依赖
   *
   * @memberof AddCommand
   */
  async dependenciesMerge() {
    const targetPkgPath = pkgUp.sync({ cwd: this.templateTarget });
    const sourcePkgPath = pkgUp.sync({ cwd: this.templateSource });

    log.verbose('debug: targetPkgPath', targetPkgPath);
    log.verbose('debug: sourcePkgPath', sourcePkgPath);

    const targetPkg = require(targetPkgPath);
    const sourcePkg = require(sourcePkgPath);

    const [newTarget, conflicts, misses] = this.dependenciesDiff({
      dependencies: targetPkg.dependencies,
      devDependencies: targetPkg.devDependencies,
      peerDependencies: targetPkg.peerDependencies
    }, {
      dependencies: sourcePkg.dependencies,
      devDependencies: sourcePkg.devDependencies,
      peerDependencies: sourcePkg.peerDependencies
    });

    log.verbose('debug: newTarget', newTarget);
    log.verbose('debug: misses', misses);

    fse.writeJSONSync(targetPkgPath, Object.assign(targetPkg, newTarget), { spaces: 2 });

    if (conflicts.length > 0) {
      console.log();
      console.log('项目依赖与页面代码片段依赖发生冲突，请确认后手动合并：');
      console.log();
      this.consoleConflictTable(conflicts);
    }

    await this.dependenciesInstall();
  }

  /**
   * 获取最新的依赖对象和冲突列表
   *
   * @param {object} [target={}]
   * @param {object} [source={}]
   * @returns [target, conflict, misses]
   * @memberof AddCommand
   */
  dependenciesDiff(target = {}, source = {}) {
    const conflicts = [];
    const misses = {};

    this.iteratorObject(target, source, (depKey, depTarget, depSource) => {
      this.iteratorObject(depTarget, depSource, (key, targetVersion, sourceVersion, flag) => {
        if (!semver.eq(semver.minVersion(targetVersion), semver.minVersion(sourceVersion))) {
          conflicts.push([
            chalk.magentaBright(depKey),
            chalk.greenBright(key),
            targetVersion,
            sourceVersion
          ]);
        }

        if (flag) {
          (misses[depKey] || (misses[depKey] = [])).push(`${key}@${targetVersion}`);
        }
      });
    });

    if (conflicts.length > 0) {
      conflicts.unshift([
        chalk.blueBright('位置'),
        chalk.blueBright('依赖名称'),
        chalk.blueBright('项目版本'),
        chalk.blueBright('代码片段版本')
      ]);
    }

    return [target, conflicts, misses];
  }

  /**
   * 安装合并后缺失的依赖
   *
   * @memberof AddCommand
   */
  async dependenciesInstall() {
    const manager = packageManager(this.localPath);

    if (manager) {
      const exitCode = await spawnAsync(manager, ['install'], {
        cwd: this.localPath,
        stdio: 'inherit'
      });

      if (exitCode) {
        throw new Error('依赖安装失败！');
      }
    }
  }

  /**
   * 依赖遍历函数
   *
   * @param {object} [target={}]
   * @param {object} [source={}]
   * @param {Function} callback
   * @memberof AddCommand
   */
  iteratorObject(target = {}, source = {}, callback) {
    for (let key in source) {
      let flag = false;

      if (typeof target[key] === 'undefined') {
        if (typeof source[key] !== 'undefined') {
          flag = true;
          target[key] = source[key];
        } else {
          delete target[key];
        }
      }

      callback && callback(key, target[key], source[key], flag);
    }
  }

  /**
   * 打印表格
   *
   * @param {Array<string>} data
   * @memberof AddCommand
   */
  consoleConflictTable(data) {
    const config = {
      border: getBorderCharacters('norc'),
      columns: [
        { alignment: 'center' },
        { alignment: 'center' },
        { width: 12, alignment: 'center' },
        { width: 12, alignment: 'center' }
      ]
    };

    console.log(table(data, config));
  }

  /**
   * 获取页面代码片段列表
   *
   * @returns Array<object>
   * @memberof AddCommand
   */
  async getTemplates() {
    const templates = await getSnippetTemplates();

    if (!templates || templates.length === 0) {
      throw new Error('模板数据不存在！');
    }

    return templates;
  }

  /**
   * 创建项目/组件模板选项
   *
   * @param {Array<object>} templates
   * @returns Array<object>
   * @memberof AddCommand
   */
  createTemplateChoices(templates) {
    return templates.map(({ name, npmName }) => ({
      name,
      value: npmName
    }));
  }
}

/**
 * add 命令函数
 *
 * @returns new AddCommand
 * @param {array} argv
 */
function add(argv) {
  try {
    return new AddCommand(argv);
  } catch (err) {
    errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
  }
}

module.exports = add;
module.exports.AddCommand = AddCommand;
