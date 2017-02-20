/**
 * メルマガ会員タスクコントローラー
 *
 * @namespace task/MemberController
 */

import { Models } from '@motionpicture/ttts-domain';
import * as Util from '../../../common/Util/Util';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

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
export function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/members.json`, 'utf8', (err, data) => {
        if (err) throw err;
        let members: any[] = JSON.parse(data);

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
        Models.Member.remove({}, (removeErr) => {
            if (removeErr) throw removeErr;

            logger.debug('creating members...');
            Models.Member.create(
                members,
                (createErr) => {
                    logger.info('members created.', createErr);
                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        });
    });
}

/**
 *
 *
 * @memberOf task/MemberController
 */
export function createReservationsFromJson() {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
        if (err) throw err;
        const reservations: any[] = JSON.parse(data);

        logger.debug('creating reservations...');
        const promises = reservations.map((reservationFromJson) => {
            return new Promise((resolve, reject) => {
                logger.info('removing reservation...');
                // すでに予約があれば削除してから新規作成
                Models.Reservation.remove(
                    {
                        performance: reservationFromJson.performance,
                        seat_code: reservationFromJson.seat_code
                    },
                    (removeErr) => {
                        logger.info('reservation removed.', removeErr);
                        if (removeErr) return reject(removeErr);

                        logger.info('creating reservationFromJson...', reservationFromJson);
                        Models.Reservation.create(reservationFromJson, (createErr) => {
                            logger.info('reservationFromJson created.', createErr);
                            (createErr) ? reject(createErr) : resolve();
                        });
                    }
                );
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
