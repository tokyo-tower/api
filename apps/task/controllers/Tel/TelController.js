"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../common/Util/Util");
const BaseController_1 = require("../BaseController");
const conf = require("config");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const crypto = require("crypto");
const MONGOLAB_URI = conf.get('mongolab_uri');
/**
 * 電話窓口タスクコントローラー
 *
 * @export
 * @class TelController
 * @extends {BaseController}
 */
class TelController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let telStaffs = JSON.parse(data);
            // パスワードハッシュ化
            telStaffs = telStaffs.map((telStaff) => {
                const password_salt = crypto.randomBytes(64).toString('hex');
                telStaff.password_salt = password_salt;
                telStaff.password_hash = Util_1.default.createHash(telStaff.password, password_salt);
                return telStaff;
            });
            this.logger.info('removing all telStaffs...');
            ttts_domain_1.Models.TelStaff.remove({}, (err) => {
                if (err) {
                    this.logger.info('telStaffs removed.', err);
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                this.logger.debug('creating telStaffs...');
                ttts_domain_1.Models.TelStaff.create(telStaffs, (err) => {
                    this.logger.info('telStaffs created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelController;
