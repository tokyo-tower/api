/**
 * ロガーミドルウェア
 *
 * @module loggerMiddleware
 */
"use strict";
const log4js = require("log4js");
const env = process.env.NODE_ENV || 'development';
// ディレクトリなければ作成(初回アクセス時だけ)
// let logDir = `${__dirname}/../../../logs/${env}/api`;
// let fs = require('fs-extra');
// fs.mkdirsSync(logDir);
log4js.configure({
    appenders: [
        {
            category: 'access',
            type: 'console'
        },
        {
            category: 'system',
            type: 'console'
        },
        {
            type: 'console'
        }
    ],
    levels: {
        access: (env === 'development') ? log4js.levels.ALL.toString() : log4js.levels.OFF.toString(),
        system: (env === 'production') ? log4js.levels.INFO.toString() : log4js.levels.ALL.toString()
    },
    replaceConsole: (env === 'production') ? false : true
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = log4js.connectLogger(log4js.getLogger('access'), {});
