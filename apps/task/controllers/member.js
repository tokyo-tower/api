/**
 * メルマガ会員タスクコントローラー
 *
 * @namespace task/MemberController
 */
"use strict";
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
 *
 * @memberOf task/MemberController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/members.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        let members = JSON.parse(data);
        // パスワードハッシュ化
        members = members.map((member) => {
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            return {
                user_id: member.user_id,
                password_salt: passwordSalt,
                password_hash: Util.createHash(member.password, passwordSalt)
            };
        });
        logger.info('removing all members...');
        chevre_domain_1.Models.Member.remove({}, (removeErr) => {
            if (removeErr)
                throw removeErr;
            logger.debug('creating members...');
            chevre_domain_1.Models.Member.create(members, (createErr) => {
                logger.info('members created.', createErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.createFromJson = createFromJson;
/**
 *
 *
 * @memberOf task/MemberController
 */
function createReservationsFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        const reservations = JSON.parse(data);
        logger.debug('creating reservations...');
        const promises = reservations.map((reservationFromJson) => {
            return new Promise((resolve, reject) => {
                logger.info('removing reservation...');
                // すでに予約があれば削除してから新規作成
                chevre_domain_1.Models.Reservation.remove({
                    performance: reservationFromJson.performance,
                    seat_code: reservationFromJson.seat_code
                }, (removeErr) => {
                    logger.info('reservation removed.', removeErr);
                    if (removeErr)
                        return reject(removeErr);
                    logger.info('creating reservationFromJson...', reservationFromJson);
                    chevre_domain_1.Models.Reservation.create(reservationFromJson, (createErr) => {
                        logger.info('reservationFromJson created.', createErr);
                        (createErr) ? reject(createErr) : resolve();
                    });
                });
            });
        });
        Promise.all(promises).then(() => {
            logger.info('promised.');
            mongoose.disconnect();
            process.exit(0);
        }).catch((promiseErr) => {
            logger.info('promised.', promiseErr);
            mongoose.disconnect();
            process.exit(0);
        });
    });
}
exports.createReservationsFromJson = createReservationsFromJson;
