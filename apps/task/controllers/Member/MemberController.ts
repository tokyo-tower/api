import {Models} from '@motionpicture/ttts-domain';
import Util from '../../../common/Util/Util';
import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongoose from 'mongoose';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';

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
                const password_salt = crypto.randomBytes(64).toString('hex');
                return {
                    user_id: member.user_id,
                    password_salt: password_salt,
                    password_hash: Util.createHash(member.password, password_salt)
                };
            });
            this.logger.info('removing all members...');
            Models.Member.remove({}, (err) => {
                if (err) throw err;

                this.logger.debug('creating members...');
                Models.Member.create(
                    members,
                    (err) => {
                        this.logger.info('members created.', err);
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
                        (err) => {
                            this.logger.info('reservation removed.', err);
                            if (err) return reject(err);

                            this.logger.info('creating reservationFromJson...', reservationFromJson);
                            Models.Reservation.create(reservationFromJson, (err) => {
                                this.logger.info('reservationFromJson created.', err);
                                (err) ? reject(err) : resolve();
                            });
                        }
                    );
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
