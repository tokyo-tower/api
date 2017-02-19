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
                const SIZE = 64;
                const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
                telStaff.password_salt = passwordSalt;
                telStaff.password_hash = Util.createHash(telStaff.password, passwordSalt);
                return telStaff;
            });
            this.logger.info('removing all telStaffs...');
            ttts_domain_1.Models.TelStaff.remove({}, (removeErr) => {
                if (removeErr) {
                    this.logger.info('telStaffs removed.', err);
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                this.logger.debug('creating telStaffs...');
                ttts_domain_1.Models.TelStaff.create(telStaffs, (createErr) => {
                    this.logger.info('telStaffs created.', createErr);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelController;
