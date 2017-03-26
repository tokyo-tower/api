/**
 * 外部関係者タスクコントローラー
 *
 * @namespace task/SponsorController
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../../common/Util/Util");
const crypto = require("crypto");
const fs = require("fs-extra");
const log4js = require("log4js");
const mongoose = require("mongoose");
const MONGOLAB_URI = process.env.MONGOLAB_URI;
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
 * @memberOf task/SponsorController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/sponsors.json`, 'utf8', (err, data) => __awaiter(this, void 0, void 0, function* () {
        if (err instanceof Error)
            throw err;
        const sponsors = JSON.parse(data);
        // あれば更新、なければ追加
        const promises = sponsors.map((sponsor) => __awaiter(this, void 0, void 0, function* () {
            // パスワードハッシュ化
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            sponsor.password_salt = passwordSalt;
            sponsor.password_hash = Util.createHash(sponsor.password, passwordSalt);
            logger.debug('updating sponsor...');
            yield chevre_domain_1.Models.Sponsor.findOneAndUpdate({
                user_id: sponsor.user_id
            }, sponsor, {
                new: true,
                upsert: true
            }).exec();
            logger.debug('sponsor updated');
        }));
        yield Promise.all(promises);
        logger.info('promised.');
        mongoose.disconnect();
        process.exit(0);
    }));
}
exports.createFromJson = createFromJson;
/**
 *
 * @memberOf task/SponsorController
 */
// tslint:disable-next-line:prefer-function-over-method
function createPasswords() {
    const file = `${__dirname}/../../../data/${process.env.NODE_ENV}/sponsorPasswords.txt`;
    const passwords = [];
    const l = 8;
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const cl = c.length;
    const NUMBER_OF_PASSWORD = 300;
    while (passwords.length < NUMBER_OF_PASSWORD) {
        let password = '';
        // 数字を含むパスワードが生成されるまで繰り返す
        while (password.length < l || password.match(/[0-9]+/g) === null) {
            if (password.length >= l) {
                password = '';
            }
            // tslint:disable-next-line:insecure-random
            password += c[Math.floor(Math.random() * cl)];
        }
        passwords.push(password);
    }
    fs.writeFileSync(file, passwords.join('\n'), 'utf8');
    process.exit(0);
}
exports.createPasswords = createPasswords;
