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
 * メルマガ会員タスクコントローラー
 *
 * @export
 * @class MemberController
 * @extends {BaseController}
 */
class MemberController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/members.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let members = JSON.parse(data);
            // パスワードハッシュ化
            members = members.map((member) => {
                const password_salt = crypto.randomBytes(64).toString('hex');
                return {
                    user_id: member.user_id,
                    password_salt: password_salt,
                    password_hash: Util_1.default.createHash(member.password, password_salt)
                };
            });
            this.logger.info('removing all members...');
            ttts_domain_1.Models.Member.remove({}, (err) => {
                if (err)
                    throw err;
                this.logger.debug('creating members...');
                ttts_domain_1.Models.Member.create(members, (err) => {
                    this.logger.info('members created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    createReservationsFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            const reservations = JSON.parse(data);
            this.logger.debug('creating reservations...');
            const promises = reservations.map((reservationFromJson) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('removing reservation...');
                    // すでに予約があれば削除してから新規作成
                    ttts_domain_1.Models.Reservation.remove({
                        performance: reservationFromJson.performance,
                        seat_code: reservationFromJson.seat_code
                    }, (err) => {
                        this.logger.info('reservation removed.', err);
                        if (err)
                            return reject(err);
                        this.logger.info('creating reservationFromJson...', reservationFromJson);
                        ttts_domain_1.Models.Reservation.create(reservationFromJson, (err) => {
                            this.logger.info('reservationFromJson created.', err);
                            (err) ? reject(err) : resolve();
                        });
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }).catch((err) => {
                this.logger.info('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberController;
