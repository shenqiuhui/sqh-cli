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

用于初始化项目，不传入项目名称时可通过交互的方式手动填写。

> sqh init

> sqh init [projectName]

### Options

#### -f, --force

当本地目录存在文件时，强制清空并初始化项目。

> sqh init [projectName] --force

#### --filter

用于过滤模板选择列表，默认显示正常模板（值为 "normal"），可选值 "al"|"normal"|"custom"

- `al` 全部模板
- `normal` 正常模板
- `custom` 定制模板

> sqh init [projectName] --filter=normal

> sqh init [projectName] --filter custom

#### -tmp, --templatePath

本地开发（项目/组件）模板的场景，用于指定命令执行时的本地文件路径。

> sqh init [projectName] --templatePath=/Users/username/some-template

> sqh init [projectName] -tmp /Users/username/some-template

## list

通过子命令查看列表。

### Commands

#### template

用于打印已有的模板列表。

##### Options

###### -t, --type

用于指定模板类型（全部/项目/组件），默认为全部（值为 "al"），可选值 "al"|"project"|"component"

- `al` 全部模板
- `project` 项目模板
- `component` 组件模板

> sqh list template --type=component

> sqh list template -t project

###### -f, --filter

用于过滤模板是（正常还是定制），默认显示正常模板（值为 "normal"），可选值 "al"|"normal"|"custom"

- `al` 全部模板
- `normal` 正常模板
- `custom` 定制模板

> sqh list template --filter=custom

> sqh list template -f normal
