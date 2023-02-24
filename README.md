# sqh-cli

快速初始化项目和组件的脚手架。

# install

> npm install -g @sqh-cli/core

# Usage

> sqh init

# Global Options

## -d, --debug

开启调试模式。

> sqh [command] --debug

## -tp, --targetPath

调试和自定义开发命令的场景，用于指定命令执行时的本地文件路径。

> sqh [command] --targetPath=/Users/username/commands/init

> sqh [command] -tp /Users/username/commands/init


# Commands

## init

用于初始化项目。

> npm init [projectName]

### options

#### -f, --force

当本地目录存在文件时，强制清空并初始化项目

> npm init [projectName] --force

#### -tmp, --templatePath

本地开发（项目/组件）模板的场景，用于指定命令执行时的本地文件路径。

> npm init [projectName] -templatePath=/Users/username/some-template

> npm init [projectName] -tmp /Users/username/some-template
