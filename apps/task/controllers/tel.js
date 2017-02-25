/**
 * 電話窓口タスクコントローラー
 *
 * @namespace task/TelController
 */
"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
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
 * @memberOf task/TelController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        let telStaffs = JSON.parse(data);
        // パスワードハッシュ化
        telStaffs = telStaffs.map((telStaff) => {
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            telStaff.password_salt = passwordSalt;
            telStaff.password_hash = Util.createHash(telStaff.password, passwordSalt);
            return telStaff;
        });
        logger.info('removing all telStaffs...');
        chevre_domain_1.Models.TelStaff.remove({}, (removeErr) => {
            if (removeErr) {
                logger.info('telStaffs removed.', err);
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            logger.debug('creating telStaffs...');
            chevre_domain_1.Models.TelStaff.create(telStaffs, (createErr) => {
                logger.info('telStaffs created.', createErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.createFromJson = createFromJson;
