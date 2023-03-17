'use strict';

const chalk = require('chalk');
const { table, getBorderCharacters } = require('table');
const Command = require('@sqh-cli/command');
const log = require('@sqh-cli/log');
const { errorLogProcess, spinnerStart } = require('@sqh-cli/utils');
const {
  getProjectTemplates,
  getComponentTemplates,
  getSnippetTemplates
} = require('@sqh-cli/get-template-info');

const ALL = 'al'; // 模板类型（全部）
const TYPE_PROJECT = 'project'; // 模板类型（项目）
const TYPE_COMPONENT = 'component'; // 模板类型（组件）
const TYPE_SNIPPET = 'snippet'; // 模板类型（代码片段）
const TYPE_OPTION_VALUES = ['al', 'project', 'component', 'snippet']; // --filter 选项的值
const FILTER_OPTION_VALUES = ['al', 'normal', 'custom']; // --filter 选项的值

class ListCommand extends Command {
  /**
   * init 原型函数实现
   *
   * @memberof ListCommand
   */
  init () {
    this.type = this._opts.type; // 模板类型（项目/组件）
    this.filter = this._opts.filter; // 模板类型（普通/自定义）
    this.templates = []; // 模板列表

    if (!TYPE_OPTION_VALUES.includes(this.type)) {
      throw new Error('--type 选项值错误，正确的值为 "al"|"project"|"component|"snippet"');
    }

    if (!FILTER_OPTION_VALUES.includes(this.filter)) {
      throw new Error('--filter 选项值错误，正确的值为 "al"|"normal"|"custom"');
    }

    log.verbose('debug: type', this.type);
    log.verbose('debug: filter', this.filter);
  }

  /**
   * exec 原型函数实现
   *
   * @memberof ListCommand
   */
  async exec() {
    const spinner = spinnerStart('获取模板列表...');

    try {
      this.templates = await this.getTemplates(() => spinner.stop());
      this.templates = this.filterTemplates(this.filter);
    } catch (err) {
      errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
    } finally {
      spinner.stop();
    }

    this.printTemplateList(this.templates);
  }

  /**
   * 获取模板列表
   *
   * @memberof ListCommand
   */
  async getTemplates(callback) {
    if (callback && typeof callback !== 'function') {
      throw new Error('callback 参数必须为函数类型！');
    }

    let templates;

    switch(this.type) {
      case ALL:
        templates = await Promise
          .all([getProjectTemplates(), getComponentTemplates(), getSnippetTemplates()])
          .catch((err) => {
            callback && callback();
            errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
          });

        templates = templates.flat();
        break;
      case TYPE_PROJECT:
        templates = await getProjectTemplates();
        break;
      case TYPE_COMPONENT:
        templates = await getComponentTemplates();
        break;
      case TYPE_SNIPPET:
        templates = await getSnippetTemplates();
        break;
    }

    return templates;
  }

  /**
   * 通过 --filter 参数过滤模板列表
   *
   * @param {string} type
   * @returns Array<object>
   * @memberof ListCommand
   */
  filterTemplates(type) {
    const templates = this.templates;

    if (type !== ALL) {
      return templates.filter((template) => template.type === type);
    }

    return templates;
  }

  /**
   * 打印模板列表
   *
   * @param {Array<object>} templates
   * @memberof ListCommand
   */
  printTemplateList(templates) {
    const len = templates.length;
    const list = [];

    templates.forEach((template) => {
      list.push([
        chalk.greenBright(template.name),
        template.npmName,
        template.version
      ]);
    });

    if (list.length > 0) {
      list.unshift([
        chalk.blueBright('模板名称'),
        chalk.blueBright('模块名称'),
        chalk.blueBright('最新版本')
      ]);

      console.log();
      console.log(table(list, {
        border: getBorderCharacters('norc')
      }));
    }

    log.success('cli', `found ${len} templates`);
  }
}

/**
 * list 命令函数
 *
 * @returns new ListCommand
 * @param {array} argv
 */
function list(argv) {
  try {
    return new ListCommand(argv);
  } catch (err) {
    errorLogProcess('cli', err, process.env.CLI_DEBUG_MODE);
  }
}

module.exports = list;
module.exports.ListCommand = ListCommand;
