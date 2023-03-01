'use strict';

const urlJoin = require('url-join');
const semver = require('semver');
const request = require('@sqh-cli/request');

/**
 * 获取依赖信息
 *
 * @param {string} npmName
 * @param {string} registry
 * @returns Promise<object | null>
 */
async function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }

  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);

  const data = await request({
    url: npmInfoUrl
  });

  return data;
}

/**
 * 获取 npm 依赖下载的默认源
 *
 * @param {boolean} [isOriginal=false]
 * @returns string
 */
function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

/**
 * 获取依赖版本集合
 *
 * @param {string} npmName
 * @param {string} registry
 * @returns Promise<Array<string>>
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);

  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}

/**
 * 获取依赖的最新版本
 *
 * @param {string} npmName
 * @param {string} registry
 * @returns Promise<string | null>
 */
async function getNpmLatestVersion(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);

  if (data) {
    return data['dist-tags'].latest;
  } else {
    return null;
  }
}

/**
 * 获取大于当前版本的依赖版本集合
 *
 * @param {string} baseVersion
 * @param {string} versions
 * @returns Array<string>
 */
function getNpmSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => semver.satisfies(version, `>${baseVersion}`))
    .sort((a, b) => semver.gt(a, b) ? -1 : 1);
}

module.exports = {
  getNpmInfo,
  getDefaultRegistry,
  getNpmVersions,
  getNpmLatestVersion,
  getNpmSemverVersions
};
