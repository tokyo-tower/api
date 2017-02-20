/**
 * 当日窓口アカウントタスクコントローラー
 *
 * @namespace task/WindowController
 */
"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util = require("../../../common/Util/Util");
const conf = require("config");
const crypto = require("crypto");
const fs = require("fs-extra");
const log4js = require("log4js");
const mongoose = require("mongoose");
const MONGOLAB_URI = conf.get('mongolab_uri');
// todo ログ出力方法考える
log4js.configure({
    appenders: [
        {
            category: 'system',
            type: 'console'
        }
    ],
    levels: {
        system: 'ALL'
    },
    replaceConsole: true
});
const logger = log4js.getLogger('system');
/**
 *
 * @memberOf task/WindowController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/windows.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        let windows = JSON.parse(data);
        // パスワードハッシュ化
        windows = windows.map((window) => {
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            window.password_salt = passwordSalt;
            window.password_hash = Util.createHash(window.password, passwordSalt);
            return window;
        });
        logger.info('removing all windows...');
        ttts_domain_1.Models.Window.remove({}, (removeErr) => {
            if (removeErr)
                throw removeErr;
            logger.debug('creating windows...');
            ttts_domain_1.Models.Window.create(windows, (createErr) => {
                logger.info('windows created.', createErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.createFromJson = createFromJson;
