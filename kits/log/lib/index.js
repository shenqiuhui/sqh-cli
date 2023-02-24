'use strict';

const log = require('npmlog');

log.level = process.env.CLI_LOG_LEVEL || 'info'; // 判断 debug 模式
log.heading = 'sqh'; // 添加前缀

log.addLevel('success', 2000, { fg: 'green', bold: true }); // 添加自定义日志 success

module.exports = log;
