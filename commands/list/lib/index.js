'use strict';

const chalk = require('chalk');
const Command = require('@sqh-cli/command');
const log = require('@sqh-cli/log');
const { errorLogProcess, spinnerStart } = require('@sqh-cli/utils');
const { getProjectTemplates, getComponentTemplates } = require('@sqh-cli/get-template-info');

const ALL = 'al'; // 模板类型（全部）
const TYPE_PROJECT = 'project'; // 模板类型（项目）
const TYPE_COMPONENT = 'component'; // 模板类型（组件）
const TYPE_OPTION_VALUES = ['al', 'project', 'component']; // --filter 选项的值
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
      throw new Error('--type 选项值错误，正确的值为 "al"|"project"|"component"');
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

    this.consoleTemplateList(this.templates);
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
          .all([getProjectTemplates(), getComponentTemplates()])
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
  consoleTemplateList(templates) {
    const len = templates.length;

    templates.forEach(({ npmName, name }) => {
      console.log(chalk.whiteBright(`${npmName} (${name})`));
    });

    log.success('cli', `found ${len} templates`);
  }
}

/**
 * list template 命令函数
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
