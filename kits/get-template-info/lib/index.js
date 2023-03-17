'use strict';

const request = require('@sqh-cli/request');

/**
 * 获取项目模板信息
 *
 * @returns Promise<data>
 */
function getProjectTemplates() {
  return request({
    url: '/project/templates'
  });
}

/**
 * 获取组件模板信息
 *
 * @returns Promise<data>
 */
function getComponentTemplates() {
  return request({
    url: '/component/templates'
  });
}

/**
 * 获取代码片段模板信息
 *
 * @returns Promise<data>
 */
function getSnippetTemplates() {
  return request({
    url: '/snippet/templates'
  });
}

module.exports = {
  getProjectTemplates,
  getComponentTemplates,
  getSnippetTemplates
};
