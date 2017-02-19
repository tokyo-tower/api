import { Models } from '@motionpicture/ttts-domain';
import * as Util from '../../../../common/Util/Util';
import BaseController from '../BaseController';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * メルマガ会員タスクコントローラー
 *
 * @export
 * @class MemberController
 * @extends {BaseController}
 */
export default class MemberController extends BaseController {
    public createFromJson() {
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
            this.logger.info('removing all members...');
            Models.Member.remove({}, (removeErr) => {
                if (removeErr) throw removeErr;

                this.logger.debug('creating members...');
                Models.Member.create(
                    members,
                    (createErr) => {
                        this.logger.info('members created.', createErr);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createReservationsFromJson() {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
            if (err) throw err;
            const reservations: any[] = JSON.parse(data);

            this.logger.debug('creating reservations...');
            const promises = reservations.map((reservationFromJson) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('removing reservation...');
                    // すでに予約があれば削除してから新規作成
                    Models.Reservation.remove(
                        {
                            performance: reservationFromJson.performance,
                            seat_code: reservationFromJson.seat_code
                        },
                        (removeErr) => {
                            this.logger.info('reservation removed.', removeErr);
                            if (removeErr) return reject(removeErr);

                            this.logger.info('creating reservationFromJson...', reservationFromJson);
                            Models.Reservation.create(reservationFromJson, (createErr) => {
                                this.logger.info('reservationFromJson created.', createErr);
                                (createErr) ? reject(createErr) : resolve();
                            });
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }).catch((promiseErr) => {
                this.logger.info('promised.', promiseErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
}
