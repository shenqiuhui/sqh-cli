'use strict';

const path = require('path');
const pathExists = require('path-exists');
const fse = require('fs-extra');
const semver = require('semver');
const inquirer = require('inquirer');
const pkgDir = require('pkg-dir');
const npminstall = require('npminstall');
const log = require('@sqh-cli/log');
const { getDefaultRegistry, getNpmLatestVersion } = require('@sqh-cli/get-npm-info');
const { isObject, spinnerStart } = require('@sqh-cli/utils');

class Package {
  /**
   * Creates an instance of Package.
   *
   * @param {Object} options
   * @memberof Package
   */
  constructor(options) {
    if (!options) {
      throw new Error('Package 类的 options 参数不能为空！');
    }

    if (!isObject(options)) {
      throw new Error('Package 类的 options 参数必须为对象！');
    }

    this.targetPath = options.targetPath; // package 路径
    this.storeDir = options.storeDir; // 缓存路径
    this.packageName = options.packageName || ''; // 执行命令的依赖中 package.json 中的 name
    this.packageVersion = options.packageVersion || 'latest'; // package 的版本
    this.currentPackageVersion = this.packageVersion // 已安装的最新版本
    this.cacheFilePathPrefix = `${this.packageName.replace('/', '+')}`; // cnpm 规则缓存路径前缀
  }

  /**
   * 检查依赖安装状态的前置设置
   *
   * @memberof Package
   */
  async _prepare() {
    // npminstall 默认会创建不存在的路径（保险起见手动处理）
    if (this.storeDir && !pathExists.sync(this.storeDir)) {
      fse.mkdirpSync(path.resolve(this.storeDir, '.store'));
    }

    const spinner = spinnerStart('正在检查更新...');

    try {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    } catch (err) {
      throw err;
    } finally {
      spinner.stop();
    }
  }

  /**
   * 返回缓存路径
   *
   * @readonly
   * @memberof Package
   */
  _getCacheFilePath(version) {
    return path.resolve(
      this.storeDir,
      '.store',
      `${this.cacheFilePathPrefix}@${version}`,
      'node_modules',
      this.packageName
    );
  }

  /**
   * 返回缓存路径，供实例使用
   *
   * @returns
   * @memberof Package
   */
  getCacheFilePath() {
    return this._getCacheFilePath(this.packageVersion);
  }

  /**
   * 判断 package 是否存在
   *
   * @returns Promise<boolean>
   * @memberof Package
   */
  async exists() {
    if (this.storeDir) {
      await this._prepare();
      const shouldUpdate = this._shouldUpdate();
      const installed = pathExists.sync(this._getCacheFilePath(this.currentPackageVersion));

      if (installed && shouldUpdate) {
        const { isUpdate } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'isUpdate',
            message: `${this.packageName} 发现新版本 ${this.packageVersion}，本地缓存版本为 ${this.currentPackageVersion}，是否更新？`
          }
        ]);

        if (isUpdate) {
          this.currentPackageVersion = this.packageVersion;
        } else {
          this.packageVersion = this.currentPackageVersion;
        }

        return !isUpdate;
      } else {
        log.verbose('debug: installed', installed ? '安装过不需要更新': '未安装需要安装');

        return installed;
      }
    } else {
      return pathExists.sync(this.targetPath);
    }
  }

  /**
   * 判断模块是否有更新
   *
   * @returns boolean
   * @memberof Package
   */
  _shouldUpdate() {
    if (this.storeDir) {
      const deps = fse.readdirSync(path.resolve(this.storeDir, '.store'));
      const depVersions = deps
        .filter((dep) => dep.includes(this.cacheFilePathPrefix))
        .map((dep) => dep.split('@').slice(-1)[0]);

      if (depVersions.length > 0) {
        this.currentPackageVersion = depVersions.reduce((prev, next) => {
          return semver.gt(prev, next) ? prev : next;
        });

        return this.currentPackageVersion !== this.packageVersion;
      }
    }

    return false;
  }

  /**
   * 安装 package
   *
   * @returns Promise<void>
   * @memberof Package
   */
  install() {
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion
        }
      ]
    });
  }

  /**
   * 获取入口文件的路径
   *
   * @returns string | null
   * @memberof Package
   */
  getExecFilePath() {
    if (this.storeDir) {
      return this._getExecFileAsPath(this._getCacheFilePath(this.packageVersion));
    } else {
      return this._getExecFileAsPath(this.targetPath);
    }
  }

  /**
   * 获取入口文件的路径封装
   *
   * @param {string} targetPath
   * @returns string | null
   * @memberof Package
   */
  _getExecFileAsPath(targetPath) {
    const dir = pkgDir.sync(targetPath);

    if (dir) {
      const pkgFile = require(path.resolve(dir, 'package.json'));

      if (pkgFile && pkgFile.main) {
        return path.resolve(dir, pkgFile.main);
      }
    }

    return null;
  }
}

module.exports = Package;
