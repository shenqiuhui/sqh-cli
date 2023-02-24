'use strict';

const request = require('@sqh-cli/request');

function getProjectTemplates() {
  return request({
    url: '/project/templates'
  });
}

function getComponentTemplates() {
  return request({
    url: '/component/templates'
  });
}

module.exports = {
  getProjectTemplates,
  getComponentTemplates
};
