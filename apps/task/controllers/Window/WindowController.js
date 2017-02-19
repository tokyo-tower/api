"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util = require("../../../../common/Util/Util");
const BaseController_1 = require("../BaseController");
const conf = require("config");
const crypto = require("crypto");
const fs = require("fs-extra");
const mongoose = require("mongoose");
const MONGOLAB_URI = conf.get('mongolab_uri');
/**
 * 当日窓口アカウントタスクコントローラー
 *
 * @export
 * @class WindowController
 * @extends {BaseController}
 */
class WindowController extends BaseController_1.default {
    createFromJson() {
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
            this.logger.info('removing all windows...');
            ttts_domain_1.Models.Window.remove({}, (removeErr) => {
                if (removeErr)
                    throw removeErr;
                this.logger.debug('creating windows...');
                ttts_domain_1.Models.Window.create(windows, (createErr) => {
                    this.logger.info('windows created.', createErr);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WindowController;
