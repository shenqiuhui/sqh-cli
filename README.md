# sqh-cli

快速初始化项目和组件的脚手架。

# install

> npm install -g @sqh-cli/cli

# Usage

全局安装后：

> sqh --help

无需安装：

> npm init @sqh-cli help

> npx @sqh-cli/create --help

# Global Options

## -r, --registry

设置更新检查、命令组装、模板下载的源，默认 https://registry.npmmirror.com。

> sqh [command] --registry=https://registry.npmjs.org

> sqh [command] -r https://registry.npmjs.org

## -d, --debug

开启调试模式。

> sqh [command] --debug

## -cp, --commandPath

调试和自定义开发命令的场景，用于指定命令执行时的本地文件路径。

> sqh [command] --commandPath=/Users/username/commands/init

> sqh [command] -cp /Users/username/commands/init

# Commands

## init

用于初始化项目，不传入项目名称时可通过交互的方式手动填写。

> sqh init

> sqh init [projectName]

### Options

#### -f, --force

当本地目录存在文件时，强制初始化项目。

> sqh init [projectName] --force

规则：

- 本地目录为空无论是否存在 `projectName`，都在当前目录直接创建；
- 本地目录不为空，且命令中存在 `projectName` 时，询问是否清空目录内容：
  - 是，则清空目录后直接在当前目录创建；
  - 否，则用 `projectName` 作为新的文件夹名称创建项目；
- 本地目录不为空，且已存在 `projectName` 同名文件夹时，提示用户是否覆盖：
  - 是，直接覆盖并创建；
  - 否，取消创建。

#### --filter

用于过滤模板选择列表，默认显示正常模板（值为 "normal"），可选值 "al"|"normal"|"custom"

- `al` 全部模板
- `normal` 正常模板
- `custom` 定制模板

> sqh init [projectName] --filter=normal

> sqh init [projectName] --filter custom

#### -tp, --templatePath

本地开发（项目/组件）模板的场景，用于指定命令执行时的本地文件路径。

> sqh init [projectName] --templatePath=/Users/username/some-template

> sqh init [projectName] -tp /Users/username/some-template

## list

用于打印已有的模板列表。

### Options

#### -t, --type

用于指定模板类型（全部/项目/组件），默认为全部（值为 "al"），可选值 "al"|"project"|"component"

- `al` 全部模板
- `project` 项目模板
- `component` 组件模板

> sqh list --type=component

> sqh list -t project

#### -f, --filter

用于过滤模板是（正常还是定制），默认显示正常模板（值为 "normal"），可选值 "al"|"normal"|"custom"

- `al` 全部模板
- `normal` 正常模板
- `custom` 定制模板

> sqh list --filter=custom

> sqh list -f normal

# .sqh-env 环境变量文件

可以在用户目录下手动创建环境变量文件，用于设置脚手架内部使用的环境变量。

优先级：`Options` 参数 > `.sqh-env` 文件 > 脚手架默认值

可更改环境变量列表：

- `CLI_DEBUG_MODE` 布尔值，设置是否为调试模式，作用等于 `--debug`；
- `CLI_HOME_PATH` 默认值 `/Users/username/.sqh-cli`，用于设置脚手架的文件存储目录，包含已安装的命令和组件的缓存等；
- `CLI_COMMAND_PATH` 调试时指定命令的模块路径或模块的可执行文件路径，作用等于 `--commandPath`；
- `CLI_TEMPLATE_PATH` 调试时指定操作的本地模板路径，作用等于 `init --templatePath`；
- `CLI_REGISTRY` 安装命令和模板等所使用的源，默认值 https://registry.npmmirror.com
