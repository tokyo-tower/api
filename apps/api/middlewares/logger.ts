/**
 * ロガーミドルウェア
 *
 * @module loggerMiddleware
 */

import * as log4js from 'log4js';

const env = process.env.NODE_ENV || 'dev';

// ディレクトリなければ作成(初回アクセス時だけ)
// let logDir = `${__dirname}/../../../logs/${env}/api`;
// let fs = require('fs-extra');
// fs.mkdirsSync(logDir);

log4js.configure({
    appenders: [
        {
            category: 'access', // アクセスログ
            type: 'console'
        },
        {
            category: 'system', // その他のアプリログ(DEBUG、INFO、ERRORなど)
            type: 'console'
        },
        {
            type: 'console'
        }
    ],
    levels: {
        access: (env === 'dev') ? log4js.levels.ALL.toString() : log4js.levels.OFF.toString(),
        system: (env === 'prod') ? log4js.levels.INFO.toString() : log4js.levels.ALL.toString()
    },
    replaceConsole: (env === 'prod') ? false : true
});

export default log4js.connectLogger(log4js.getLogger('access'), {});
